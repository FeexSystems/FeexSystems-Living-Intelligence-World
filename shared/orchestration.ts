/**
 * FEEXSYSTEMS Omni-Command Orchestration Contract (v1.0)
 */

export type OmniComponent =
  | "GraphVisualizer"
  | "MarkdownViewer"
  | "MetricsDashboard"
  | "CodeViewer"
  | "EvidencePanel"
  | "CommandCenterShell"
  | "EmptyStage"
  | "ErrorStage";

export type ReasoningStepType =
  | "parse"
  | "retrieve"
  | "rank"
  | "decide"
  | "render"
  | "tool";

export interface ReasoningStep {
  id: string;
  type: ReasoningStepType;
  message: string;
  timestamp: string;
  durationMs?: number;
}

export interface EvidenceAnchor {
  type: "project" | "artifact" | "technology" | "relationship" | "commit";
  id: string;
  label: string;
  url?: string;
  sha?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: "PROJECT" | "TECHNOLOGY" | "ARTIFACT" | "CAPABILITY" | "INFRASTRUCTURE" | "DATA";
  group?: string;
  metadata?: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface GraphEdge {
  id?: string;
  source: string;
  target: string;
  label?: string;
  relation?: string;
  animated?: boolean;
}

export interface GraphVisualizerProps {
  layout?: "force-directed" | "hierarchical" | "radial";
  nodes: GraphNode[];
  edges: GraphEdge[];
  focusNodeId?: string;
}

export interface MarkdownViewerProps {
  title: string;
  content: string;
  source_node_id?: string;
  linked_entities?: string[];
  evidence_anchors?: EvidenceAnchor[];
}

export interface MetricsDashboardProps {
  widget_type: "latency_chart" | "health" | "usage" | "custom";
  status: "LIVE" | "CACHED" | "STALE";
  data_points: Array<{ timestamp: string; value: number; label?: string }>;
  summary?: string;
}

export interface CodeViewerProps {
  path: string;
  language?: string;
  content: string;
  sha?: string;
  startLine?: number;
}

export type CommandCenterShellType =
  | "WORLD"
  | "NAVIGATOR"
  | "CAMPAIGNS"
  | "CONTENT"
  | "AUDIENCE"
  | "SIGNALS"
  | "ANALYTICS"
  | "EVIDENCE"
  | "AUTOMATION"
  | "DIGITAL_TWIN"
  | "SYNDICATION";

export interface CommandCenterShellProps {
  shell: CommandCenterShellType;
  metadata?: Record<string, unknown>;
  focusId?: string;
}

export interface OmniCommandContext {
  focusedNodeIds?: string[];
  filters?: Record<string, string>;
  previousIntent?: string;
  sessionId?: string;
  /** Last user query in this session (multi-turn) */
  lastQuery?: string;
}

export interface OmniCommandRequest {
  query: string;
  context?: OmniCommandContext;
}

export interface OmniCommandResponse {
  version: "1.0";
  requestId: string;
  intent: string;
  status: "success" | "partial" | "error";
  confidence: number;
  groundedEvidenceCount: number;
  reasoning_trace: ReasoningStep[];
  ui_directive: {
    component: OmniComponent;
    props:
      | GraphVisualizerProps
      | MarkdownViewerProps
      | MetricsDashboardProps
      | CodeViewerProps
      | CommandCenterShellProps
      | Record<string, unknown>;
    layoutHint?: "full" | "split" | "sidebar";
  };
  secondary_directive?: {
    component: OmniComponent;
    props: Record<string, unknown>;
  };
  context: OmniCommandContext;
  suggestions: string[];
  evidence_anchors: EvidenceAnchor[];
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
}

export function createEmptyStageResponse(requestId: string): OmniCommandResponse {
  return {
    version: "1.0",
    requestId,
    intent: "IDLE",
    status: "success",
    confidence: 1,
    groundedEvidenceCount: 0,
    reasoning_trace: [],
    ui_directive: {
      component: "EmptyStage",
      props: {},
    },
    context: {},
    suggestions: [
      "Show me the backend architecture",
      "Which projects use PostgreSQL?",
      "What technologies power Persona OS?",
      "Show evidence for the knowledge graph",
    ],
    evidence_anchors: [],
  };
}
