import type { MCPToolDefinition, MCPToolRequest, MCPToolResponse } from "../../../shared/mcp-tools";
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

class MCPToolRegistryService {
  private tools: MCPToolDefinition[] = [...BUILTIN_TOOLS];

  listTools(): MCPToolDefinition[] {
    try {
      const dbTools = [...BUILTIN_TOOLS];
      return dbTools;
    } catch {
      return this.tools;
    }
  }

  getTool(name: string): MCPToolDefinition | undefined {
    return this.tools.find((t) => t.name === name);
  }

  async invokeTool(request: MCPToolRequest): Promise<MCPToolResponse> {
    const startTime = Date.now();
    const tool = this.getTool(request.toolName);

    if (!tool) {
      return {
        toolName: request.toolName,
        success: false,
        error: `Tool "${request.toolName}" not found`,
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      const result = await this.executeHandler(tool.handler, request.arguments);
      return {
        toolName: request.toolName,
        success: true,
        data: result,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        toolName: request.toolName,
        success: false,
        error: error instanceof Error ? error.message : "Tool execution failed",
        latencyMs: Date.now() - startTime,
      };
    }
  }

  private async executeHandler(
    handler: string,
    args: Record<string, any>
  ): Promise<Record<string, any>> {
    switch (handler) {
      case "queryWorldModel": {
        const query = args.query || "";
        const limit = args.limit || 10;
        const results = await prisma.$queryRaw<any>`
          SELECT id, name, repository, description, url
          FROM world_model_projects
          WHERE LOWER(name) LIKE ${"%" + query.toLowerCase() + "%"}
          LIMIT ${limit}
        `;
        return { results: Array.isArray(results) ? results : [], count: Array.isArray(results) ? results.length : 0 };
      }
      case "getEvidence": {
        const entityId = args.entityId || "";
        const evidence = await prisma.$queryRaw<any>`
          SELECT id, type, source_url as "sourceUrl", repository, commit_sha as "commitSha"
          FROM world_model_evidence
          WHERE entity_id = ${entityId}
          LIMIT 20
        `;
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
