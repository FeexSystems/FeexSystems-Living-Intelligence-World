 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Omni-Command Service
 *
 * Grounds queries in the World Model (hybrid ranking), asks an LLM (with few-shot examples) to
 * choose a UI directive, validates the full Orchestration Contract with Zod,
 * and carries multi-turn context (focused nodes, previous intent).
 */

import { randomUUID } from "crypto";










import { createEmptyStageResponse } from "../../../shared/orchestration";
import { validateOmniResponse } from "../../../shared/orchestration-schema";
import { getWorldModelGraph } from "./github-pinned.service";
import { retrieveWorldHybrid } from "./hybrid-retrieval.service";
import { generateGroundedAnswer } from "./llm-grounded.service";
import { aiGateway } from "./ai-gateway.service";
import { marketingNavigator } from "../marketing/marketing-navigator.service";

function nowIso() {
  return new Date().toISOString();
}

function step(
  type,
  message,
  durationMs
) {
  return { id: randomUUID(), type, message, timestamp: nowIso(), durationMs };
}

 

function classifyIntent(query, context) {
  const q = query.toLowerCase();
  const focusFollowUp =
    /zoom|focus|that node|this node|that project|expand|drill/.test(q) &&
    (_nullishCoalesce(_optionalChain([context, 'optionalAccess', _ => _.focusedNodeIds, 'optionalAccess', _2 => _2.length]), () => ( 0))) > 0;

  const preferGraph =
    focusFollowUp ||
    /architecture|graph|topology|relationship|connected|depends|uses|visualize|map|network/.test(q);
  const preferMarkdown = /explain|how does|what is|documentation|describe|overview/.test(q);
  const preferEvidence = /evidence|prove|sha|commit|artifact|source|where is/.test(q);
  const preferMetrics = /health|latency|uptime|status|metrics|live|dashboard/.test(q);

  let intent = _optionalChain([context, 'optionalAccess', _3 => _3.previousIntent]) || "EXPLORE_WORLD_MODEL";
  
  const isMarketing = /marketing|campaign|content gap|claim|messaging|brand|audience|digital twin|spatial/.test(q);
  
  if (isMarketing) intent = "EXPLORE_MARKETING_GRAPH";
  else if (preferMetrics) intent = "SHOW_METRICS";
  else if (preferGraph) intent = "VISUALIZE_ARCHITECTURE";
  else if (preferEvidence) intent = "SHOW_EVIDENCE";
  else if (preferMarkdown) intent = "EXPLAIN_CAPABILITY";
  else if (focusFollowUp) intent = "FOCUS_NODE";

  return { intent, preferGraph, preferMarkdown, preferEvidence, preferMetrics, focusFollowUp, isMarketing };
}

const DIRECTOR_SYSTEM = `You are the FEEXSYSTEMS Omni-Command director.
Your job: choose the best Stage component for a grounded World Model query.

Return ONLY valid JSON:
{"component":"GraphVisualizer"|"MarkdownViewer"|"MetricsDashboard"|"EvidencePanel"|"CommandCenterShell","layoutHint":"full"|"split","confidence":0.0-1.0,"rationale":"one short sentence"}

Rules (strict):
1. GraphVisualizer — architecture, topology, relationships, "show connected", multi-entity maps.
2. MarkdownViewer — explanations, narratives, "what is", documentation digests.
3. MetricsDashboard — health, latency, uptime, live status, dashboards.
4. EvidencePanel — proof, SHA, artifacts, "where is it implemented", provenance.
5. CommandCenterShell — marketing operations, campaigns, content gap, audience, digital twin.
6. Never invent component names outside the enum.
7. Prefer EvidencePanel over MarkdownViewer when the user asks for proof/SHA.
8. If the user says "zoom/focus/that node" and context has focusedNodeIds → GraphVisualizer.
9. confidence reflects how clear the mapping is (0.55–0.95).

Few-shot examples:
User: "Show me the backend architecture"
→ {"component":"GraphVisualizer","layoutHint":"full","confidence":0.92,"rationale":"Architecture maps to graph topology"}

User: "Which projects use PostgreSQL?"
→ {"component":"GraphVisualizer","layoutHint":"full","confidence":0.88,"rationale":"Project–technology relationships"}

User: "Explain the data pipeline"
→ {"component":"MarkdownViewer","layoutHint":"full","confidence":0.9,"rationale":"Narrative explanation"}

User: "Show marketing campaigns"
→ {"component":"CommandCenterShell","layoutHint":"full","confidence":0.95,"rationale":"Marketing command center requested"}

User: "Show evidence for Persona OS"
→ {"component":"EvidencePanel","layoutHint":"full","confidence":0.93,"rationale":"Provenance and SHA-backed artifacts"}

User: "Run a health check"
→ {"component":"MetricsDashboard","layoutHint":"full","confidence":0.95,"rationale":"Live platform metrics"}

User: "Zoom into that node" (context.focusedNodeIds present)
→ {"component":"GraphVisualizer","layoutHint":"full","confidence":0.87,"rationale":"Focus follow-up on graph"}`;

