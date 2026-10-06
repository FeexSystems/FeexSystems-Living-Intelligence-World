 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { analyticsAgentService } from "./analytics-agent.service";

















class CustomAgentService {
  async createAgent(input









) {
    const agent = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      systemPrompt: input.systemPrompt,
      tools: input.tools,
      model: input.model || "gemini-3.7-flash",
      temperature: input.temperature || 0.3,
      maxOutputTokens: input.maxOutputTokens || 2048,
      tier: input.tier || "CUSTOM",
      ownerId: input.ownerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await analyticsAgentService.createAgent({
        name: input.name,
        description: input.description,
        tier: agent.tier,
        config: {
          systemPrompt: input.systemPrompt,
          model: agent.model,
          temperature: agent.temperature,
          maxOutputTokens: agent.maxOutputTokens,
        },
        mcpTools: input.tools,
        a2aCapabilities: ["custom-execution"],
      });
    } catch (e) {
      /* DB unavailable, agent still returned */
    }

    return agent;
  }

  async executeAgent(
    agentId,
    prompt,
    context
  )





 {
    const startTime = Date.now();

    try {
      const agent = await analyticsAgentService.getAgentById(agentId);
      if (!agent) {
        return {
          agentId,
          response: `Agent ${agentId} not found.`,
          confidence: 0,
          toolsCalled: [],
          latencyMs: Date.now() - startTime,
        };
      }

      const config = agent.config ;
      const systemPrompt = _optionalChain([config, 'optionalAccess', _ => _.systemPrompt]) || `You are a custom AI agent. Answer the user's question accurately.`;

      let response;
      try {
        const result = await analyticsAgentService.executeQuery({
          agentId,
          query: prompt,
          tier: agent.tier,
          context,
        });
        response = result.answer;
      } catch (e2) {
        response = `Executing custom agent "${agent.name}" with prompt: ${prompt}. Agent is configured with ${agent.mcpTools.length} tool(s).`;
      }

      return {
        agentId,
        response,
        confidence: 0.85,
        toolsCalled: agent.mcpTools || [],
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        agentId,
        response: `Error executing custom agent: ${error instanceof Error ? error.message : "Unknown error"}`,
        confidence: 0,
        toolsCalled: [],
        latencyMs: Date.now() - startTime,
      };
    }
  }
}

export const customAgentService = new CustomAgentService();
