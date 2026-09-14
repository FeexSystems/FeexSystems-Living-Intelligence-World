 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { Router } from "express";
import {
  getAllProjectsEvidenceSummary,
  getArtifactContent,
  getPinnedWorldModelProjects,
  getProjectEvidence,
  getWorldModelGraph,
  processWebhook,
  retrieveWorld,
  syncPinnedProjects,
  verifyGitHubSignature,
} from "../lib/services/github-pinned.service";
import { retrieveWorldHybrid } from "../lib/services/hybrid-retrieval.service";
import { reindexWorldModelEmbeddings, ensureEmbeddingTables } from "../lib/services/embedding.service";
import {
  reconstructProjectState,
  listProjectEvents,
} from "../lib/services/temporal-reconstruction.service";
import {
  provisionWebhooksForWorldModel,
  createOrUpdateWorldModelWebhook,
  listRepoWebhooks,
  getConfiguredWebhookUrl,
} from "../lib/services/webhook-provisioning.service";
import {
  runWorldModelMaintenance,
  getLastMaintenanceReport,
  isMaintenanceRunning,
} from "../lib/services/world-model-maintenance.service";
import { hardQueryRateLimiter } from "../lib/middleware/production-security";
import { geminiService } from "../lib/services/gemini.service";
import {
  generateGroundedAnswer,
  getLlmProviderStatus,
} from "../lib/services/llm-grounded.service";

const router = Router();



router.get("/projects", async (_req, res) => {
  try {
    const projects = await getPinnedWorldModelProjects();
    res.json({
      success: true,
      source: "world-model",
      projects,
      count: Array.isArray(projects) ? projects.length : 0,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "World Model query failed",
    });
  }
});

router.get("/graph", async (_req, res) => {
  try {
    const graph = await getWorldModelGraph();
    res.json({ success: true, source: "world-model-graph", data: graph });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "World Model graph query failed",
    });
  }
});

router.get("/evidence/projects", hardQueryRateLimiter, async (_req, res) => {
  try {
    const projects = await getAllProjectsEvidenceSummary();
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Evidence projects query failed",
    });
  }
});

router.get(["/evidence/content", "/evidence/:projectId/content"], hardQueryRateLimiter, async (req, res) => {
  try {
    const projectId = decodeURIComponent(String(req.query.projectId || req.params.projectId || "")).trim();
    const filePath = String(req.query.path || "").trim();
    if (!projectId || !filePath) {
      return res.status(400).json({ success: false, error: "Project ID and file path query are required" });
    }
    const result = await getArtifactContent(projectId, filePath);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Artifact content fetch failed",
    });
  }
});

router.get(["/evidence/detail", "/evidence/:projectId"], hardQueryRateLimiter, async (req, res) => {
  try {
    const projectId = decodeURIComponent(String(req.query.projectId || req.params.projectId || "")).trim();
    if (!projectId) {
      return res.status(400).json({ success: false, error: "Project ID is required" });
    }
    const evidence = await getProjectEvidence(projectId);
    res.json({ success: true, data: evidence });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Evidence retrieval failed",
    });
  }
});

/** Temporal reconstruction — state at commit or date */
router.get("/temporal/:projectId", async (req, res) => {
  try {
    const projectId = decodeURIComponent(String(req.params.projectId || "")).trim();
    if (!projectId) {
      return res.status(400).json({ success: false, error: "projectId is required" });
    }
    const snapshot = await reconstructProjectState({
      projectId,
      at: req.query.at ? String(req.query.at) : undefined,
      commitSha: req.query.commit ? String(req.query.commit) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    });
    res.json({ success: true, data: snapshot });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Temporal reconstruction failed",
    });
  }
});

router.get("/temporal/:projectId/events", async (req, res) => {
  try {
    const projectId = decodeURIComponent(String(req.params.projectId || "")).trim();
    const events = await listProjectEvents(projectId, req.query.limit ? Number(req.query.limit) : 50);
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Event listing failed",
    });
  }
});

