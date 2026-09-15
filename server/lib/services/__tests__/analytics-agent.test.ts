import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { analyticsAgentService } from "../analytics-agent.service";
import { agentObservabilityService } from "../agent-observability.service";

describe("AnalyticsAgentService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("listAgents", () => {
    it("should return OUT_OF_BOX agents by default", async () => {
      const agents = await analyticsAgentService.listAgents();
      expect(agents.length).toBeGreaterThan(0);
      expect(agents.every((a) => a.tier === "OUT_OF_BOX")).toBe(true);
    });

    it("should filter by tier", async () => {
      const agents = await analyticsAgentService.listAgents("OUT_OF_BOX");
      expect(agents.length).toBeGreaterThan(0);
      expect(agents.every((a) => a.tier === "OUT_OF_BOX")).toBe(true);
    });
  });

  describe("getAgentById", () => {
    it("should return a Tier 1 agent for known IDs", async () => {
      const agent = await analyticsAgentService.getAgentById("t1-active-repos");
      expect(agent).not.toBeNull();
      expect(agent!.name).toContain("Active");
      expect(agent!.tier).toBe("OUT_OF_BOX");
    });

    it("should return null for unknown IDs", async () => {
      const agent = await analyticsAgentService.getAgentById("nonexistent");
      expect(agent).toBeNull();
    });
  });

  describe("executeQuery", () => {
    it("should return a response with evidence anchors", async () => {
      const result = await analyticsAgentService.executeQuery({
        query: "active repositories",
        tier: "OUT_OF_BOX",
      });
      expect(result.query).toBe("active repositories");
      expect(typeof result.answer).toBe("string");
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.evidenceAnchors)).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should return lower confidence when no evidence found", async () => {
      const result = await analyticsAgentService.executeQuery({
        query: "completely unique query that matches nothing xyz123",
        tier: "OUT_OF_BOX",
      });
      expect(result.confidence).toBeLessThan(0.9);
    });
  });

  describe("createAgent", () => {
    it("should create an agent with defaults", async () => {
      const agent = await analyticsAgentService.createAgent({
        name: "Test Agent",
        tier: "CUSTOM",
      });
      expect(agent.name).toBe("Test Agent");
      expect(agent.tier).toBe("CUSTOM");
      expect(agent.mcpTools).toEqual(["query_world_model", "get_evidence"]);
      expect(agent.ownerId).toBeNull();
      expect(agent.id).toBeDefined();
    });
  });
});

describe("AgentObservabilityService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("logInteraction", () => {
    it("should log without error", async () => {
      await expect(
        agentObservabilityService.logInteraction({
          agentId: "test-agent",
          agentName: "Test Agent",
          prompt: "test query",
          response: "test response",
          provider: "gemini",
          evidenceUsed: ["evidence-1"],
          mcpToolsCalled: [],
          a2aMessages: [],
        })
      ).resolves.not.toThrow();
    });

    it("should buffer interactions", async () => {
      for (let i = 0; i < 5; i++) {
        await agentObservabilityService.logInteraction({
          agentId: `agent-${i}`,
          agentName: `Agent ${i}`,
          prompt: `query ${i}`,
          response: `response ${i}`,
          provider: "gemini",
          evidenceUsed: [],
          mcpToolsCalled: [],
          a2aMessages: [],
        });
      }
      // Should not throw
    });
  });

  describe("evaluateInteraction", () => {
    it("should return quality scores", async () => {
      const scores = await agentObservabilityService.evaluateInteraction(
        "test-interaction",
        "test-agent",
        "What are the active repositories?",
        "The most active repositories are...",
        ["project-1", "project-2"]
      );
      expect(scores.accuracy).toBeGreaterThanOrEqual(0);
      expect(scores.accuracy).toBeLessThanOrEqual(1);
      expect(scores.completeness).toBeGreaterThanOrEqual(0);
      expect(scores.completeness).toBeLessThanOrEqual(1);
      expect(scores.helpfulness).toBeGreaterThanOrEqual(0);
      expect(scores.helpfulness).toBeLessThanOrEqual(1);
      expect(scores.overall).toBeGreaterThanOrEqual(0);
      expect(scores.overall).toBeLessThanOrEqual(1);
    });

    it("should give higher accuracy when evidence is present", async () => {
      const withEvidence = await agentObservabilityService.evaluateInteraction(
        "i1",
        "a1",
        "test",
        "test",
        ["e1", "e2", "e3"]
      );
      const withoutEvidence = await agentObservabilityService.evaluateInteraction(
        "i2",
        "a1",
        "test",
        "test",
        []
      );
      expect(withEvidence.accuracy).toBeGreaterThan(withoutEvidence.accuracy);
    });
  });

  describe("getDashboardData", () => {
    it("should return dashboard data structure", async () => {
      const data = await agentObservabilityService.getDashboardData();
      expect(data).toHaveProperty("totalInteractions");
      expect(data).toHaveProperty("avgConfidence");
      expect(data).toHaveProperty("avgQualityScore");
      expect(data).toHaveProperty("avgLatencyMs");
      expect(data).toHaveProperty("recentInteractions");
      expect(Array.isArray(data.recentInteractions)).toBe(true);
    });
  });
});
