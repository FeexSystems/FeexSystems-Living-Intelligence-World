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
  verifyRepositoryCommit,
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
import { authMiddleware, authorize } from "../lib/middleware/auth.middleware";
import { UserRole } from "@prisma/client";
import {
  getLlmProviderStatus,

} from "../lib/services/llm-grounded.service";
import { enrichNavigatorResult, } from "../lib/services/navigator-enrichment.service";
import { asyncHandler } from "../lib/utils/async-handler";

const router = Router();

/** Clamp a user-supplied limit to a safe 1-500 range with a default of 50. */
function parseLimit(raw, fallback = 50) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(500, Math.floor(n)));
}

































async function handleNavigatorQuery(
  query,
  options = {}
) {
  const q = query.trim();
  const result =
    options.hybrid !== false
      ? await retrieveWorldHybrid(q)
      : ((await retrieveWorld(q)) );

  return enrichNavigatorResult(result, options);
}

/**
 * Guard for World Model endpoints that mutate canonical state or reach out to
 * GitHub on the platform's behalf (sync, reindex, webhook provisioning,
 * maintenance). These were previously unauthenticated, which let any anonymous
 * caller trigger expensive outbound GitHub operations and rewrite the World
 * Model. Reads stay public; writes require an authenticated admin.
 */
const requireAdmin = [authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN)];

router.get("/projects", hardQueryRateLimiter, asyncHandler(async (_req, res) => {
  const projects = await getPinnedWorldModelProjects();
  res.json({
    success: true,
    source: "world-model",
    projects,
    count: Array.isArray(projects) ? projects.length : 0,
  });
}, { fallbackMessage: "World Model query failed" }));

router.get("/graph", hardQueryRateLimiter, asyncHandler(async (_req, res) => {
  const graph = await getWorldModelGraph();
  res.json({ success: true, source: "world-model-graph", data: graph });
}, { fallbackMessage: "World Model graph query failed" }));

router.get("/evidence/projects", hardQueryRateLimiter, asyncHandler(async (_req, res) => {
  const projects = await getAllProjectsEvidenceSummary();
  res.json({ success: true, data: projects });
}, { fallbackMessage: "Evidence projects query failed" }));

router.get(["/evidence/content", "/evidence/:projectId/content"], hardQueryRateLimiter, asyncHandler(async (req, res) => {
  const projectId = decodeURIComponent(String(req.query.projectId || req.params.projectId || "")).trim();
  const filePath = String(req.query.path || "").trim();
  if (!projectId || !filePath) {
    return res.status(400).json({ success: false, error: "Project ID and file path query are required" });
  }
  const result = await getArtifactContent(projectId, filePath);
  res.json({ success: true, data: result });
}, { fallbackMessage: "Artifact content fetch failed" }));

router.get(["/evidence/detail", "/evidence/:projectId"], hardQueryRateLimiter, asyncHandler(async (req, res) => {
  const projectId = decodeURIComponent(String(req.query.projectId || req.params.projectId || "")).trim();
  if (!projectId) {
    return res.status(400).json({ success: false, error: "Project ID is required" });
  }
  const evidence = await getProjectEvidence(projectId);
  res.json({ success: true, data: evidence });
}, { fallbackMessage: "Evidence retrieval failed" }));

/** Temporal reconstruction — state at commit or date */
router.get("/temporal/:projectId", hardQueryRateLimiter, asyncHandler(async (req, res) => {
  const projectId = decodeURIComponent(String(req.params.projectId || "")).trim();
  if (!projectId) {
    return res.status(400).json({ success: false, error: "projectId is required" });
  }
  const snapshot = await reconstructProjectState({
    projectId,
    at: req.query.at ? String(req.query.at) : undefined,
    commitSha: req.query.commit ? String(req.query.commit) : undefined,
    limit: req.query.limit !== undefined ? parseLimit(req.query.limit) : 50,
  });
  res.json({ success: true, data: snapshot });
}, { fallbackMessage: "Temporal reconstruction failed" }));

router.get("/temporal/:projectId/events", hardQueryRateLimiter, asyncHandler(async (req, res) => {
  const projectId = decodeURIComponent(String(req.params.projectId || "")).trim();
  const events = await listProjectEvents(projectId, parseLimit(req.query.limit));
  res.json({ success: true, data: events });
}, { fallbackMessage: "Event listing failed" }));

router.get("/navigator", hardQueryRateLimiter, asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) {
    return res.status(400).json({ success: false, error: "Query parameter 'q' is required" });
  }
  const hybrid = String(req.query.hybrid || "true") !== "false";
  const result = await handleNavigatorQuery(q, { hybrid });
  res.json({ success: true, data: result });
}, { fallbackMessage: "Navigator retrieval failed" }));

router.post("/navigator", hardQueryRateLimiter, asyncHandler(async (req, res) => {
  const q = String(_optionalChain([req, 'access', _ => _.body, 'optionalAccess', _2 => _2.query]) || _optionalChain([req, 'access', _3 => _3.body, 'optionalAccess', _4 => _4.q]) || "").trim();
  if (!q) {
    return res.status(400).json({ success: false, error: "Body field 'query' is required" });
  }
  const history = Array.isArray(_optionalChain([req, 'access', _5 => _5.body, 'optionalAccess', _6 => _6.history])) ? req.body.history : undefined;
  const result = await handleNavigatorQuery(q, {
    hybrid: _optionalChain([req, 'access', _7 => _7.body, 'optionalAccess', _8 => _8.hybrid]) !== false,
    history,
  });
  res.json({ success: true, data: result });
}, { fallbackMessage: "Navigator retrieval failed" }));