async function llmChooseDirective(args





) {
  const user = [
    `Query: ${args.query}`,
    `Intent hint: ${args.intent}`,
    _optionalChain([args, 'access', _4 => _4.context, 'optionalAccess', _5 => _5.previousIntent]) ? `Previous intent: ${args.context.previousIntent}` : null,
    _optionalChain([args, 'access', _6 => _6.context, 'optionalAccess', _7 => _7.focusedNodeIds, 'optionalAccess', _8 => _8.length])
      ? `Focused nodes: ${args.context.focusedNodeIds.join(", ")}`
      : null,
    _optionalChain([args, 'access', _9 => _9.context, 'optionalAccess', _10 => _10.lastQuery]) ? `Previous query: ${args.context.lastQuery}` : null,
    `Grounded World Model summary:\n${args.groundedSummary}`,
    `Sample nodes: ${args.nodeSample || "(none)"}`,
  ]
    .filter(Boolean)
    .join("\n");

  const out = await aiGateway.generateObject(DIRECTOR_SYSTEM, user);
  if (_optionalChain([out, 'optionalAccess', _11 => _11.object, 'optionalAccess', _12 => _12.component])) {
    return out.object;
  }

  return null;
}

function contextualSuggestions(
  intent,
  focusedIds,
  anchors
) {
  const base = [
    "Show me the backend architecture",
    "Which projects use PostgreSQL?",
    "Run a health check on the platform",
    "Show evidence for the knowledge graph",
  ];
  const extra = [];
  if (_optionalChain([focusedIds, 'optionalAccess', _13 => _13.length])) {
    extra.push("Zoom into the focused node");
    extra.push("Show evidence for this node");
  }
  if (anchors.some((a) => a.type === "project")) {
    extra.push(`Explain ${anchors.find((a) => a.type === "project").label}`);
  }
  if (intent === "VISUALIZE_ARCHITECTURE") extra.push("List technologies in this graph");
  if (intent === "SHOW_METRICS") extra.push("Show architecture again");
  return [...extra, ...base].slice(0, 6);
}

