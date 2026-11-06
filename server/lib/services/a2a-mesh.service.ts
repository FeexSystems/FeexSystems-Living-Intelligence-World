/// Enhanced A2A Mesh Service with plugin/connector discovery and agent composition
/// This file has been enhanced to support dynamic plugin and connector agent routing
import { analyticsAgentService } from "./analytics-agent.service";
import { mcpToolRegistry } from "./mcp-tool-registry.service";
import { prisma } from "../database";

const KNOWN_AGENTS: A2AAgentInfo[] = [
  {
    id: "navigator",
    name: "Navigator Agent",
    type: "grounded-qna",
    tier: "OUT_OF_BOX",
    capabilities: ["retrieval", "explanation", "navigation"],
    endpoint: "/api/world-model/navigator",
  },
  {
    id: "analytics-tier1",
    name: "Analytics Agent (Tier 1)",
    type: "analytics",
    tier: "OUT_OF_BOX",
    capabilities: ["query", "evidence", "comparison"],
    endpoint: "/api/ai-agents/agents/t1-active-repos",
  },
  {
    id: "analytics-tier2",
    name: "Analytics Agent (Tier 2)",
    type: "analytics",
    tier: "LOW_CODE",
    capabilities: ["metrics", "dashboards", "rendering"],
    endpoint: "/api/ai-agents/agents/t2-metrics",
  },
  {
    id: "omni",
    name: "Omni Command Agent",
    type: "execution",
    tier: "CUSTOM",
    capabilities: ["orchestration", "execution", "streaming"],
    endpoint: "/api/world-model/omni-command",
  },
];

class A2AMeshService {
  /** Discover all available agents including plugin/provided ones */
  discoverAgents(): A2AAgentDiscovery {
    // Start with known built-in agents
    const customAgents = [...KNOWN_AGENTS];

    // Add agents from registered plugins via MCP tool registry
    const plugins = mcpToolRegistry.getAllPlugins();
    for (const plugin of plugins) {
      // Each plugin capability could map to an agent
      for (const cap of plugin.capabilities) {
        // Check if an agent with this capability already exists
        if (!customAgents.some((a) => a.capabilities.includes(cap))) {
          customAgents.push({
            id: `plugin-${plugin.name}-${cap}`,
            name: `Plugin Agent: ${plugin.name} - ${cap}`,
            type: "plugin",
            tier: "CUSTOM",
            capabilities: [cap],
            endpoint: `/api/mcp/plugins/${plugin.name}/execute`,
          });
        }
      }
    }

    // Add agents from registered connectors via MCP tool registry
    const connectors = mcpToolRegistry.getAllConnectors();
    for (const connector of connectors) {
      for (const cap of connector.capabilities) {
        // Check if an agent with this capability already exists
        if (!customAgents.some((a) => a.capabilities.includes(cap))) {
          customAgents.push({
            id: `connector-${connector.name}-${cap}`,
            name: `Connector Agent: ${connector.name} - ${cap}`,
            type: "connector",
            tier: "CUSTOM",
            capabilities: [cap],
            endpoint: `/api/mcp/connectors/${connector.name}/execute`,
          });
        }
      }
    }

    return { agents: customAgents };
  }

  /** Get agent info by ID, including plugin/provided agents */
  getAgentInfo(agentId: string): A2AAgentInfo | undefined {
    // First check known built-in agents
    const builtInAgent = KNOWN_AGENTS.find((a) => a.id === agentId);
    if (builtInAgent) return builtInAgent;

    // Check plugins
    const plugins = mcpToolRegistry.getAllPlugins();
    for (const plugin of plugins) {
      if (plugin.capabilities.includes(agentId)) {
        return {
          id: `plugin-${plugin.name}-${agentId}`,
          name: `Plugin Agent: ${plugin.name} - ${agentId}`,
          type: "plugin",
          tier: "CUSTOM",
          capabilities: [agentId],
          endpoint: `/api/mcp/plugins/${plugin.name}/execute`,
        };
      }
    }

    // Check connectors
    const connectors = mcpToolRegistry.getAllConnectors();
    for (const connector of connectors) {
      if (connector.capabilities.includes(agentId)) {
        return {
          id: `connector-${connector.name}-${agentId}`,
          name: `Connector Agent: ${connector.name} - ${agentId}`,
          type: "connector",
          tier: "CUSTOM",
          capabilities: [agentId],
          endpoint: `/api/mcp/connectors/${connector.name}/execute`,
        };
      }
    }

    return undefined;
  }

