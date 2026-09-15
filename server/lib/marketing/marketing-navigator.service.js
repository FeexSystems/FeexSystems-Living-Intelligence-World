 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }











import { prisma } from "../database";
import { MarketingHybridRetrievalService } from "./marketing-hybrid-retrieval.service";
import { detectContentGaps, } from "./gap-engine.service";
import { detectContentDecay, } from "./decay-engine.service";
import { detectOpportunities, } from "./opportunity-engine.service";
import { aiGateway } from "../services/ai-gateway.service";






const ANSWER_VERSION = "1.0" ;
const MAX_RECOMMENDATIONS = 10;

const NAVIGATOR_SYSTEM = `You are the FEEXSYSTEMS Marketing Navigator, a grounded reasoning layer over the canonical marketing graph.

STRICT RULES:
1. You may ONLY interpret, summarize and connect the records provided in the grounded context.
2. NEVER invent claims, campaigns, assets, products, evidence or numbers that are not in the context.
3. Reference claims/assets/campaigns by name when interpreting them.
4. If the context is empty, say that no grounded records were found for the query.
5. Keep the answer under 220 words, plain prose (no markdown headers).

Return ONLY valid JSON: {"answer":"<grounded prose>"}`;










































export class MarketingNavigatorService {
  

  constructor( prismaClient = prisma) {;this.prismaClient = prismaClient;
    this.retrieval = new MarketingHybridRetrievalService(prismaClient);
  }

  /**
   * Shared context builder: parallel retrieval of claims, content assets and campaigns,
   * hydrated with full provenance. Used by answer(), recommendations() and Omni-Command.
   */
  async buildContext(query, opts = {}) {
    const limit = Math.min(Math.max(_nullishCoalesce(opts.limit, () => ( 5)), 1), 20);

    const [claims, contentAssets, campaigns] = await Promise.all([
      this.retrieval.searchClaims(query, limit),
      this.retrieval.searchContent(query, limit),
      this.retrieval.searchCampaigns(query, limit),
    ]);

    let scopedClaims = claims ;
    if (opts.productId) {
      scopedClaims = scopedClaims.filter((c) => c.productId === opts.productId);
    }

    return {
      claims: scopedClaims,
      contentAssets: contentAssets ,
      campaigns: campaigns ,
    };
  }

  /**
   * Explainable recommendations derived from grounded engine signals + hydrated relations.
   * The LLM never produces these — they come from deterministic mappings over real rows.
   */
  async recommendations(
    query,
    opts = {}
  ) {
    const context = await this.buildContext(query, opts);
    return this.recommendationsFromContext(context);
  }