export async function executeOmniCommand(
  req,
  onTrace
) {
  const requestId = randomUUID();
  const trace = [];
  const push = (s) => {
    trace.push(s);
    _optionalChain([onTrace, 'optionalCall', _14 => _14(s)]);
  };
  const started = Date.now();

  if (!_optionalChain([req, 'access', _15 => _15.query, 'optionalAccess', _16 => _16.trim, 'call', _17 => _17()])) {
    return createEmptyStageResponse(requestId);
  }

  const query = req.query.trim();
  push(step("parse", `Parsing intent from: "${query.slice(0, 80)}${query.length > 80 ? "…" : ""}"`));

  if (_optionalChain([req, 'access', _18 => _18.context, 'optionalAccess', _19 => _19.focusedNodeIds, 'optionalAccess', _20 => _20.length])) {
    push(step("parse", `Context focus: ${req.context.focusedNodeIds.join(", ")}`));
  }
  if (_optionalChain([req, 'access', _21 => _21.context, 'optionalAccess', _22 => _22.previousIntent])) {
    push(step("parse", `Previous intent: ${req.context.previousIntent}`));
  }

  const classified = classifyIntent(query, req.context);
  push(step("parse", `Classified intent → ${classified.intent}`));

  try {
    const retrievalQuery =
      classified.focusFollowUp && _optionalChain([req, 'access', _23 => _23.context, 'optionalAccess', _24 => _24.focusedNodeIds, 'optionalAccess', _25 => _25.length])
        ? `${query} ${req.context.focusedNodeIds.join(" ")}`
        : query;

    const t0 = Date.now();
    const navigatorResult = await retrieveWorldHybrid(retrievalQuery);
    push(
      step(
        "retrieve",
        `Hybrid ${_optionalChain([navigatorResult, 'access', _26 => _26.ranking, 'optionalAccess', _27 => _27.mode]) || "keyword-only"}: ${_nullishCoalesce(_optionalChain([navigatorResult, 'optionalAccess', _28 => _28.projects, 'optionalAccess', _29 => _29.length]), () => ( 0))} projects, ${_nullishCoalesce(_optionalChain([navigatorResult, 'optionalAccess', _30 => _30.technologies, 'optionalAccess', _31 => _31.length]), () => ( 0))} techs, ${_nullishCoalesce(_optionalChain([navigatorResult, 'access', _32 => _32.ranking, 'optionalAccess', _33 => _33.vectorHits]), () => ( 0))} vector hits`,
        Date.now() - t0
      )
    );

    let graph = null;
    if (classified.preferGraph || classified.focusFollowUp || !classified.preferMarkdown) {
      const t1 = Date.now();
      graph = await getWorldModelGraph();
      const nodeCount = Array.isArray(_optionalChain([graph, 'optionalAccess', _34 => _34.nodes])) ? graph.nodes.length : 0;
      const linkCount = Array.isArray(_optionalChain([graph, 'optionalAccess', _35 => _35.links])) ? graph.links.length : 0;
      push(step("retrieve", `Loaded World Model graph (${nodeCount} nodes, ${linkCount} links)`, Date.now() - t1));
    }

    let marketingContext = null;
    if (classified.isMarketing) {
      const t2 = Date.now();
      marketingContext = await marketingNavigator.buildContext(retrievalQuery);
      push(
        step(
          "retrieve",
          `Loaded Marketing context (${marketingContext.claims.length} claims, ${marketingContext.contentAssets.length} assets, ${marketingContext.campaigns.length} campaigns)`,
          Date.now() - t2
        )
      );
    }

    let marketingRecommendations = [];
    if (classified.isMarketing) {
      try {
        marketingRecommendations = await marketingNavigator.recommendations(retrievalQuery);
      } catch (recErr) {
        console.warn("[omni] Marketing recommendations failed:", recErr);
      }
    }

    const evidence_anchors = [];
    if (_optionalChain([navigatorResult, 'optionalAccess', _36 => _36.projects])) {
      for (const p of navigatorResult.projects.slice(0, 12)) {
        evidence_anchors.push({ type: "project", id: p.id, label: p.name, url: p.url });
      }
    }
    if (_optionalChain([navigatorResult, 'optionalAccess', _37 => _37.artifacts])) {
      for (const a of navigatorResult.artifacts.slice(0, 8)) {
        evidence_anchors.push({ type: "artifact", id: a.id, label: a.path, sha: a.sha });
      }
    }

    const groundedSummary = [
      _optionalChain([navigatorResult, 'optionalAccess', _38 => _38.explanation]) || "",
      `Projects: ${(_optionalChain([navigatorResult, 'optionalAccess', _39 => _39.projects]) || []).map((p) => p.name).join(", ") || "none"}`,
      `Technologies: ${(_optionalChain([navigatorResult, 'optionalAccess', _40 => _40.technologies]) || []).map((t) => t.name).join(", ") || "none"}`,
      classified.isMarketing ? `Marketing Claims: ${(_optionalChain([marketingContext, 'optionalAccess', _41 => _41.claims]) || []).map((c) => c.statement).join(" | ") || "none"}` : "",
      classified.isMarketing ? `Content Assets: ${(_optionalChain([marketingContext, 'optionalAccess', _42 => _42.contentAssets]) || []).map((a) => a.title).join(" | ") || "none"}` : "",
      classified.isMarketing ? `Campaigns: ${(_optionalChain([marketingContext, 'optionalAccess', _43 => _43.campaigns]) || []).map((c) => c.name).join(" | ") || "none"}` : "",
      classified.isMarketing && marketingRecommendations.length
        ? `Recommended Actions: ${marketingRecommendations.slice(0, 3).map((r) => r.title).join(" | ")}`
        : "",
    ].filter(Boolean).join("\n");

    const nodeSample = (_optionalChain([graph, 'optionalAccess', _44 => _44.nodes]) || [])
      .slice(0, 8)
      .map((n) => `${n.id}:${n.name || n.label}`)
      .join(", ");

    push(step("decide", "Asking model to choose UI directive (few-shot Orchestration Contract)…"));
    const llmChoice = await llmChooseDirective({
      query,
      intent: classified.intent,
      groundedSummary,
      nodeSample,
      context: req.context,
    });

    let component =
      (_optionalChain([llmChoice, 'optionalAccess', _45 => _45.component]) ) ||
      (classified.isMarketing
        ? "CommandCenterShell"
        : classified.preferMetrics
          ? "MetricsDashboard"
          : classified.preferEvidence
            ? "EvidencePanel"
            : classified.preferGraph || classified.focusFollowUp
              ? "GraphVisualizer"
              : "MarkdownViewer");

    if (llmChoice) {
      push(step("decide", `LLM selected ${component} (confidence ${_nullishCoalesce(llmChoice.confidence, () => ( "?"))})`));
    } else {
      push(step("decide", `Heuristic selected ${component} (no LLM keys or provider error)`));
    }

    let response;

    if (component === "CommandCenterShell") {
      const q = query.toLowerCase();
      let shellType = "WORLD";
      if (/twin|spatial/.test(q)) shellType = "DIGITAL_TWIN";
      else if (/campaign/.test(q)) shellType = "CAMPAIGNS";
      else if (/content/.test(q)) shellType = "CONTENT";
      else if (/audience/.test(q)) shellType = "AUDIENCE";
      else if (/signal/.test(q)) shellType = "SIGNALS";
      else if (/navigator/.test(q)) shellType = "NAVIGATOR";
      else if (/analytics|metric/.test(q)) shellType = "ANALYTICS";
      else if (/evidence/.test(q)) shellType = "EVIDENCE";

      const metadata = {};
      
      // Attempt to enrich with graph data if relevant
      if (marketingContext && (shellType === "WORLD" || shellType === "CAMPAIGNS" || shellType === "CONTENT")) {
        metadata.nodes = [
          ...marketingContext.claims.map((c) => ({ id: c.id, label: c.statement, group: "claim" })),
          ...marketingContext.contentAssets.map((a) => ({ id: a.id, label: a.title, group: "asset" })),
          ...(marketingContext.campaigns || []).map((c) => ({ id: c.id, label: c.name, group: "campaign" })),
        ];
        metadata.edges = [];
        if (marketingRecommendations.length) {
          metadata.recommendations = marketingRecommendations.slice(0, 3);
        }
      }

      response = baseResponse(requestId, classified.intent, _nullishCoalesce(_optionalChain([llmChoice, 'optionalAccess', _46 => _46.confidence]), () => ( 0.85)), evidence_anchors, trace, req, {
        component: "CommandCenterShell",
        props: {
          shell: shellType,
          metadata,
          focusId: _optionalChain([req, 'access', _47 => _47.context, 'optionalAccess', _48 => _48.focusedNodeIds, 'optionalAccess', _49 => _49[0]]),
        },
        layoutHint: "full",
      });
      push(step("render", "Rendering CommandCenterShell with marketing context"));
    } else if (component === "MetricsDashboard") {
      const props = await buildMetricsProps();
      response = baseResponse(requestId, classified.intent, _nullishCoalesce(_optionalChain([llmChoice, 'optionalAccess', _50 => _50.confidence]), () => ( 0.85)), evidence_anchors, trace, req, {
        component: "MetricsDashboard",
        props,
        layoutHint: "full",
      });
    } else if (component === "EvidencePanel" && !classified.preferGraph) {
      const props = {
        title: `Evidence for “${query}”`,
        content: buildEvidenceMarkdown(navigatorResult),
        evidence_anchors,
      };
      response = baseResponse(requestId, classified.intent, _nullishCoalesce(_optionalChain([llmChoice, 'optionalAccess', _51 => _51.confidence]), () => ( 0.85)), evidence_anchors, trace, req, {
        component: "MarkdownViewer",
        props,
        layoutHint: "full",
      });
    } else if (component === "GraphVisualizer" || classified.preferGraph || classified.focusFollowUp) {
      const focusOverride = _optionalChain([req, 'access', _52 => _52.context, 'optionalAccess', _53 => _53.focusedNodeIds, 'optionalAccess', _54 => _54[0]]);
      const props = mapGraphToVisualizerProps(graph, navigatorResult, focusOverride);
      push(step("render", `Rendering GraphVisualizer with ${props.nodes.length} nodes`));
      response = baseResponse(requestId, classified.intent, _nullishCoalesce(_optionalChain([llmChoice, 'optionalAccess', _55 => _55.confidence]), () => ( 0.9)), evidence_anchors, trace, req, {
        component: "GraphVisualizer",
        props,
        layoutHint: "full",
      });
      if (props.focusNodeId) {
        response.context.focusedNodeIds = [props.focusNodeId];
      }
    } else {
      // MarkdownViewer — use grounded prose from LLM
      let explanation =
        _optionalChain([navigatorResult, 'optionalAccess', _56 => _56.explanation]) ||
        "No grounded explanation available yet. The World Model is still being synchronized.";

      try {
        const grounded = await generateGroundedAnswer({
          query,
          explanation: _optionalChain([navigatorResult, 'optionalAccess', _57 => _57.explanation]),
          projects: _optionalChain([navigatorResult, 'optionalAccess', _58 => _58.projects]),
          technologies: _optionalChain([navigatorResult, 'optionalAccess', _59 => _59.technologies]),
          artifacts: _optionalChain([navigatorResult, 'optionalAccess', _60 => _60.artifacts]),
          ranking: _optionalChain([navigatorResult, 'optionalAccess', _61 => _61.ranking]),
          claims: _optionalChain([marketingContext, 'optionalAccess', _62 => _62.claims]),
          contentAssets: _optionalChain([marketingContext, 'optionalAccess', _63 => _63.contentAssets]),
          campaigns: _optionalChain([marketingContext, 'optionalAccess', _64 => _64.campaigns]),
        });
        explanation = grounded.text;
        push(
          step(
            "decide",
            `Grounded prose via ${grounded.provider}${grounded.usedFallback ? " (template fallback)" : ""}`
          )
        );
        // Merge grounded suggestions into contextual suggestions if not already set
        if (_optionalChain([grounded, 'access', _65 => _65.suggestions, 'optionalAccess', _66 => _66.length])) {
          response = baseResponse(
            requestId,
            classified.intent,
            _nullishCoalesce(_optionalChain([llmChoice, 'optionalAccess', _67 => _67.confidence]), () => ( 0.8)),
            evidence_anchors,
            trace,
            req,
            {
              component: "MarkdownViewer",
              props: {
                title: `Navigator · ${query}`,
                content: [
                  "## Grounded Explanation",
                  "",
                  explanation,
                  "",
                  "### Projects",
                  (_nullishCoalesce(_optionalChain([navigatorResult, 'optionalAccess', _68 => _68.projects]), () => ( []))).map((p) => `- **${p.name}** (\`${p.repository}\`)`).join("\n") || "_None_",
                  "",
                  "### Technologies",
                  (_nullishCoalesce(_optionalChain([navigatorResult, 'optionalAccess', _69 => _69.technologies]), () => ( []))).map((t) => `- ${t.name} (${t.projectCount} projects)`).join("\n") || "_None_",
                ].join("\n"),
                evidence_anchors,
              } ,
              layoutHint: "full",
            }
          );
          push(step("render", "Rendering MarkdownViewer with grounded explanation"));
          return response;
        }
      } catch (groundedErr) {
        console.warn("[omni] Grounded answer fallback:", groundedErr);
        push(step("decide", "Grounded answer failed — using template explanation"));
      }

      const props = {
        title: `Navigator · ${query}`,
        content: [
          "## Grounded Explanation",
          "",
          explanation,
          "",
          "### Projects",
          (_nullishCoalesce(_optionalChain([navigatorResult, 'optionalAccess', _70 => _70.projects]), () => ( []))).map((p) => `- **${p.name}** (\`${p.repository}\`)`).join("\n") || "_None_",
          "",
          "### Technologies",
          (_nullishCoalesce(_optionalChain([navigatorResult, 'optionalAccess', _71 => _71.technologies]), () => ( []))).map((t) => `- ${t.name} (${t.projectCount} projects)`).join("\n") || "_None_",
        ].join("\n"),
        evidence_anchors,
      };
      push(step("render", "Rendering MarkdownViewer with grounded explanation"));
      response = baseResponse(requestId, classified.intent, _nullishCoalesce(_optionalChain([llmChoice, 'optionalAccess', _72 => _72.confidence]), () => ( 0.8)), evidence_anchors, trace, req, {
        component: "MarkdownViewer",
        props,
        layoutHint: "full",
      });
    }

    response.context.lastQuery = query;
    response.suggestions = contextualSuggestions(
      classified.intent,
      response.context.focusedNodeIds,
      evidence_anchors
    );

    response.reasoning_trace.push(step("render", `Omni-Command completed in ${Date.now() - started} ms`));
    _optionalChain([onTrace, 'optionalCall', _73 => _73(response.reasoning_trace[response.reasoning_trace.length - 1])]);

    const validated = validateOmniResponse(response);
    if (!validated.success) {
      console.warn("[omni] Response failed Zod validation:", validated.error);
      response.status = "partial";
    }

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    push(step("tool", `Error: ${message}`));
    return {
      version: "1.0",
      requestId,
      intent: "ERROR",
      status: "error",
      confidence: 0,
      groundedEvidenceCount: 0,
      reasoning_trace: trace,
      ui_directive: { component: "ErrorStage", props: { message } },
      context: { ...(_nullishCoalesce(req.context, () => ( {}))), lastQuery: query },
      suggestions: ["Try a simpler query", "Show all projects", "Run a health check"],
      evidence_anchors: [],
      error: { code: "OMNI_COMMAND_FAILED", message, recoverable: true },
    };
  }
}

