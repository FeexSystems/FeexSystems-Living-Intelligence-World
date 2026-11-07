import type { MCPToolDefinition, MCPToolRequest, MCPToolResponse, PluginDefinition, ConnectorDefinition, PluginConnectorRequest, PluginConnectorResponse } from "../../../shared/mcp-tools";
import { analyticsAgentService } from "./analytics-agent.service";
import { prisma } from "../database";

const BUILTIN_TOOLS: MCPToolDefinition[] = [
  {
    name: "query_world_model",
    description: "Query World Model entities by keyword or ID",
    inputSchema: { query: "string", limit: "number?" },
    outputSchema: { results: "array", count: "number" },
    handler: "queryWorldModel",
  },
  {
    name: "get_evidence",
    description: "Retrieve evidence for an entity by ID",
    inputSchema: { entityId: "string", type: "string?" },
    outputSchema: { evidence: "array", entityId: "string" },
    handler: "getEvidence",
  },
  {
    name: "get_metrics",
    description: "Calculate analytics metrics",
    inputSchema: { metricId: "string", range: "string?" },
    outputSchema: { metricId: "string", value: "number", label: "string" },
    handler: "getMetrics",
  },
  {
    name: "list_agents",
    description: "Discover available analytics agents",
    inputSchema: { tier: "string?" },
    outputSchema: { agents: "array", count: "number" },
    handler: "listAgents",
  },
  {
    name: "run_agent",
    description: "Execute an analytics agent with a query",
    inputSchema: { agentId: "string", query: "string" },
    outputSchema: { agentId: "string", response: "string", confidence: "number" },
    handler: "runAgent",
  },
  {
    name: "graph_traverse",
    description: "Traverse graph relationships from a node",
    inputSchema: { nodeId: "string", depth: "number?" },
    outputSchema: { nodes: "array", edges: "array" },
    handler: "graphTraverse",
  },
];

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
  arguments?: Record<string, any>;
  agentId?: string;
  userId?: string;
}

/** Response from plugin/connector execution */
export interface PluginConnectorResponse {
  success: boolean;
  pluginName?: string;
  connectorName?: string;
  toolName?: string;
  data?: any;
  error?: string;
  latencyMs: number;
}

/** Request for tool invocation */
export interface MCPToolRequest {
  toolName: string;
  arguments?: Record<string, any>;
}

/** Response from tool invocation */
export interface MCPToolResponse {
  success: boolean;
  data?: any;
  error?: string;
  latencyMs: number;
}

/** Registry of MCP tools and connectors */
export class MCPToolRegistryService {
  private plugins: Map<string, PluginDefinition> = new Map();
  private connectors: Map<string, ConnectorDefinition> = new Map();

  /** List all built-in tools */
  listTools(): MCPToolDefinition[] {
    return BUILTIN_TOOLS;
  }

  /** Get a built-in tool by name */
  getTool(name: string): MCPToolDefinition | undefined {
    return BUILTIN_TOOLS.find((tool) => tool.name === name);
  }

  /** Register a new plugin */
  async registerPlugin(plugin: PluginDefinition): Promise<{ success: boolean; error?: string }> {
    if (this.plugins.has(plugin.name)) {
      return { success: false, error: `Plugin "${plugin.name}" already registered` };
    }
    this.plugins.set(plugin.name, plugin);
    return { success: true };
  }

  /** Get a registered plugin */
  getPlugin(name: string): PluginDefinition | undefined {
    return this.plugins.get(name);
  }

  /** Register a new connector */
  async registerConnector(connector: ConnectorDefinition): Promise<{ success: boolean; error?: string }> {
    if (this.connectors.has(connector.name)) {
      return { success: false, error: `Connector "${connector.name}" already registered` };
    }
    this.connectors.set(connector.name, connector);
    return { success: true };
  }

  /** Get a registered connector */
  getConnector(name: string): ConnectorDefinition | undefined {
    return this.connectors.get(name);
  }

  /** Invoke a tool by name */
  async invokeTool(request: { toolName: string; arguments?: Record<string, any> }): Promise<MCPToolResponse> {
    const tool = this.getTool(request.toolName);
    if (!tool) {
      return { success: false, error: `Tool "${request.toolName}" not found` };
    }

    try {
      return await this.executeHandler(request.toolName, request.arguments || {});
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Tool execution failed",
      };
    }
  }

  /** Get all registered plugins */
  getAllPlugins(): PluginDefinition[] {
    return Array.from(this.plugins.values());
  }

  /** Get all registered connectors */
  getAllConnectors(): ConnectorDefinition[] {
    return Array.from(this.connectors.values());
  }

  /** Execute handler (internal method for built-in tools) */
  private async executeHandler(handler: string, args: Record<string, any>): Promise<Record<string, any>> {
    switch (handler) {
      case "queryWorldModel": {
        const query = args.query || "";
        const limit = args.limit || 10;
        const results = await prisma.$queryRaw<any>`
          SELECT id, name, repository, description, url
          FROM world_model_projects
          WHERE LOWER(name) LIKE ${"%"+query.toLowerCase()+"%"}
          LIMIT ${limit}`;
        return { results: Array.isArray(results) ? results : [], count: Array.isArray(results) ? results.length : 0 };
      }
      case "getEvidence": {
        const entityId = args.entityId || "";
        const evidence = await prisma.$queryRaw<any>`
          SELECT id, type, source_url as "sourceUrl", repository, commit_sha as "commitSha"
          FROM world_model_evidence
          WHERE entity_id = ${entityId}
          LIMIT 20`;
        return { evidence: Array.isArray(evidence) ? evidence : [], entityId };
      }
      case "getMetrics": {
        const metricId = args.metricId || "";
        return { metricId, value: 0, label: `Metric ${metricId}` };
      }
      case "listAgents": {
        const agents = await analyticsAgentService.listAgents(args.tier as any);
        return { agents, count: agents.length };
      }
      case "runAgent": {
        const result = await analyticsAgentService.executeQuery({
          agentId: args.agentId,
          query: args.query,
          tier: "OUT_OF_BOX",
        });
        return { agentId: args.agentId, response: result.answer, confidence: result.confidence };
      }
      case "graphTraverse": {
        const nodeId = args.nodeId || "";
        return { nodes: [], edges: [], fromNode: nodeId };
      }
      default:
        return { handler };
    }
  }

}

export const mcpToolRegistry = new MCPToolRegistryService();