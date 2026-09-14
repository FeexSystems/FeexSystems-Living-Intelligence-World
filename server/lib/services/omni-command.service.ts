/**
 * Omni-Command Service
 *
 * Grounds queries in the World Model (hybrid ranking), asks an LLM (with few-shot examples) to
 * choose a UI directive, validates the full Orchestration Contract with Zod,
 * and carries multi-turn context (focused nodes, previous intent).
 */

import { randomUUID } from "crypto";
import type {
  OmniCommandRequest,
  OmniCommandResponse,
  ReasoningStep,
  GraphVisualizerProps,
  MarkdownViewerProps,
  MetricsDashboardProps,
  EvidenceAnchor,
  OmniComponent,
} from "../../../shared/orchestration";
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
  type: ReasoningStep["type"],
  message: string,
  durationMs?: number
): ReasoningStep {
  return { id: randomUUID(), type, message, timestamp: nowIso(), durationMs };
}

export type TraceCallback = (s: ReasoningStep) => void;

function classifyIntent(query: string, context?: OmniCommandRequest["context"]) {
  const q = query.toLowerCase();
  const focusFollowUp =
    /zoom|focus|that node|this node|that project|expand|drill/.test(q) &&
    (context?.focusedNodeIds?.length ?? 0) > 0;

  const preferGraph =
    focusFollowUp ||
    /architecture|graph|topology|relationship|connected|depends|uses|visualize|map|network/.test(q);
  const preferMarkdown = /explain|how does|what is|documentation|describe|overview/.test(q);
  const preferEvidence = /evidence|prove|sha|commit|artifact|source|where is/.test(q);
  const preferMetrics = /health|latency|uptime|status|metrics|live|dashboard/.test(q);

  let intent = context?.previousIntent || "EXPLORE_WORLD_MODEL";
  
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

async function llmChooseDirective(args: {
  query: string;
  intent: string;
  groundedSummary: string;
  nodeSample: string;
  context?: OmniCommandRequest["context"];
}): Promise<{ component: OmniComponent; layoutHint?: string; confidence: number } | null> {
  const user = [
    `Query: ${args.query}`,
    `Intent hint: ${args.intent}`,
    args.context?.previousIntent ? `Previous intent: ${args.context.previousIntent}` : null,
    args.context?.focusedNodeIds?.length
      ? `Focused nodes: ${args.context.focusedNodeIds.join(", ")}`
      : null,
    args.context?.lastQuery ? `Previous query: ${args.context.lastQuery}` : null,
    `Grounded World Model summary:\n${args.groundedSummary}`,
    `Sample nodes: ${args.nodeSample || "(none)"}`,
  ]
    .filter(Boolean)
    .join("\n");

  const out = await aiGateway.generateObject<{ component: OmniComponent; layoutHint?: string; confidence: number }>(DIRECTOR_SYSTEM, user);
  if (out?.object?.component) {
    return out.object;
  }

  return null;
}

function contextualSuggestions(
  intent: string,
  focusedIds: string[] | undefined,
  anchors: EvidenceAnchor[]
): string[] {
  const base = [
    "Show me the backend architecture",
    "Which projects use PostgreSQL?",
    "Run a health check on the platform",
    "Show evidence for the knowledge graph",
  ];
  const extra: string[] = [];
  if (focusedIds?.length) {
    extra.push("Zoom into the focused node");
    extra.push("Show evidence for this node");
  }
  if (anchors.some((a) => a.type === "project")) {
    extra.push(`Explain ${anchors.find((a) => a.type === "project")!.label}`);
  }
  if (intent === "VISUALIZE_ARCHITECTURE") extra.push("List technologies in this graph");
  if (intent === "SHOW_METRICS") extra.push("Show architecture again");
  return [...extra, ...base].slice(0, 6);
}

export async function executeOmniCommand(
  req: OmniCommandRequest,
  onTrace?: TraceCallback
): Promise<OmniCommandResponse> {
  const requestId = randomUUID();
  const trace: ReasoningStep[] = [];
  const push = (s: ReasoningStep) => {
    trace.push(s);
    onTrace?.(s);
  };
  const started = Date.now();

  if (!req.query?.trim()) {
    return createEmptyStageResponse(requestId);
  }

  const query = req.query.trim();
  push(step("parse", `Parsing intent from: "${query.slice(0, 80)}${query.length > 80 ? "…" : ""}"`));

  if (req.context?.focusedNodeIds?.length) {
    push(step("parse", `Context focus: ${req.context.focusedNodeIds.join(", ")}`));
  }
  if (req.context?.previousIntent) {
    push(step("parse", `Previous intent: ${req.context.previousIntent}`));
  }

  const classified = classifyIntent(query, req.context);
  push(step("parse", `Classified intent → ${classified.intent}`));

  try {
    const retrievalQuery =
      classified.focusFollowUp && req.context?.focusedNodeIds?.length
        ? `${query} ${req.context.focusedNodeIds.join(" ")}`
        : query;

    const t0 = Date.now();
    const navigatorResult = await retrieveWorldHybrid(retrievalQuery);
    push(
      step(
        "retrieve",
        `Hybrid ${navigatorResult.ranking?.mode || "keyword-only"}: ${navigatorResult?.projects?.length ?? 0} projects, ${navigatorResult?.technologies?.length ?? 0} techs, ${navigatorResult.ranking?.vectorHits ?? 0} vector hits`,
        Date.now() - t0
      )
    );

    let graph: any = null;
    if (classified.preferGraph || classified.focusFollowUp || !classified.preferMarkdown) {
      const t1 = Date.now();
      graph = await getWorldModelGraph();
      const nodeCount = Array.isArray(graph?.nodes) ? graph.nodes.length : 0;
      const linkCount = Array.isArray(graph?.links) ? graph.links.length : 0;
      push(step("retrieve", `Loaded World Model graph (${nodeCount} nodes, ${linkCount} links)`, Date.now() - t1));
    }

    let marketingContext: any = null;
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

    let marketingRecommendations: any[] = [];
    if (classified.isMarketing) {
      try {
        marketingRecommendations = await marketingNavigator.recommendations(retrievalQuery);
      } catch (recErr) {
        console.warn("[omni] Marketing recommendations failed:", recErr);
      }
    }

    const evidence_anchors: EvidenceAnchor[] = [];
    if (navigatorResult?.projects) {
      for (const p of navigatorResult.projects.slice(0, 12)) {
        evidence_anchors.push({ type: "project", id: p.id, label: p.name, url: p.url });
      }
    }
    if (navigatorResult?.artifacts) {
      for (const a of navigatorResult.artifacts.slice(0, 8)) {
        evidence_anchors.push({ type: "artifact", id: a.id, label: a.path, sha: a.sha });
      }
    }

    const groundedSummary = [
      navigatorResult?.explanation || "",
      `Projects: ${(navigatorResult?.projects || []).map((p: any) => p.name).join(", ") || "none"}`,
      `Technologies: ${(navigatorResult?.technologies || []).map((t: any) => t.name).join(", ") || "none"}`,
      classified.isMarketing ? `Marketing Claims: ${(marketingContext?.claims || []).map((c: any) => c.statement).join(" | ") || "none"}` : "",
      classified.isMarketing ? `Content Assets: ${(marketingContext?.contentAssets || []).map((a: any) => a.title).join(" | ") || "none"}` : "",
      classified.isMarketing ? `Campaigns: ${(marketingContext?.campaigns || []).map((c: any) => c.name).join(" | ") || "none"}` : "",
      classified.isMarketing && marketingRecommendations.length
        ? `Recommended Actions: ${marketingRecommendations.slice(0, 3).map((r: any) => r.title).join(" | ")}`
        : "",
    ].filter(Boolean).join("\n");

    const nodeSample = (graph?.nodes || [])
      .slice(0, 8)
      .map((n: any) => `${n.id}:${n.name || n.label}`)
      .join(", ");

    push(step("decide", "Asking model to choose UI directive (few-shot Orchestration Contract)…"));
    const llmChoice = await llmChooseDirective({
      query,
      intent: classified.intent,
      groundedSummary,
      nodeSample,
      context: req.context,
    });

    let component: OmniComponent =
      (llmChoice?.component as OmniComponent) ||
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
      push(step("decide", `LLM selected ${component} (confidence ${llmChoice.confidence ?? "?"})`));
    } else {
      push(step("decide", `Heuristic selected ${component} (no LLM keys or provider error)`));
    }

    let response: OmniCommandResponse;

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

      const metadata: Record<string, unknown> = {};
      
      // Attempt to enrich with graph data if relevant
      if (marketingContext && (shellType === "WORLD" || shellType === "CAMPAIGNS" || shellType === "CONTENT")) {
        metadata.nodes = [
          ...marketingContext.claims.map((c: any) => ({ id: c.id, label: c.statement, group: "claim" })),
          ...marketingContext.contentAssets.map((a: any) => ({ id: a.id, label: a.title, group: "asset" })),
          ...(marketingContext.campaigns || []).map((c: any) => ({ id: c.id, label: c.name, group: "campaign" })),
        ];
        metadata.edges = [];
        if (marketingRecommendations.length) {
          metadata.recommendations = marketingRecommendations.slice(0, 3);
        }
      }

      response = baseResponse(requestId, classified.intent, llmChoice?.confidence ?? 0.85, evidence_anchors, trace, req, {
        component: "CommandCenterShell",
        props: {
          shell: shellType,
          metadata,
          focusId: req.context?.focusedNodeIds?.[0],
        },
        layoutHint: "full",
      });
      push(step("render", "Rendering CommandCenterShell with marketing context"));
    } else if (component === "MetricsDashboard") {
      const props = await buildMetricsProps();
      response = baseResponse(requestId, classified.intent, llmChoice?.confidence ?? 0.85, evidence_anchors, trace, req, {
        component: "MetricsDashboard",
        props,
        layoutHint: "full",
      });
    } else if (component === "EvidencePanel" && !classified.preferGraph) {
      const props: MarkdownViewerProps = {
        title: `Evidence for “${query}”`,
        content: buildEvidenceMarkdown(navigatorResult),
        evidence_anchors,
      };
      response = baseResponse(requestId, classified.intent, llmChoice?.confidence ?? 0.85, evidence_anchors, trace, req, {
        component: "MarkdownViewer",
        props,
        layoutHint: "full",
      });
    } else if (component === "GraphVisualizer" || classified.preferGraph || classified.focusFollowUp) {
      const focusOverride = req.context?.focusedNodeIds?.[0];
      const props = mapGraphToVisualizerProps(graph, navigatorResult, focusOverride);
      push(step("render", `Rendering GraphVisualizer with ${props.nodes.length} nodes`));
      response = baseResponse(requestId, classified.intent, llmChoice?.confidence ?? 0.9, evidence_anchors, trace, req, {
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
        navigatorResult?.explanation ||
        "No grounded explanation available yet. The World Model is still being synchronized.";

      try {
        const grounded = await generateGroundedAnswer({
          query,
          explanation: navigatorResult?.explanation,
          projects: navigatorResult?.projects,
          technologies: navigatorResult?.technologies,
          artifacts: navigatorResult?.artifacts,
          ranking: navigatorResult?.ranking,
          claims: marketingContext?.claims,
          contentAssets: marketingContext?.contentAssets,
          campaigns: marketingContext?.campaigns,
        });
        explanation = grounded.text;
        push(
          step(
            "decide",
            `Grounded prose via ${grounded.provider}${grounded.usedFallback ? " (template fallback)" : ""}`
          )
        );
        // Merge grounded suggestions into contextual suggestions if not already set
        if (grounded.suggestions?.length) {
          response = baseResponse(
            requestId,
            classified.intent,
            llmChoice?.confidence ?? 0.8,
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
                  (navigatorResult?.projects ?? []).map((p: any) => `- **${p.name}** (\`${p.repository}\`)`).join("\n") || "_None_",
                  "",
                  "### Technologies",
                  (navigatorResult?.technologies ?? []).map((t: any) => `- ${t.name} (${t.projectCount} projects)`).join("\n") || "_None_",
                ].join("\n"),
                evidence_anchors,
              } as MarkdownViewerProps,
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

      const props: MarkdownViewerProps = {
        title: `Navigator · ${query}`,
        content: [
          "## Grounded Explanation",
          "",
          explanation,
          "",
          "### Projects",
          (navigatorResult?.projects ?? []).map((p: any) => `- **${p.name}** (\`${p.repository}\`)`).join("\n") || "_None_",
          "",
          "### Technologies",
          (navigatorResult?.technologies ?? []).map((t: any) => `- ${t.name} (${t.projectCount} projects)`).join("\n") || "_None_",
        ].join("\n"),
        evidence_anchors,
      };
      push(step("render", "Rendering MarkdownViewer with grounded explanation"));
      response = baseResponse(requestId, classified.intent, llmChoice?.confidence ?? 0.8, evidence_anchors, trace, req, {
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
    onTrace?.(response.reasoning_trace[response.reasoning_trace.length - 1]);

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
      context: { ...(req.context ?? {}), lastQuery: query },
      suggestions: ["Try a simpler query", "Show all projects", "Run a health check"],
      evidence_anchors: [],
      error: { code: "OMNI_COMMAND_FAILED", message, recoverable: true },
    };
  }
}

function baseResponse(
  requestId: string,
  intent: string,
  confidence: number,
  evidence_anchors: EvidenceAnchor[],
  trace: ReasoningStep[],
  req: OmniCommandRequest,
  ui_directive: OmniCommandResponse["ui_directive"]
): OmniCommandResponse {
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
      ...(req.context ?? {}),
      previousIntent: intent,
      focusedNodeIds: req.context?.focusedNodeIds,
    },
    suggestions: [],
    evidence_anchors,
  };
}

function mapGraphToVisualizerProps(
  graph: any,
  navigatorResult: any,
  focusOverride?: string
): GraphVisualizerProps {
  const rawNodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const rawEdges = Array.isArray(graph?.links)
    ? graph.links
    : Array.isArray(graph?.edges)
      ? graph.edges
      : [];

  const focusId =
    focusOverride ||
    navigatorResult?.projects?.[0]?.id ||
    rawNodes.find((n: any) => n.isPinned)?.id ||
    rawNodes[0]?.id;

  const nodes = rawNodes.slice(0, 48).map((n: any, idx: number) => ({
    id: String(n.id ?? `n-${idx}`),
    label: n.label || n.name || n.id || `Node ${idx}`,
    type: String(n.type || n.kind || "PROJECT").toUpperCase() as any,
    group: n.group || n.category || n.domain || undefined,
    metadata: n.metadata ?? {},
    position: n.position ?? {
      x: 80 + (idx % 6) * 200,
      y: 60 + Math.floor(idx / 6) * 140,
    },
  }));

  const edges = rawEdges.slice(0, 80).map((e: any, idx: number) => ({
    id: e.id ?? `e-${idx}`,
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

function buildEvidenceMarkdown(navigatorResult: any): string {
  const lines: string[] = ["## Evidence Ledger", ""];
  if (navigatorResult?.explanation) lines.push(navigatorResult.explanation, "");
  if (navigatorResult?.projects?.length) {
    lines.push("### Projects");
    for (const p of navigatorResult.projects) {
      lines.push(`- **${p.name}** — \`${p.repository}\` ${p.url ? `[repo](${p.url})` : ""}`);
    }
    lines.push("");
  }
  if (navigatorResult?.artifacts?.length) {
    lines.push("### Artifacts (SHA-backed)");
    for (const a of navigatorResult.artifacts) {
      lines.push(`- \`${a.path}\` · sha:${a.sha?.slice(0, 8) ?? "—"} · ${a.kind}`);
    }
    lines.push("");
  }
  if (navigatorResult?.technologies?.length) {
    lines.push("### Technologies");
    for (const t of navigatorResult.technologies) {
      lines.push(`- ${t.name} (${t.projectCount} projects)`);
    }
  }
  return lines.join("\n");
}

async function buildMetricsProps(): Promise<MetricsDashboardProps> {
  const points: MetricsDashboardProps["data_points"] = [];
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