function baseResponse(
  requestId,
  intent,
  confidence,
  evidence_anchors,
  trace,
  req,
  ui_directive
) {
  return {
    version: "1.0",
    requestId,
    intent,
    status: "success",
    confidence,
    groundedEvidenceCount: evidence_anchors.length,
    reasoning_trace: [...trace],
    ui_directive,
    context: {
      ...(_nullishCoalesce(req.context, () => ( {}))),
      previousIntent: intent,
      focusedNodeIds: _optionalChain([req, 'access', _74 => _74.context, 'optionalAccess', _75 => _75.focusedNodeIds]),
    },
    suggestions: [],
    evidence_anchors,
  };
}

function mapGraphToVisualizerProps(
  graph,
  navigatorResult,
  focusOverride
) {
  const rawNodes = Array.isArray(_optionalChain([graph, 'optionalAccess', _76 => _76.nodes])) ? graph.nodes : [];
  const rawEdges = Array.isArray(_optionalChain([graph, 'optionalAccess', _77 => _77.links]))
    ? graph.links
    : Array.isArray(_optionalChain([graph, 'optionalAccess', _78 => _78.edges]))
      ? graph.edges
      : [];

  const focusId =
    focusOverride ||
    _optionalChain([navigatorResult, 'optionalAccess', _79 => _79.projects, 'optionalAccess', _80 => _80[0], 'optionalAccess', _81 => _81.id]) ||
    _optionalChain([rawNodes, 'access', _82 => _82.find, 'call', _83 => _83((n) => n.isPinned), 'optionalAccess', _84 => _84.id]) ||
    _optionalChain([rawNodes, 'access', _85 => _85[0], 'optionalAccess', _86 => _86.id]);

  const nodes = rawNodes.slice(0, 48).map((n, idx) => ({
    id: String(_nullishCoalesce(n.id, () => ( `n-${idx}`))),
    label: n.label || n.name || n.id || `Node ${idx}`,
    type: String(n.type || n.kind || "PROJECT").toUpperCase() ,
    group: n.group || n.category || n.domain || undefined,
    metadata: _nullishCoalesce(n.metadata, () => ( {})),
    position: _nullishCoalesce(n.position, () => ( {
      x: 80 + (idx % 6) * 200,
      y: 60 + Math.floor(idx / 6) * 140,
    })),
  }));

  const edges = rawEdges.slice(0, 80).map((e, idx) => ({
    id: _nullishCoalesce(e.id, () => ( `e-${idx}`)),
    source: String(e.source),
    target: String(e.target),
    label: e.label || e.relation || undefined,
    relation: e.relation,
    animated: true,
  }));

  return {
    layout: "force-directed",
    nodes,
    edges,
    focusNodeId: focusId ? String(focusId) : undefined,
  };
}

