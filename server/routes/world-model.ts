import { Request, Response, Router } from "express";
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
  LlmProviderId,
} from "../lib/services/llm-grounded.service";
import { enrichNavigatorResult, NavigatorQueryOptions } from "../lib/services/navigator-enrichment.service";
import { asyncHandler } from "../lib/utils/async-handler";

const router = Router();

/** Clamp a user-supplied limit to a safe 1-500 range with a default of 50. */
function parseLimit(raw: unknown, fallback = 50): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(500, Math.floor(n)));
}

type RawRequest = Request & { rawBody?: Buffer };

export interface NavigatorProject {
  name: string;
  description?: string;
  repository?: string;
}

/**
 * Result of a navigator retrieval, extended with the optional AI enrichment
 * metadata attached by the Gemini interactions layer and the grounded-answer
 * layer (see enrichNavigatorResult).
 */
export interface NavigatorResult {
  query: string;
  explanation: string;
  projects: NavigatorProject[];
  technologies: Array<{ name: string; projectCount?: number }>;
  artifacts: Array<{ path: string; kind?: string; sha?: string; projectName?: string }>;
  groundedEvidenceCount: number;
  ranking?: { mode?: string; vectorHits?: number };
  aiModel?: string;
  aiMode?: string;
  suggestions?: string[];
  llm?: {
    provider: LlmProviderId;
    model?: string;
    usedFallback: boolean;
    suggestions: string[];
  };
}

async function handleNavigatorQuery(
  query: string,
  options: NavigatorQueryOptions = {}
): Promise<NavigatorResult> {
  const q = query.trim();
  const result =
    options.hybrid !== false
      ? await retrieveWorldHybrid(q)
      : ((await retrieveWorld(q)) as unknown as NavigatorResult);

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
  const q = String(req.body?.query || req.body?.q || "").trim();
  if (!q) {
    return res.status(400).json({ success: false, error: "Body field 'query' is required" });
  }
  const history = Array.isArray(req.body?.history) ? req.body.history : undefined;
  const result = await handleNavigatorQuery(q, {
    hybrid: req.body?.hybrid !== false,
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
    let embeddings: unknown = null;
    try {
      embeddings = await reindexWorldModelEmbeddings();
    } catch {
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
    const pinnedOnly = req.body?.pinnedOnly !== false;
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
    const repository = String(req.body?.repository || "").trim();
    const commitSha = String(req.body?.commitSha || "").trim();
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
      skipSync: Boolean(req.body?.skipSync),
      skipEmbed: Boolean(req.body?.skipEmbed),
      eventRetentionDays: req.body?.eventRetentionDays
        ? Number(req.body.eventRetentionDays)
        : undefined,
    });
    res.json({ success: true, data: report });
  }, { fallbackMessage: "Maintenance failed" })
);

router.get("/maintenance/status", async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      running: isMaintenanceRunning(),
      lastRun: getLastMaintenanceReport(),
    },
  });
});

router.post("/webhook", hardQueryRateLimiter, asyncHandler(async (req: RawRequest, res) => {
  const raw = req.rawBody?.toString("utf8") || JSON.stringify(req.body);
  if (!verifyGitHubSignature(raw, req.header("x-hub-signature-256"))) {
    return res.status(401).json({ success: false, error: "Invalid GitHub webhook signature" });
  }
  const payload = req.body;
  if (
    payload.ref &&
    payload.repository?.default_branch &&
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