router.get("/navigator", hardQueryRateLimiter, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) {
      return res.status(400).json({ success: false, error: "Query parameter 'q' is required" });
    }
    const hybrid = String(req.query.hybrid || "true") !== "false";
    const result = hybrid ? await retrieveWorldHybrid(q) : await retrieveWorld(q);

    // Deep interactive reasoning with Gemini Interactions API (gemini-3.7-flash)
    try {
      const interactive = await geminiService.generateInteractiveResponse({
        prompt: q,
        groundedEntities: (result.projects || []).map((p) => ({
          name: p.name,
          type: "project",
          description: p.description,
          repository: p.repository,
        })),
        technologies: result.technologies,
        artifacts: result.artifacts,
      });

      if (interactive.explanation) {
        result.explanation = interactive.explanation;
      }
      (result ).suggestions = interactive.suggestions;
      (result ).aiModel = interactive.model;
      (result ).aiMode = interactive.mode;
    } catch (aiErr) {
      console.warn("[Navigator GET] Gemini reasoning fallback:", aiErr);
    }

    // Grounded-answer layer — attaches standardized llm metadata block
    try {
      const grounded = await generateGroundedAnswer({
        query: q,
        explanation: result.explanation,
        projects: result.projects,
        technologies: result.technologies,
        artifacts: result.artifacts,
        ranking: (result ).ranking,
      });
      // Use grounded prose only if Interactions API didn't already set a rich explanation
      if (!result.explanation || grounded.provider !== "none") {
        result.explanation = grounded.text;
      }
      (result ).llm = {
        provider: grounded.provider,
        model: grounded.model,
        usedFallback: grounded.usedFallback,
        suggestions: grounded.suggestions,
      };
      // Prefer grounded suggestions if navigator didn't already have them
      if (!_optionalChain([(result ), 'access', _ => _.suggestions, 'optionalAccess', _2 => _2.length])) {
        (result ).suggestions = grounded.suggestions;
      }
    } catch (groundedErr) {
      console.warn("[Navigator GET] Grounded answer fallback:", groundedErr);
      (result ).llm = { provider: "none", usedFallback: true, suggestions: [] };
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Navigator retrieval failed",
    });
  }
});

router.post("/navigator", hardQueryRateLimiter, async (req, res) => {
  try {
    const q = String(_optionalChain([req, 'access', _3 => _3.body, 'optionalAccess', _4 => _4.query]) || _optionalChain([req, 'access', _5 => _5.body, 'optionalAccess', _6 => _6.q]) || "").trim();
    if (!q) {
      return res.status(400).json({ success: false, error: "Body field 'query' is required" });
    }
    const hybrid = _optionalChain([req, 'access', _7 => _7.body, 'optionalAccess', _8 => _8.hybrid]) !== false;
    const result = hybrid ? await retrieveWorldHybrid(q) : await retrieveWorld(q);
    const history = Array.isArray(_optionalChain([req, 'access', _9 => _9.body, 'optionalAccess', _10 => _10.history])) ? req.body.history : undefined;

    // Deep interactive reasoning with Gemini Interactions API & multi-turn history
    try {
      const interactive = await geminiService.generateInteractiveResponse({
        prompt: q,
        history,
        groundedEntities: (result.projects || []).map((p) => ({
          name: p.name,
          type: "project",
          description: p.description,
          repository: p.repository,
        })),
        technologies: result.technologies,
        artifacts: result.artifacts,
      });

      if (interactive.explanation) {
        result.explanation = interactive.explanation;
      }
      (result ).suggestions = interactive.suggestions;
      (result ).aiModel = interactive.model;
      (result ).aiMode = interactive.mode;
    } catch (aiErr) {
      console.warn("[Navigator POST] Gemini reasoning fallback:", aiErr);
    }

    // Grounded-answer layer — attaches standardized llm metadata block
    try {
      const grounded = await generateGroundedAnswer({
        query: q,
        explanation: result.explanation,
        projects: result.projects,
        technologies: result.technologies,
        artifacts: result.artifacts,
        ranking: (result ).ranking,
      });
      if (!result.explanation || grounded.provider !== "none") {
        result.explanation = grounded.text;
      }
      (result ).llm = {
        provider: grounded.provider,
        model: grounded.model,
        usedFallback: grounded.usedFallback,
        suggestions: grounded.suggestions,
      };
      if (!_optionalChain([(result ), 'access', _11 => _11.suggestions, 'optionalAccess', _12 => _12.length])) {
        (result ).suggestions = grounded.suggestions;
      }
    } catch (groundedErr) {
      console.warn("[Navigator POST] Grounded answer fallback:", groundedErr);
      (result ).llm = { provider: "none", usedFallback: true, suggestions: [] };
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Navigator retrieval failed",
    });
  }
});