  /**
   * Full grounded answer: retrieval + engine-scoped recommendations + LLM interpretation
   * (with deterministic template fallback when no provider is available).
   */
  async answer(query, opts = { q: query }) {
    const context = await this.buildContext(query, opts);
    const recommendations = await this.recommendationsFromContext(context);

    const groundedSummary = this.buildGroundedSummary(context, recommendations);

    let answerText = null;
    let provider;

    try {
      const out = await aiGateway.generateObject(
        NAVIGATOR_SYSTEM,
        `Query: ${query}\n\nGrounded marketing context:\n${groundedSummary}`
      );
      if (_optionalChain([out, 'optionalAccess', _ => _.object]) && typeof out.object.answer === "string" && out.object.answer.trim()) {
        answerText = out.object.answer.trim();
        provider = out.provider;
      }
    } catch (err) {
      console.warn("[marketing-navigator] aiGateway error, using template fallback", err);
    }

    const grounded = Boolean(answerText);
    if (!grounded) {
      answerText = this.buildTemplateAnswer(query, context, recommendations);
      provider = "template";
    }

    return {
      version: ANSWER_VERSION,
      query,
      answer: answerText,
      grounded,
      provider,
      claims: context.claims.map((c) => ({
        id: c.id,
        statement: c.statement,
        confidence:
          typeof c._semanticScore === "number"
            ? Number(c._semanticScore.toFixed(3))
            : undefined,
        productId: _nullishCoalesce(c.productId, () => ( null)),
        evidenceCount: _nullishCoalesce(_optionalChain([c, 'access', _2 => _2.evidence, 'optionalAccess', _3 => _3.length]), () => ( 0)),
      })),
      contentAssets: context.contentAssets.map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        state: a.state,
      })),
      campaigns: context.campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        description: _nullishCoalesce(c.description, () => ( null)),
      })),
      recommendations,
      suggestions: this.buildSuggestions(context, recommendations),
    };
  }

  /**
   * Map engine outputs + hydrated relations into NavigatorRecommendation[].
   * Signals are scoped to the retrieved products/assets when retrieval is non-empty,
   * so recommendations stay relevant to the query.
   */
   async recommendationsFromContext(
    context
  ) {
    const [gaps, decay, opportunities] = await Promise.all([
      detectContentGaps().catch(() => [] ),
      detectContentDecay().catch(() => [] ),
      detectOpportunities().catch(() => [] ),
    ]);

    const productIds = new Set(
      context.claims
        .map((c) => c.productId)
        .filter((id) => Boolean(id))
        .concat(
          context.campaigns.flatMap((c) =>
            (_nullishCoalesce(c.products, () => ( [])))
              .filter((p) => Boolean(p))
              .map((p) => _optionalChain([p, 'access', _4 => _4.product, 'optionalAccess', _5 => _5.id]))
              .filter((id) => Boolean(id))
          )
        )
    );
    const assetIds = new Set(context.contentAssets.map((a) => a.id));

    const relevantGaps = productIds.size
      ? gaps.filter((g) => productIds.has(g.productId))
      : gaps;
    const relevantDecay = assetIds.size
      ? decay.filter((d) => assetIds.has(d.assetId))
      : decay;

    const recs = [];

    for (const gap of relevantGaps.slice(0, 3)) {
      recs.push({
        id: `content-gap:${gap.productId}`,
        kind: "CONTENT_GAP",
        title: `Close the content gap on ${gap.productName}`,
        rationale: `${gap.productName} has ${gap.featuresCount} feature(s) but no marketing assets — gap score ${gap.gapScore}.`,
        confidence: gap.gapScore,
        graphPath: [
          { id: gap.productId, type: "PRODUCT", label: gap.productName },
        ],
        evidence: [],
      });
    }

    for (const d of relevantDecay.slice(0, 3)) {
      recs.push({
        id: `content-decay:${d.assetId}`,
        kind: "CONTENT_DECAY",
        title: `Refresh decaying asset “${d.title}”`,
        rationale: `No telemetry events for ${d.daysSinceLastEvent} day(s) — decay score ${d.decayScore}.`,
        confidence: d.decayScore,
        graphPath: [
          { id: d.assetId, type: "CONTENT_ASSET", label: d.title },
        ],
        evidence: [],
      });
    }

    for (const o of opportunities.slice(0, 2)) {
      recs.push({
        id: `opportunity:${o.projectId}:${o.eventName}`,
        kind: "OPPORTUNITY",
        title: `Act on recent ${o.eventName} signal`,
        rationale: o.reason,
        confidence: o.priorityScore,
        graphPath: [
          { id: o.projectId, type: "PROJECT", label: o.projectId },
        ],
        evidence: [],
      });
    }

    // Claims retrieved without any evidence → refresh the proof (Evidence, Not Claims).
    for (const claim of context.claims) {
      if ((_nullishCoalesce(_optionalChain([claim, 'access', _6 => _6.evidence, 'optionalAccess', _7 => _7.length]), () => ( 0))) === 0) {
        recs.push({
          id: `evidence-refresh:${claim.id}`,
          kind: "EVIDENCE_REFRESH",
          title: `Back the claim “${claim.statement.slice(0, 120)}” with evidence`,
          rationale:
            "This claim has zero linked evidence records — every material claim needs traceable implementation proof.",
          confidence: 0.8,
          graphPath: [
            ...(claim.product
              ? [{ id: claim.product.id, type: "PRODUCT", label: claim.product.name }]
              : []),
            { id: claim.id, type: "CLAIM", label: claim.statement.slice(0, 200) },
          ],
          evidence: [],
        });
      }
    }

    // Evidence anchors: hydrate recommendations with provenance from sibling claims of
    // the same product (Evidence, Not Claims invariant). EVIDENCE_REFRESH recs
    // intentionally carry none — the missing proof is the whole point.
    const anchorsByProduct = new Map();
    for (const claim of context.claims) {
      if (!claim.productId) continue;
      const bucket = _nullishCoalesce(anchorsByProduct.get(claim.productId), () => ( []));
      for (const link of _nullishCoalesce(claim.evidence, () => ( []))) {
        if (!link) continue;
        const anchor = _nullishCoalesce(link.worldModelEvidence, () => ( link.marketingEvidence));
        if (!anchor) continue;
        bucket.push({
          id: anchor.id,
          sourceUrl: anchor.sourceUrl,
          sourceRef: _nullishCoalesce(anchor.sourceRef, () => ( undefined)),
          observedAt: _optionalChain([anchor, 'access', _8 => _8.observedAt, 'optionalAccess', _9 => _9.toISOString, 'optionalCall', _10 => _10()]),
        });
      }
      anchorsByProduct.set(claim.productId, bucket);
    }
    for (const rec of recs) {
      if (rec.kind !== "CONTENT_GAP" || rec.evidence.length) continue;
      const productId = _optionalChain([rec, 'access', _11 => _11.graphPath, 'access', _12 => _12.find, 'call', _13 => _13((n) => n.type === "PRODUCT"), 'optionalAccess', _14 => _14.id]);
      rec.evidence = (_nullishCoalesce(anchorsByProduct.get(_nullishCoalesce(productId, () => ( ""))), () => ( []))).slice(0, 3);
    }

    return recs
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, MAX_RECOMMENDATIONS);
  }

   buildGroundedSummary(
    context,
    recommendations
  ) {
    const lines = [];
    lines.push(
      `Claims (${context.claims.length}): ${
        context.claims
          .map((c) => `“${c.statement}”${_optionalChain([c, 'access', _15 => _15.evidence, 'optionalAccess', _16 => _16.length]) ? ` [${c.evidence.length} evidence]` : " [no evidence]"}`)
          .join("; ") || "none"
      }`
    );
    lines.push(
      `Content assets (${context.contentAssets.length}): ${
        context.contentAssets.map((a) => `“${a.title}” (${a.type}/${a.state})`).join("; ") || "none"
      }`
    );
    lines.push(
      `Campaigns (${context.campaigns.length}): ${
        context.campaigns
          .map((c) => `“${c.name}”${_optionalChain([c, 'access', _17 => _17.products, 'optionalAccess', _18 => _18.length]) ? ` [${c.products.length} products]` : ""}`)
          .join("; ") || "none"
      }`
    );
    lines.push(
      `Top recommendations: ${
        recommendations.slice(0, 3).map((r) => `[${r.kind}] ${r.title}`).join("; ") || "none"
      }`
    );
    return lines.join("\n");
  }

   buildTemplateAnswer(
    query,
    context,
    recommendations
  ) {
    const parts = [];
    parts.push(
      `Grounded answer for “${query}” from the marketing graph (template mode — no LLM provider configured):`
    );
    if (context.claims.length) {
      parts.push(
        `Claims: ${context.claims.map((c) => `“${c.statement}”${_optionalChain([c, 'access', _19 => _19.evidence, 'optionalAccess', _20 => _20.length]) ? ` (${c.evidence.length} evidence link(s))` : " (no evidence linked)"}`).join("; ")}.`
      );
    } else {
      parts.push("No verified claims matched this query in the graph.");
    }
    if (context.contentAssets.length) {
      parts.push(
        `Content assets: ${context.contentAssets.map((a) => `“${a.title}” (${a.type}, ${a.state})`).join("; ")}.`
      );
    }
    if (context.campaigns.length) {
      parts.push(
        `Campaigns: ${context.campaigns.map((c) => `“${c.name}”`).join("; ")}.`
      );
    }
    if (recommendations.length) {
      parts.push(
        `Recommended next steps: ${recommendations.slice(0, 3).map((r) => `${r.title}`).join("; ")}.`
      );
    }
    if (!context.claims.length && !context.contentAssets.length && !context.campaigns.length) {
      parts.push(
        "No grounded marketing records were retrieved. Sync embeddings for claims, assets and campaigns to enable semantic retrieval."
      );
    }
    return parts.join(" ");
  }

   buildSuggestions(
    context,
    recommendations
  ) {
    const suggestions = recommendations
      .slice(0, 3)
      .map((r) => r.title);
    if (context.campaigns[0]) {
      suggestions.push(`Which products does the ${context.campaigns[0].name} campaign target?`);
    }
    if (context.claims[0]) {
      suggestions.push(`Show evidence for the claim “${context.claims[0].statement.slice(0, 80)}”`);
    }
    if (context.contentAssets[0]) {
      suggestions.push(`How is “${context.contentAssets[0].title}” performing?`);
    }
    return suggestions
      .map((s) => s.slice(0, 200))
      .slice(0, 6);
  }

  /**
   * @deprecated Use {@link buildContext} instead. Kept as a thin wrapper so existing
   * Omni-Command imports never break mid-refactor.
   */
  async exploreMarketingGraph(query) {
    return this.buildContext(query);
  }
}

export const marketingNavigator = new MarketingNavigatorService();