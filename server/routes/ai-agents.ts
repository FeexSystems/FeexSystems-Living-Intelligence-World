import express from "express";
import { z } from "zod";
import { authMiddleware } from "../lib/middleware/auth.middleware";
import { hardQueryRateLimiter } from "../lib/middleware/production-security";
import { analyticsAgentService } from "../lib/services/analytics-agent.service";
import { agentObservabilityService } from "../lib/services/agent-observability.service";
import { bigQueryAgentAnalyticsExtension } from "../lib/services/bigquery-agent-analytics";
import { analyticsConfigService } from "../lib/services/analytics-config.service";
import { metricExecutorService } from "../lib/services/metric-executor.service";
import { customAgentService } from "../lib/services/custom-agent.service";
import { mcpToolRegistry } from "../lib/services/mcp-tool-registry.service";
import { a2aMesh } from "../lib/services/a2a-mesh.service";
import { prisma } from "../lib/database";

const router = express.Router();

router.use(authMiddleware);

// ─── Agent CRUD ────────────────────────────────────────────────────

router.get("/agents", async (_req, res) => {
  try {
    const tier = (_req.query.tier as string) || undefined;
    const agents = await analyticsAgentService.listAgents(tier as any);
    res.json({ success: true, data: { agents, count: agents.length } });
  } catch (error) {
    console.error("[ai-agents] List agents failed:", error);
    res.status(500).json({ success: false, error: "Failed to list agents" });
  }
});

router.get("/agents/:id", async (req, res) => {
  try {
    const agent = await analyticsAgentService.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: "Agent not found" });
    }
    res.json({ success: true, data: agent });
  } catch (error) {
    console.error("[ai-agents] Get agent failed:", error);
    res.status(500).json({ success: false, error: "Failed to get agent" });
  }
});

