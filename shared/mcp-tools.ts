export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  handler: string;
}

export interface MCPToolRequest {
  toolName: string;
  arguments: Record<string, any>;
  agentId?: string;
  userId?: string;
}

export interface MCPToolResponse {
  toolName: string;
  success: boolean;
  data?: Record<string, any>;
  error?: string;
  latencyMs?: number;
}
