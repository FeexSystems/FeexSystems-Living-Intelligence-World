export type Tier = "OUT_OF_BOX" | "LOW_CODE" | "CUSTOM";

export interface AnalyticsAgent {
  id: string;
  name: string;
  description: string;
  tier: Tier;
  config: Record<string, any>;
  mcpTools: string[];
  a2aCapabilities: string[];
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsQueryRequest {
  agentId?: string;
  query: string;
  tier: Tier;
  context?: Record<string, any>;
}

export interface AnalyticsQueryResponse {
  query: string;
  answer: string;
  confidence: number;
  evidenceAnchors: EvidenceAnchor[];
  provider: string;
  model: string;
  latencyMs: number;
}

export interface EvidenceAnchor {
  type: "project" | "artifact" | "technology" | "relationship" | "commit";
  id: string;
  label: string;
  url?: string;
  sha?: string;
}