/**
 * GET /api/world-model/providers/status
 * Public (no auth) — returns which LLM providers are configured.
 * Used by Bushfeexer and Omni to show honest UI warnings.
 */
router.get("/providers/status", async (_req, res) => {
  try {
    const status = await getLlmProviderStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Provider status check failed",
    });
  }
});

router.post("/sync/github-pinned", async (_req, res) => {
  try {
    const projects = await syncPinnedProjects();
    let embeddings = null;
    try {
      embeddings = await reindexWorldModelEmbeddings();
    } catch (e) {
      embeddings = { skipped: true };
    }
    res.json({
      success: true,
      source: "github-profile-pinned",
      synchronizedAt: new Date().toISOString(),
      projects,
      count: projects.length,
      embeddings,
    });
  } catch (error) {
    console.error("GitHub pinned World Model sync failed:", error);
    res.status(502).json({
      success: false,
      error: error instanceof Error ? error.message : "GitHub synchronization failed",
    });
  }
});

router.post("/embeddings/reindex", async (_req, res) => {
  try {
    await ensureEmbeddingTables();
    const result = await reindexWorldModelEmbeddings();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Embedding reindex failed",
    });
  }
});

/** Provision GitHub webhooks for World Model repos */
router.post("/webhooks/provision", async (req, res) => {
  try {
    const pinnedOnly = _optionalChain([req, 'access', _13 => _13.body, 'optionalAccess', _14 => _14.pinnedOnly]) !== false;
    const result = await provisionWebhooksForWorldModel({ pinnedOnly });
    res.json({
      success: true,
      callbackUrl: getConfiguredWebhookUrl(),
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Webhook provisioning failed",
    });
  }
});

router.post("/webhooks/provision/:owner/:repo", async (req, res) => {
  try {
    const fullName = `${req.params.owner}/${req.params.repo}`;
    const result = await createOrUpdateWorldModelWebhook(fullName);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Webhook provisioning failed",
    });
  }
});

router.get("/webhooks/:owner/:repo", async (req, res) => {
  try {
    const fullName = `${req.params.owner}/${req.params.repo}`;
    const hooks = await listRepoWebhooks(fullName);
    res.json({ success: true, data: hooks });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "List webhooks failed",
    });
  }
});

/** Autonomous maintenance */
router.post("/maintenance/run", async (req, res) => {
  try {
    const report = await runWorldModelMaintenance({
      skipSync: Boolean(_optionalChain([req, 'access', _15 => _15.body, 'optionalAccess', _16 => _16.skipSync])),
      skipEmbed: Boolean(_optionalChain([req, 'access', _17 => _17.body, 'optionalAccess', _18 => _18.skipEmbed])),
      eventRetentionDays: _optionalChain([req, 'access', _19 => _19.body, 'optionalAccess', _20 => _20.eventRetentionDays])
        ? Number(req.body.eventRetentionDays)
        : undefined,
    });
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Maintenance failed",
    });
  }
});

router.get("/maintenance/status", async (_req, res) => {
  res.json({
    success: true,
    data: {
      running: isMaintenanceRunning(),
      lastRun: getLastMaintenanceReport(),
    },
  });
});

router.post("/webhook", async (req, res) => {
  const raw = _optionalChain([req, 'access', _21 => _21.rawBody, 'optionalAccess', _22 => _22.toString, 'call', _23 => _23("utf8")]) || JSON.stringify(req.body);
  if (!verifyGitHubSignature(raw, req.header("x-hub-signature-256"))) {
    return res.status(401).json({ success: false, error: "Invalid GitHub webhook signature" });
  }
  try {
    const payload = req.body;
    if (
      payload.ref &&
      _optionalChain([payload, 'access', _24 => _24.repository, 'optionalAccess', _25 => _25.default_branch]) &&
      payload.ref !== `refs/heads/${payload.repository.default_branch}`
    ) {
      return res.status(202).json({
        success: true,
        ignored: true,
        reason: "non-default branch",
      });
    }
    const result = await processWebhook(payload);
    res.status(202).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Invalid webhook",
    });
  }
});

export default router;