  /** Send message to an agent, supporting plugin/connector routing */
  async sendMessage(request: A2ASendMessageRequest): Promise<A2ASendMessageResponse> {
    // Try to find the target agent
    let targetAgent = KNOWN_AGENTS.find((a) => a.id === request.to);

    // If not found, check plugin agents
    if (!targetAgent) {
      targetAgent = await this.findPluginAgent(request.to);
    }

    // If still not found, check connector agents
    if (!targetAgent) {
      targetAgent = await this.findConnectorAgent(request.to);
    }

    if (!targetAgent) {
      return {
        id: crypto.randomUUID(),
        from: request.from,
        type: "error",
        payload: { error: `Agent ${request.to} not found` },
        timestamp: new Date().toISOString(),
      };
    }

    try {
      let payload: Record<string, any> = { ...request.payload };

      switch (targetAgent.type) {
        case "grounded-qna": {
          const result = await fetch(
            `/api/world-model/navigator?q=${encodeURIComponent(request.payload.query || "")}`
          );
          const data = await result.json();
          payload = { ...payload, response: data };
          break;
        }
        case "analytics": {
          if (request.payload.query) {
            const agent = await analyticsAgentService.getAgentById(targetAgent.id);
            if (agent) {
              const result = await analyticsAgentService.executeQuery({
                agentId: targetAgent.id,
                query: request.payload.query,
                tier: agent.tier,
              });
              payload = { ...payload, response: result.answer, confidence: result.confidence };
            }
          }
          break;
        }
        case "execution": {
          if (request.payload.command) {
            payload = { ...payload, status: "received", command: request.payload.command };
          }
          break;
        }
        case "plugin": {
          // Execute plugin through MCP tool registry
          if (request.payload.toolName && request.payload.arguments) {
            const result = await mcpToolRegistry.invokeTool({
              toolName: request.payload.toolName,
              arguments: request.payload.arguments,
              pluginName: request.payload.pluginName,
              userId: request.from,
            } as any);
            payload = { ...payload, result };
          }
          break;
        }
        case "connector": {
          // Execute connector through MCP tool registry
          if (request.payload.toolName && request.payload.arguments) {
            const result = await mcpToolRegistry.invokeTool({
              toolName: request.payload.toolName,
              arguments: request.payload.arguments,
              connectorName: request.payload.connectorName,
              userId: request.from,
            } as any);
            payload = { ...payload, result };
          }
          break;
        }
      }

      return {
        id: crypto.randomUUID(),
        from: request.from,
        type: request.type === "stream" ? "stream" : "response",
        payload,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        from: request.from,
        type: "error",
        payload: { error: error instanceof Error ? error.message : "Message processing failed" },
        timestamp: new Date().toISOString(),
      };
    }
  }

/** Find a plugin agent by ID */
  private async findPluginAgent(agentId: string): Promise<A2AAgentInfo | undefined> {
    const plugins = mcpToolRegistry.getAllPlugins();
    for (const plugin of plugins) {
      // Check if the agent ID matches a plugin capability
      if (plugin.capabilities.includes(agentId)) {
        return {
          id: `plugin-${plugin.name}-${agentId}`,
          name: `Plugin Agent: ${plugin.name} - ${agentId}`,
          type: "plugin",
          tier: "CUSTOM",
          capabilities: [agentId],
          endpoint: `/api/mcp/plugins/${plugin.name}/execute`,
        };
      }
    }
    return undefined;
  }

  /** Find a connector agent by ID */
  private async findConnectorAgent(agentId: string): Promise<A2AAgentInfo | undefined> {
    const connectors = mcpToolRegistry.getAllConnectors();
    for (const connector of connectors) {
      // Check if the agent ID matches a connector capability
      if (connector.capabilities.includes(agentId)) {
        return {
          id: `connector-${connector.name}-${agentId}`,
          name: `Connector Agent: ${connector.name} - ${agentId}`,
          type: "connector",
          tier: "CUSTOM",
          capabilities: [agentId],
          endpoint: `/api/mcp/connectors/${connector.name}/execute`,
        };
      }
    }
    return undefined;
  }
}

export const a2aMesh = new A2AMeshService();