/**
 * GET /api/world-model/providers/status
 * Public (no auth) — returns which LLM providers are configured.
 * Used by Bushfeexer and Omni to show honest UI warnings.
 */
router.get("/providers/status", asyncHandler(async (_req, res) => {
  const status = await getLlmProviderStatus();
  res.json({ success: true, data: status });
}, { fallbackMessage: "Provider status check failed" }));

router.post(
  "/sync/github-pinned",
  hardQueryRateLimiter,
  ...requireAdmin,
  asyncHandler(async (_req, res) => {
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
  }, { status: 502, fallbackMessage: "GitHub synchronization failed" })
);

router.post(
  "/embeddings/reindex",
  hardQueryRateLimiter,
  ...requireAdmin,
  asyncHandler(async (_req, res) => {
    await ensureEmbeddingTables();
    const result = await reindexWorldModelEmbeddings();
    res.json({ success: true, data: result });
  }, { fallbackMessage: "Embedding reindex failed" })
);

/** Provision GitHub webhooks for World Model repos */
router.post(
  "/webhooks/provision",
  hardQueryRateLimiter,
  ...requireAdmin,
  asyncHandler(async (req, res) => {
    const pinnedOnly = _optionalChain([req, 'access', _9 => _9.body, 'optionalAccess', _10 => _10.pinnedOnly]) !== false;
    const result = await provisionWebhooksForWorldModel({ pinnedOnly });
    res.json({
      success: true,
      callbackUrl: getConfiguredWebhookUrl(),
      data: result,
    });
  }, { fallbackMessage: "Webhook provisioning failed" })
);

router.post(
  "/webhooks/provision/:owner/:repo",
  hardQueryRateLimiter,
  ...requireAdmin,
  asyncHandler(async (req, res) => {
    const fullName = `${req.params.owner}/${req.params.repo}`;
    const result = await createOrUpdateWorldModelWebhook(fullName);
    res.json({ success: true, data: result });
  }, { fallbackMessage: "Webhook provisioning failed" })
);

router.get(
  "/webhooks/:owner/:repo",
  ...requireAdmin,
  asyncHandler(async (req, res) => {
    const fullName = `${req.params.owner}/${req.params.repo}`;
    const hooks = await listRepoWebhooks(fullName);
    res.json({ success: true, data: hooks });
  }, { fallbackMessage: "List webhooks failed" })
);

/**
 * Verify a real commit SHA against GitHub BEFORE any Evidence Fabric record is
 * anchored. This is the server-side "Evidence, Not Claims" gate for the admin
 * write UI: the client must call this and only anchor evidence (via the SQL
 * Connect `insertWorldEvidence` mutation) when `verified` is true. The commit
 * SHA is sourced from GitHub here — never fabricated or trusted from the client.
 */
router.post(
  "/evidence/verify",
  hardQueryRateLimiter,
  ...requireAdmin,
  asyncHandler(async (req, res) => {
    const repository = String(_optionalChain([req, 'access', _11 => _11.body, 'optionalAccess', _12 => _12.repository]) || "").trim();
    const commitSha = String(_optionalChain([req, 'access', _13 => _13.body, 'optionalAccess', _14 => _14.commitSha]) || "").trim();
    if (!repository || !commitSha) {
      return res.status(400).json({ success: false, error: "repository and commitSha are required" });
    }
    const result = await verifyRepositoryCommit(repository, commitSha);
    res.json({ success: true, data: result });
  }, { status: 400, fallbackMessage: "Commit verification failed" })
);

router.post(
  "/maintenance/run",
  hardQueryRateLimiter,
  ...requireAdmin,
  asyncHandler(async (req, res) => {
    const report = await runWorldModelMaintenance({
      skipSync: Boolean(_optionalChain([req, 'access', _15 => _15.body, 'optionalAccess', _16 => _16.skipSync])),
      skipEmbed: Boolean(_optionalChain([req, 'access', _17 => _17.body, 'optionalAccess', _18 => _18.skipEmbed])),
      eventRetentionDays: _optionalChain([req, 'access', _19 => _19.body, 'optionalAccess', _20 => _20.eventRetentionDays])
        ? Number(req.body.eventRetentionDays)
        : undefined,
    });
    res.json({ success: true, data: report });
  }, { fallbackMessage: "Maintenance failed" })
);

router.get("/maintenance/status", async (_req, res) => {
  res.json({
    success: true,
    data: {
      running: isMaintenanceRunning(),
      lastRun: getLastMaintenanceReport(),
    },
  });
});

router.post("/webhook", hardQueryRateLimiter, asyncHandler(async (req, res) => {
  const raw = _optionalChain([req, 'access', _21 => _21.rawBody, 'optionalAccess', _22 => _22.toString, 'call', _23 => _23("utf8")]) || JSON.stringify(req.body);
  if (!verifyGitHubSignature(raw, req.header("x-hub-signature-256"))) {
    return res.status(401).json({ success: false, error: "Invalid GitHub webhook signature" });
  }
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
}, { status: 400, fallbackMessage: "Invalid webhook" }));

export default router;
