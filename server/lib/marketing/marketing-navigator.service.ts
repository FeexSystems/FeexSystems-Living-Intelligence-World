/**
 * Marketing Navigator (Phase 6)
 *
 * Grounded marketing Q&A: retrieves claims/content/campaigns from the World-Model-backed
 * marketing graph, gathers intelligence-engine signals, and asks the provider-neutral
 * aiGateway to INTERPRET the retrieved records (never invent them). Every answer carries
 * evidence anchors and graph paths. Falls back to a deterministic template when no
 * provider keys are configured.
 *
 * Contract: docs/FEEXSYSTEMS-ADVANCED-MARKETING-INTELLIGENCE-SYSTEM.md (Phase 6)
 */
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../database";
import { MarketingHybridRetrievalService } from "./marketing-hybrid-retrieval.service";
import { detectContentGaps, GapResult } from "./gap-engine.service";
import { detectContentDecay, DecayResult } from "./decay-engine.service";
import { detectOpportunities, OpportunityResult } from "./opportunity-engine.service";
import { aiGateway } from "../services/ai-gateway.service";
import type {
  MarketingNavigatorAnswer,
  MarketingNavigatorQuery,
  NavigatorRecommendation,
} from "../../../shared/marketing-contracts";

const ANSWER_VERSION = "1.0" as const;
const MAX_RECOMMENDATIONS = 10;

const NAVIGATOR_SYSTEM = `You are the FEEXSYSTEMS Marketing Navigator, a grounded reasoning layer over the canonical marketing graph.

STRICT RULES:
1. You may ONLY interpret, summarize and connect the records provided in the grounded context.
2. NEVER invent claims, campaigns, assets, products, evidence or numbers that are not in the context.
3. Reference claims/assets/campaigns by name when interpreting them.
4. If the context is empty, say that no grounded records were found for the query.
5. Keep the answer under 220 words, plain prose (no markdown headers).

Return ONLY valid JSON: {"answer":"<grounded prose>"}`;

export interface MarketingContext {
  claims: Array<{
    id: string;
    statement: string;
    productId: string | null;
    _semanticScore?: number;
    product?: { id: string; name: string } | null;
    evidence?: Array<{
      id: string;
      worldModelEvidence?: { id: string; sourceUrl: string; sourceRef?: string | null; observedAt: Date } | null;
      marketingEvidence?: { id: string; sourceUrl: string; sourceRef?: string | null; observedAt: Date } | null;
    } | null>;
    aboutLinks?: Array<{
      id: string;
      feature?: { id: string; name: string } | null;
    } | null>;
  }>;
  contentAssets: Array<{
    id: string;
    title: string;
    type: string;
    state: string;
    _semanticScore?: number;
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    description?: string | null;
    _semanticScore?: number;
    products?: Array<{
      id: string;
      product?: { id: string; name: string } | null;
    } | null>;
  }>;
}

export interface NavigatorOptions {
  limit?: number;
  productId?: string;
}

export class MarketingNavigatorService {
  private retrieval: MarketingHybridRetrievalService;

  constructor(private prismaClient: PrismaClient = prisma) {
    this.retrieval = new MarketingHybridRetrievalService(prismaClient);
  }

  /**
   * Shared context builder: parallel retrieval of claims, content assets and campaigns,
   * hydrated with full provenance. Used by answer(), recommendations() and Omni-Command.
   */
  async buildContext(query: string, opts: NavigatorOptions = {}): Promise<MarketingContext> {
    const limit = Math.min(Math.max(opts.limit ?? 5, 1), 20);

    const [claims, contentAssets, campaigns] = await Promise.all([
      this.retrieval.searchClaims(query, limit),
      this.retrieval.searchContent(query, limit),
      this.retrieval.searchCampaigns(query, limit),
    ]);

    let scopedClaims = claims as MarketingContext["claims"];
    if (opts.productId) {
      scopedClaims = scopedClaims.filter((c) => c.productId === opts.productId);
    }

    return {
      claims: scopedClaims,
      contentAssets: contentAssets as MarketingContext["contentAssets"],
      campaigns: campaigns as MarketingContext["campaigns"],
    };
  }

  /**
   * Explainable recommendations derived from grounded engine signals + hydrated relations.
   * The LLM never produces these — they come from deterministic mappings over real rows.
   */
  async recommendations(
    query: string,
    opts: NavigatorOptions = {}
  ): Promise<NavigatorRecommendation[]> {
    const context = await this.buildContext(query, opts);
    return this.recommendationsFromContext(context);
  }

