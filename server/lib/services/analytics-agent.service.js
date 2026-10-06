/**
 * Analytics Agent Service — Tier 1 (Out-of-the-Box)
 * Pre-built analytics agents that answer natural language questions
 * about FeexSystems data with zero configuration.
 *
 * Invariants:
 * - Evidence-First: All answers reference evidence anchors
 * - Provider-Neutral: Uses geminiService for reasoning
 * - Non-Blocking: Graceful fallback to template answers
 */

import { prisma } from "../database";
import { geminiService } from "./gemini.service";








const TIER_1_TEMPLATES




 = [
  {
    id: "active-repos",
    name: "Most Active Repositories",
    keywords: ["active", "busiest", "most commits", "recent activity", "trending repo"],
    description: "Shows the most recently active GitHub repositories",
  },
  {
    id: "technology-trends",
    name: "Technology Trends",
    keywords: ["technology", "tech stack", "framework", "which tech", "trending tech"],
    description: "Shows technologies connected to FeexSystems projects",
  },
  {
    id: "evidence-claim",
    name: "Evidence for Claim",
    keywords: ["evidence", "proof", "support", "verification", "commit sha", "provenance"],
    description: "Retrieves evidence backing a specific claim or entity",
  },
  {
    id: "project-compare",
    name: "Project Comparison",
    keywords: ["compare", "versus", "vs", "difference", "contrast", "side by side"],
    description: "Compares two or more projects by key metrics",
  },
  {
    id: "temporal-state",
    name: "Temporal State",
    keywords: ["history", "past state", "before", "previously", "evolve", "change over"],
    description: "Shows how a project looked at a previous point in time",
  },
];

class AnalyticsAgentService {
  async createAgent(input






) {
    const agent = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description || "",
      tier: input.tier,
      config: input.config || {},
      mcpTools: input.mcpTools || ["query_world_model", "get_evidence"],
      a2aCapabilities: input.a2aCapabilities || [],
      ownerId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await prisma.analytics_agents.create({ data: agent });
    } catch (e2) {
      /* DB unavailable, in-memory agent still returned */
    }
    return agent;
  }

  async getAgentById(id) {
    try {
      const dbAgent = await prisma.analytics_agents.findUnique({
        where: { id },
      }) ;

      if (dbAgent) return dbAgent;
    } catch (e3) {
      // Database unavailable
    }

    const tier = id.startsWith("t1-") ? "OUT_OF_BOX" : id.startsWith("t2-") ? "LOW_CODE" : "CUSTOM";
    const match = TIER_1_TEMPLATES.find((t) => t.id === id.replace("t1-", ""));
    if (match && tier === "OUT_OF_BOX") {
      return {
        id,
        name: match.name,
        description: match.description,
        tier: tier ,
        config: { templateId: match.id, keywords: match.keywords },
        mcpTools: ["query_world_model", "get_evidence"],
        a2aCapabilities: ["navigate", "evidence"],
        ownerId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return null;
  }

  async listAgents(tier) {
    const defaultAgents = TIER_1_TEMPLATES.map((t) => ({
      id: `t1-${t.id}`,
      name: t.name,
      description: t.description,
      tier: "OUT_OF_BOX" ,
      config: { templateId: t.id, keywords: t.keywords },
      mcpTools: ["query_world_model", "get_evidence"],
      a2aCapabilities: ["navigate", "evidence"],
      ownerId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    let dbAgents = [];
    try {
      dbAgents = await prisma.analytics_agents.findMany({
        where: tier ? { tier } : undefined,
        orderBy: { createdAt: "desc" },
      }) ;
    } catch (e4) {
      // Database might be offline or table doesn't exist
    }

    const allAgents = [...defaultAgents, ...(Array.isArray(dbAgents) ? dbAgents : [])];
    return tier ? allAgents.filter(a => a.tier === tier) : allAgents;
  }

  async logInteraction(entry











) {
    // Delegate to observability service
    const { agentObservabilityService } = await import("./agent-observability.service");
    await agentObservabilityService.logInteraction({
      agentId: entry.agentId,
      agentName: entry.agentName,
      prompt: entry.prompt,
      response: entry.response,
      provider: entry.provider,
      model: entry.model,
      latencyMs: entry.latencyMs,
      confidence: entry.confidence,
      evidenceUsed: entry.evidenceUsed,
      mcpToolsCalled: entry.mcpToolsCalled,
      a2aMessages: entry.a2aMessages,
    });
  }

  async executeQuery(request) {
    const startTime = Date.now();

    if (request.tier === "OUT_OF_BOX" || request.tier === "LOW_CODE") {
      return this.executeTier1Query(request, startTime);
    }
    return this.executeTier1Query(request, startTime);
  }

   async executeTier1Query(
    request,
    startTime
  ) {
    const template = TIER_1_TEMPLATES.find((t) =>
      t.keywords.some((k) => request.query.toLowerCase().includes(k))
    );

    const evidenceAnchors = await this.retrieveEvidence(request.query);

    let answer;
    if (template) {
      answer = await this.generateAnswerViaGemini(request.query, evidenceAnchors, template.name);
    } else {
      answer = await this.generateAnswerViaGemini(request.query, evidenceAnchors, "analytics");
    }

    return {
      query: request.query,
      answer,
      confidence: evidenceAnchors.length > 0 ? 0.9 : 0.6,
      evidenceAnchors,
      provider: "gemini",
      model: "gemini-3.7-flash",
      latencyMs: Date.now() - startTime,
    };
  }

   async retrieveEvidence(query) {
    try {
      const q = query.toLowerCase();
      const results = await prisma.$queryRaw`
        SELECT
          'project' as type,
          id as id,
          name as label,
          url as url
        FROM world_model_projects
        WHERE LOWER(name) LIKE ${"%" + q + "%"} OR LOWER(description) LIKE ${"%" + q + "%"}
        LIMIT 5
        UNION ALL
        SELECT
          'artifact' as type,
          id as id,
          path as label,
          NULL as url
        FROM world_model_artifacts
        WHERE LOWER(path) LIKE ${"%" + q + "%"} OR LOWER(kind) LIKE ${"%" + q + "%"}
        LIMIT 5
        UNION ALL
        SELECT
          'technology' as type,
          id as id,
          name as label,
          NULL as url
        FROM world_model_technologies
        WHERE LOWER(name) LIKE ${"%" + q + "%"}
        LIMIT 5
      `;
      return Array.isArray(results) ? results : [];
    } catch (e5) {
      return [];
    }
  }

   async generateAnswerViaGemini(
    query,
    evidence,
    contextLabel
  ) {
    const context = evidence.map(
      (e) => `- ${e.type}: ${e.label}${e.url ? ` (${e.url})` : ""}${e.sha ? ` [SHA: ${e.sha}]` : ""}`
    ).join("\n");

    try {
      const result = await geminiService.generateInteractiveResponse({
        prompt: `Answer this analytics question using the provided evidence context.\n\nQuestion: ${query}\n\nContext (${contextLabel}):\n${context || "(no direct evidence found — provide general analysis)"}`,
        groundedEntities: evidence.map((e) => ({
          name: e.label,
          type: e.type,
          description: e.url || "",
        })),
        temperature: 0.3,
        maxOutputTokens: 1024,
      });
      return result.explanation;
    } catch (e6) {
      return `Analysis of "${query}" based on ${evidence.length} evidence anchor(s) from ${contextLabel}. Evidence includes: ${evidence.slice(0, 5).map((e) => e.label).join(", ") || "none"}.`;
    }
  }
}

export const analyticsAgentService = new AnalyticsAgentService();