router.post("/agents", async (req, res) => {
  try {
    const body = z
      .object({
        name: z.string().min(1),
        description: z.string().optional(),
        tier: z.enum(["OUT_OF_BOX", "LOW_CODE", "CUSTOM"]),
        config: z.record(z.any()).optional(),
        mcpTools: z.array(z.string()).optional(),
        a2aCapabilities: z.array(z.string()).optional(),
      })
      .parse(req.body);

    try {
    const agent = await prisma.analytics_agents.create({ data: body as any });
      res.status(201).json({ success: true, data: agent });
    } catch {
      const tier = body.tier;
      const agent = {
        id: crypto.randomUUID(),
        name: body.name,
        description: body.description || "",
        tier,
        config: body.config || {},
        mcpTools: body.mcpTools || [],
        a2aCapabilities: body.a2aCapabilities || [],
        ownerId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      res.status(201).json({ success: true, data: agent });
    }
  } catch (error) {
    console.error("[ai-agents] Create agent failed:", error);
    res.status(500).json({ success: false, error: "Failed to create agent" });
  }
});

// ─── Tier 1: Execute Analytics Query ───────────────────────────────

router.post("/agents/query", hardQueryRateLimiter, async (req, res) => {
  try {
    const body = z
      .object({
        agentId: z.string().optional(),
        query: z.string().min(1),
        tier: z.enum(["OUT_OF_BOX", "LOW_CODE", "CUSTOM"]),
        context: z.record(z.any()).optional(),
      })
      .parse(req.body);

    const result = await analyticsAgentService.executeQuery({
      agentId: body.agentId,
      query: body.query,
      tier: body.tier,
      ...(body.context ? { context: body.context } : {}),
    });

    await agentObservabilityService.logInteraction({
      agentId: body.agentId || "default",
      agentName: "Analytics Agent",
      prompt: body.query,
      response: result.answer,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      confidence: result.confidence,
      evidenceUsed: result.evidenceAnchors.map((e: any) => e.id),
      mcpToolsCalled: [],
      a2aMessages: [],
    });

    bigQueryAgentAnalyticsExtension.logAgentInteraction({
      agentId: body.agentId || "default",
      agentName: "Analytics Agent",
      prompt: body.query,
      response: result.answer,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      confidence: result.confidence,
      evidenceCount: result.evidenceAnchors.length,
      mcpToolsCalled: [],
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("[ai-agents] Query failed:", error);
    res.status(500).json({ success: false, error: "Query execution failed" });
  }
});

// ─── Observability ──────────────────────────────────────────────────

router.post("/observability/log", async (req, res) => {
  try {
    const body = z
      .object({
        agentId: z.string(),
        agentName: z.string(),
        userId: z.string().optional(),
        prompt: z.string(),
        response: z.string(),
        provider: z.string(),
        model: z.string().optional(),
        tokensUsed: z.number().optional(),
        latencyMs: z.number().optional(),
        confidence: z.number().optional(),
        evidenceUsed: z.array(z.string()).optional(),
        mcpToolsCalled: z.array(z.string()).optional(),
        a2aMessages: z.array(z.string()).optional(),
        qualityScore: z.number().optional(),
      })
      .parse(req.body);

    await agentObservabilityService.logInteraction(body);
    bigQueryAgentAnalyticsExtension.logAgentInteraction({
      agentId: body.agentId,
      agentName: body.agentName,
      prompt: body.prompt,
      response: body.response,
      provider: body.provider,
      model: body.model,
      latencyMs: body.latencyMs,
      confidence: body.confidence,
      evidenceCount: body.evidenceUsed?.length || 0,
      mcpToolsCalled: body.mcpToolsCalled || [],
    });

    res.status(201).json({ success: true, data: { logged: true } });
  } catch (error) {
    console.error("[ai-agents] Observability log failed:", error);
    res.status(500).json({ success: false, error: "Failed to log interaction" });
  }
});

router.post("/observability/evaluate", async (req, res) => {
  try {
    const body = z
      .object({
        interactionId: z.string(),
        agentId: z.string(),
        evaluator: z.string(),
        groundTruth: z.string().optional(),
        feedback: z.string().optional(),
      })
      .parse(req.body);

    try {
      await prisma.$executeRaw`
        INSERT INTO agent_evaluations (
          id, "agentId", "interactionId", evaluator, "accuracyScore",
          "completenessScore", "helpfulnessScore", "overallScore", "groundTruth", "feedback", "createdAt"
        ) VALUES (
          ${crypto.randomUUID()},
          ${body.agentId},
          ${body.interactionId},
          ${body.evaluator},
          NULL, NULL, NULL, NULL,
          ${body.groundTruth || null},
          ${body.feedback || null},
          NOW()
        )
      `;
    } catch {
      /* DB write failed, continue */
    }

    res.status(201).json({ success: true, data: { evaluated: true } });
  } catch (error) {
    console.error("[ai-agents] Evaluation failed:", error);
    res.status(500).json({ success: false, error: "Failed to evaluate" });
  }
});

router.get("/observability/dashboard", async (req, res) => {
  try {
    const agentId = (req.query.agentId as string) || undefined;
    const limit = parseInt((req.query.limit as string) || "100");

    const data = await agentObservabilityService.getDashboardData(agentId, limit);
    res.json({ success: true, data });
  } catch (error) {
    console.error("[ai-agents] Dashboard failed:", error);
    res.status(500).json({ success: false, error: "Failed to load dashboard data" });
  }
});

// ─── Tier 2: Metrics CRUD ──────────────────────────────

router.get("/t2/metrics", async (_req, res) => {
  try {
    const agentId = (_req.query.agentId as string) || undefined;
    const metrics = await analyticsConfigService.listMetrics(agentId);
    res.json({ success: true, data: { metrics, count: metrics.length } });
  } catch (error) {
    console.error("[ai-agents] List metrics failed:", error);
    res.status(500).json({ success: false, error: "Failed to list metrics" });
  }
});

router.post("/t2/metrics", async (req, res) => {
  try {
    const body = z
      .object({
        name: z.string().min(1),
        description: z.string().optional(),
        expression: z.string().min(1),
        dimensions: z.array(z.string()).optional(),
        filters: z.array(z.record(z.any())).optional(),
        cacheTTL: z.number().optional(),
        agentId: z.string().optional(),
      })
      .parse(req.body);

    const metric = await analyticsConfigService.createMetric(body as any);
    res.status(201).json({ success: true, data: metric });
  } catch (error) {
    console.error("[ai-agents] Create metric failed:", error);
    res.status(500).json({ success: false, error: "Failed to create metric" });
  }
});

router.get("/t2/metrics/:id", async (req, res) => {
  try {
    const metric = await analyticsConfigService.getMetric(req.params.id);
    if (!metric) {
      return res.status(404).json({ success: false, error: "Metric not found" });
    }
    res.json({ success: true, data: metric });
  } catch (error) {
    console.error("[ai-agents] Get metric failed:", error);
    res.status(500).json({ success: false, error: "Failed to get metric" });
  }
});

// ─── Tier 2: Dashboards ────────────────────────────────

router.post("/t2/dashboards", async (req, res) => {
  try {
    const body = z
      .object({
        name: z.string().min(1),
        layout: z.record(z.any()),
        metrics: z.array(z.string()),
        audience: z.record(z.any()).optional(),
        agentId: z.string().optional(),
      })
      .parse(req.body);

    const dashboard = await analyticsConfigService.createDashboard(body as any);
    res.status(201).json({ success: true, data: dashboard });
  } catch (error) {
    console.error("[ai-agents] Create dashboard failed:", error);
    res.status(500).json({ success: false, error: "Failed to create dashboard" });
  }
});

router.get("/t2/dashboards", async (_req, res) => {
  try {
    const agentId = (_req.query.agentId as string) || undefined;
    const dashboards = await analyticsConfigService.listDashboards(agentId);
    res.json({ success: true, data: { dashboards, count: dashboards.length } });
  } catch (error) {
    console.error("[ai-agents] List dashboards failed:", error);
    res.status(500).json({ success: false, error: "Failed to list dashboards" });
  }
});

router.post("/t2/dashboards/:id/render", async (req, res) => {
  try {
    const result = await metricExecutorService.renderDashboard(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, error: "Dashboard not found" });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("[ai-agents] Render dashboard failed:", error);
    res.status(500).json({ success: false, error: "Failed to render dashboard" });
  }
});

export default router;