  /**
   * Full grounded answer: retrieval + engine-scoped recommendations + LLM interpretation
   * (with deterministic template fallback when no provider is available).
   */
  async answer(query: string, opts: MarketingNavigatorQuery = { q: query }): Promise<MarketingNavigatorAnswer> {
    const context = await this.buildContext(query, opts);
    const recommendations = await this.recommendationsFromContext(context);

    const groundedSummary = this.buildGroundedSummary(context, recommendations);

    let answerText: string | null = null;
    let provider: string | undefined;

    try {
      const out = await aiGateway.generateObject<{ answer?: string }>(
        NAVIGATOR_SYSTEM,
        `Query: ${query}\n\nGrounded marketing context:\n${groundedSummary}`
      );
      if (out?.object && typeof out.object.answer === "string" && out.object.answer.trim()) {
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
      answer: answerText!,
      grounded,
      provider,
      claims: context.claims.map((c) => ({
        id: c.id,
        statement: c.statement,
        confidence:
          typeof c._semanticScore === "number"
            ? Number(c._semanticScore.toFixed(3))
            : undefined,
        productId: c.productId ?? null,
        evidenceCount: c.evidence?.length ?? 0,
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
        description: c.description ?? null,
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
  private async recommendationsFromContext(
    context: MarketingContext
  ): Promise<NavigatorRecommendation[]> {
    const [gaps, decay, opportunities] = await Promise.all([
      detectContentGaps().catch(() => [] as GapResult[]),
      detectContentDecay().catch(() => [] as DecayResult[]),
      detectOpportunities().catch(() => [] as OpportunityResult[]),
    ]);

    const productIds = new Set<string>(
      context.claims
        .map((c) => c.productId)
        .filter((id): id is string => Boolean(id))
        .concat(
          context.campaigns.flatMap((c) =>
            (c.products ?? [])
              .filter((p): p is NonNullable<typeof p> => Boolean(p))
              .map((p) => p.product?.id)
              .filter((id): id is string => Boolean(id))
          )
        )
    );
    const assetIds = new Set<string>(context.contentAssets.map((a) => a.id));

    const relevantGaps = productIds.size
      ? gaps.filter((g) => productIds.has(g.productId))
      : gaps;
    const relevantDecay = assetIds.size
      ? decay.filter((d) => assetIds.has(d.assetId))
      : decay;

    const recs: NavigatorRecommendation[] = [];

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
      if ((claim.evidence?.length ?? 0) === 0) {
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
    const anchorsByProduct = new Map<string, NavigatorRecommendation["evidence"]>();
    for (const claim of context.claims) {
      if (!claim.productId) continue;
      const bucket = anchorsByProduct.get(claim.productId) ?? [];
      for (const link of claim.evidence ?? []) {
        if (!link) continue;
        const anchor = link.worldModelEvidence ?? link.marketingEvidence;
        if (!anchor) continue;
        bucket.push({
          id: anchor.id,
          sourceUrl: anchor.sourceUrl,
          sourceRef: anchor.sourceRef ?? undefined,
          observedAt: anchor.observedAt?.toISOString?.(),
        });
      }
      anchorsByProduct.set(claim.productId, bucket);
    }
    for (const rec of recs) {
      if (rec.kind !== "CONTENT_GAP" || rec.evidence.length) continue;
      const productId = rec.graphPath.find((n) => n.type === "PRODUCT")?.id;
      rec.evidence = (anchorsByProduct.get(productId ?? "") ?? []).slice(0, 3);
    }

    return recs
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, MAX_RECOMMENDATIONS);
  }

  private buildGroundedSummary(
    context: MarketingContext,
    recommendations: NavigatorRecommendation[]
  ): string {
    const lines: string[] = [];
    lines.push(
      `Claims (${context.claims.length}): ${
        context.claims
          .map((c) => `“${c.statement}”${c.evidence?.length ? ` [${c.evidence.length} evidence]` : " [no evidence]"}`)
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
          .map((c) => `“${c.name}”${c.products?.length ? ` [${c.products.length} products]` : ""}`)
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

  private buildTemplateAnswer(
    query: string,
    context: MarketingContext,
    recommendations: NavigatorRecommendation[]
  ): string {
    const parts: string[] = [];
    parts.push(
      `Grounded answer for “${query}” from the marketing graph (template mode — no LLM provider configured):`
    );
    if (context.claims.length) {
      parts.push(
        `Claims: ${context.claims.map((c) => `“${c.statement}”${c.evidence?.length ? ` (${c.evidence.length} evidence link(s))` : " (no evidence linked)"}`).join("; ")}.`
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

  private buildSuggestions(
    context: MarketingContext,
    recommendations: NavigatorRecommendation[]
  ): string[] {
    const suggestions: string[] = recommendations
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
  async exploreMarketingGraph(query: string) {
    return this.buildContext(query);
  }
}

export const marketingNavigator = new MarketingNavigatorService();