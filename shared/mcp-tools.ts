export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  handler: string;
}

/** Plugin definition for dynamic agentic capabilities */
export interface PluginDefinition {
  name: string;
  version: string;
  author: string;
  description?: string;
  entryPoint: string; // Module path or entry point URL
  capabilities: string[]; // List of MCP tool names this plugin provides
  configSchema?: Record<string, any>; // Configuration schema for the plugin
  dependencies?: string[]; // Dependencies (other plugin names, external services)
  hooks?: {
    onRegister?: (registry: MCPToolRegistry) => Promise<void>;
    onUnregister?: (registry: MCPToolRegistry) => Promise<void>;
    onExecute?: (toolName: string, request: MCPToolRequest) => Promise<MCPToolResponse>;
  };
}

/** Connector definition for external system integrations */
export interface ConnectorDefinition {
  name: string;
  type: 'database' | 'api' | 'file' | 'message-queue' | 'custom';
  description: string;
  endpoint: string; // API endpoint or connection string
  capabilities: string[]; // List of operations this connector supports
  authConfig?: {
    type: 'none' | 'api-key' | 'oauth2' | 'jwt' | 'custom';
    settings?: Record<string, any>;
  };
  timeout?: number; // Default timeout in milliseconds
  retryConfig?: {
    maxRetries: number;
    backoffMs: number;
  };
  hooks?: {
    onConnect?: () => Promise<void>;
    onDisconnect?: () => Promise<void>;
    onError?: (error: Error) => Promise<void>;
  };
}

/** Request for plugin/connector execution */
export interface PluginConnectorRequest {
  pluginName?: string;
  connectorName?: string;
  toolName: string;
  arguments: Record<string, any>;
  userId?: string;
  tenantId?: string;
}

/** Response for plugin/connector execution */
export interface PluginConnectorResponse {
  pluginName?: string;
  connectorName?: string;
  toolName: string;
  success: boolean;
  data?: Record<string, any>;
  error?: string;
  latencyMs: number;
  evidenceAnchors?: EvidenceAnchor[];
}
