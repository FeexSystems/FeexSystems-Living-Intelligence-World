
import { analyticsAgentService } from "./analytics-agent.service";



const KNOWN_AGENTS = [
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
  discoverAgents() {
    const customAgents = KNOWN_AGENTS;
    return { agents: customAgents };
  }

  getAgentInfo(agentId) {
    return KNOWN_AGENTS.find((a) => a.id === agentId);
  }

  async sendMessage(request) {
    const targetAgent = KNOWN_AGENTS.find((a) => a.id === request.to);

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
      let payload = { ...request.payload };

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
}

export const a2aMesh = new A2AMeshService();
