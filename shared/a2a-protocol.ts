export interface A2AMessage {
  id: string;
  from: string;
  to: string;
  type: "request" | "response" | "stream" | "error";
  payload: Record<string, any>;
  timestamp: string;
  traceId?: string;
}

export interface A2AAgentDiscovery {
  agents: A2AAgentInfo[];
}

export interface A2AAgentInfo {
  id: string;
  name: string;
  type: string;
  tier: "OUT_OF_BOX" | "LOW_CODE" | "CUSTOM";
  capabilities: string[];
  endpoint: string;
}

export interface A2ASendMessageRequest {
  from: string;
  to: string;
  type: "request" | "stream";
  payload: Record<string, any>;
  traceId?: string;
}

export interface A2ASendMessageResponse {
  id: string;
  from: string;
  type: string;
  payload: Record<string, any>;
  timestamp: string;
}
