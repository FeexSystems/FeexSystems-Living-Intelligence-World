
import { analyticsAgentService } from "./analytics-agent.service";
import { prisma } from "../database";

const BUILTIN_TOOLS = [
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










































































/** Registry of MCP tools and connectors */
export class MCPToolRegistryService {constructor() { MCPToolRegistryService.prototype.__init.call(this);MCPToolRegistryService.prototype.__init2.call(this); }
   __init() {this.plugins = new Map()}
   __init2() {this.connectors = new Map()}

  /** List all built-in tools */
  listTools() {
    return BUILTIN_TOOLS;
  }

  /** Get a built-in tool by name */
  getTool(name) {
    return BUILTIN_TOOLS.find((tool) => tool.name === name);
  }

  /** Register a new plugin */
  async registerPlugin(plugin) {
    if (this.plugins.has(plugin.name)) {
      return { success: false, error: `Plugin "${plugin.name}" already registered` };
    }
    this.plugins.set(plugin.name, plugin);
    return { success: true };
  }

  /** Get a registered plugin */
  getPlugin(name) {
    return this.plugins.get(name);
  }

  /** Register a new connector */
  async registerConnector(connector) {
    if (this.connectors.has(connector.name)) {
      return { success: false, error: `Connector "${connector.name}" already registered` };
    }
    this.connectors.set(connector.name, connector);
    return { success: true };
  }

  /** Get a registered connector */
  getConnector(name) {
    return this.connectors.get(name);
  }

  /** Invoke a tool by name */
  async invokeTool(request) {
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
  getAllPlugins() {
    return Array.from(this.plugins.values());
  }

  /** Get all registered connectors */
  getAllConnectors() {
    return Array.from(this.connectors.values());
  }

  /** Execute handler (internal method for built-in tools) */
   async executeHandler(handler, args) {
    switch (handler) {
      case "queryWorldModel": {
        const query = args.query || "";
        const limit = args.limit || 10;
        const pattern = "%" + query.toLowerCase() + "%";
        const results = await prisma.$queryRaw`
          SELECT id, name, repository, description, url
          FROM world_model_projects
          WHERE LOWER(name) LIKE ${pattern}
          LIMIT ${limit}`;
        return { results: Array.isArray(results) ? results : [], count: Array.isArray(results) ? results.length : 0 };
      }
      case "getEvidence": {
        const entityId = args.entityId || "";
        const evidence = await prisma.$queryRaw`
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
        const agents = await analyticsAgentService.listAgents(args.tier );
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