function buildEvidenceMarkdown(navigatorResult) {
  const lines = ["## Evidence Ledger", ""];
  if (_optionalChain([navigatorResult, 'optionalAccess', _87 => _87.explanation])) lines.push(navigatorResult.explanation, "");
  if (_optionalChain([navigatorResult, 'optionalAccess', _88 => _88.projects, 'optionalAccess', _89 => _89.length])) {
    lines.push("### Projects");
    for (const p of navigatorResult.projects) {
      lines.push(`- **${p.name}** — \`${p.repository}\` ${p.url ? `[repo](${p.url})` : ""}`);
    }
    lines.push("");
  }
  if (_optionalChain([navigatorResult, 'optionalAccess', _90 => _90.artifacts, 'optionalAccess', _91 => _91.length])) {
    lines.push("### Artifacts (SHA-backed)");
    for (const a of navigatorResult.artifacts) {
      lines.push(`- \`${a.path}\` · sha:${_nullishCoalesce(_optionalChain([a, 'access', _92 => _92.sha, 'optionalAccess', _93 => _93.slice, 'call', _94 => _94(0, 8)]), () => ( "—"))} · ${a.kind}`);
    }
    lines.push("");
  }
  if (_optionalChain([navigatorResult, 'optionalAccess', _95 => _95.technologies, 'optionalAccess', _96 => _96.length])) {
    lines.push("### Technologies");
    for (const t of navigatorResult.technologies) {
      lines.push(`- ${t.name} (${t.projectCount} projects)`);
    }
  }
  return lines.join("\n");
}

async function buildMetricsProps() {
  const points = [];
  const now = Date.now();
  for (let i = 9; i >= 0; i--) {
    points.push({
      timestamp: new Date(now - i * 1000).toISOString().slice(11, 19),
      value: Math.round(process.uptime() % 200) + 20 + Math.floor(Math.random() * 15),
      label: "uptime_proxy_ms",
    });
  }
  const mem = process.memoryUsage();
  return {
    widget_type: "health",
    status: "LIVE",
    data_points: points,
    summary: `Process uptime ${Math.round(process.uptime())}s · RSS ${Math.round(mem.rss / 1024 / 1024)}MB · Heap ${Math.round(mem.heapUsed / 1024 / 1024)}MB. Query /health for full DB/Redis status.`,
  };
}
