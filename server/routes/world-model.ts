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
import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../lib/database";
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

// ── FeexSystems faceted metadata & comparison endpoints (world-models.io inspired) ──

/** Faceted world search: filter by category, modality, status, lifecycle, year, verdict */
router.get(
  "/faceted",
  hardQueryRateLimiter,
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "").trim();
    const category = String(req.query.category || "").trim();
    const modality = String(req.query.modality || "").trim();
    const status = String(req.query.status || "").trim();
    const lifecycle = String(req.query.lifecycle || "").trim();
    const minYear = Number(req.query.minYear);
    const maxYear = Number(req.query.maxYear);
    const verdict = String(req.query.verdict || "").trim();
    const limit = parseLimit(req.query.limit);
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const where: Record<string, unknown> = {};
    if (q) where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { worldCategory: { contains: q, mode: "insensitive" } },
      { owner: { contains: q, mode: "insensitive" } },
    ];
    if (category) where.worldCategory = { contains: category, mode: "insensitive" };
    if (modality) where.worldModality = { contains: modality, mode: "insensitive" };
    if (status) where.worldStatus = { equals: status };
    if (lifecycle) where.worldLifecycle = { equals: lifecycle };
    if (verdict) where.verificationVerdict = { equals: verdict };
    if (minYear) where.worldYear = { gte: minYear };
    if (maxYear) where.worldYear ??= { lte: maxYear };

    const projects = await prisma.worldModelProject.findMany({
      where,
      orderBy: { lastObservedAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        evidence: { take: 3, orderBy: { observedAt: "desc" } },
        artifacts: { take: 2 },
        events: { take: 3, orderBy: { occurredAt: "desc" } },
      },
    });

    const facetDiscovery = (await prisma.$queryRawUnsafe(
      `SELECT worldCategory, worldModality, worldStatus, worldLifecycle, verificationVerdict,
              COUNT(*) AS cnt FROM world_model_projects
              WHERE worldCategory IS NOT NULL GROUP BY 1,2,3,4,5`
    )) as any[];

    res.json({
      success: true,
      source: "world-model",
      projects,
      count: projects.length,
      facetDiscovery: facetDiscovery.map((r: any) => ({
        worldCategory: r.worldCategory,
        worldModality: r.worldModality,
        worldStatus: r.worldStatus,
        worldLifecycle: r.worldLifecycle,
        verdict: r.verificationVerdict,
        count: r.cnt,
      })),
      meta: { offset, limit, total: projects.length },
    });
  }, { fallbackMessage: "Faceted search failed" })
);

/** Single-world detail — evidence provenance ledger, comparison, facets */
router.get(
  "/:worldId",
  hardQueryRateLimiter,
  asyncHandler(async (req, res) => {
    const project = await prisma.worldModelProject.findUnique({
      where: { id: req.params.worldId },
      include: {
        evidence: { orderBy: { observedAt: "desc" } },
        artifacts: { orderBy: { updatedAt: "desc" } },
        events: { orderBy: { occurredAt: "desc" } },
        interpretations: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!project) {
      return res.status(404).json({ success: false, error: "World not found" });
    }
    res.json({
      success: true,
      source: "world-model",
      project,
      count: 1,
    });
  }, { fallbackMessage: "World detail fetch failed" })
);

/** Cross-project comparison view — rows = facets, columns = worlds */
router.get(
  "/comparison",
  hardQueryRateLimiter,
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "").trim();
    const category = String(req.query.category || "").trim();
    const modality = String(req.query.modality || "").trim();
    const status = String(req.query.status || "").trim();
    const limit = parseLimit(req.query.limit, 20);

    const where: Record<string, unknown> = {};
    if (q) where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { worldCategory: { contains: q, mode: "insensitive" } },
    ];
    if (category) where.worldCategory = { contains: category, mode: "insensitive" };
    if (modality) where.worldModality = { contains: modality, mode: "insensitive" };
    if (status) where.worldStatus = { equals: status };
    const projects = await prisma.worldModelProject.findMany({
      where,
      orderBy: { name: "asc" },
      take: limit,
      include: {
        evidence: { take: 1 },
      },
    });

    const comparisonRows: {
      key: string;
      label: string;
      type: string;
      compute?: (p: any) => string | number;
    }[] = [
      { key: "id", label: "Project ID", type: "string" },
      { key: "name", label: "Project Name", type: "string" },
      { key: "owner", label: "Owner", type: "string" },
      { key: "worldCategory", label: "Category", type: "string" },
      { key: "worldModality", label: "Modality", type: "string" },
      { key: "worldYear", label: "Year", type: "number" },
      { key: "worldStatus", label: "Status", type: "string" },
      { key: "verificationVerdict", label: "Verdict", type: "string" },
      {
        key: "evidence_count",
        label: "Evidence Records",
        type: "number",
        compute: (p: any) => (p.evidence?.length || 0),
      },
      {
        key: "artifact_count",
        label: "Artifacts",
        type: "number",
        compute: (p: any) => (p.artifacts?.length || 0),
      },
      {
        key: "event_count",
        label: "Events",
        type: "number",
        compute: (p: any) => (p.events?.length || 0),
      },
    ];

    const matrix = projects.map((p: any) => {
      const row: Record<string, string | number> = {};
      for (const rowDef of comparisonRows) {
        if (typeof rowDef.compute === "function") {
          row[rowDef.key] = rowDef.compute(p);
        } else {
          row[rowDef.key] = p[rowDef.key] ?? "";
        }
      }
      return row;
    });

    res.json({
      success: true,
      source: "world-model",
      projects,
      comparison: { rows: comparisonRows, matrix },
      count: projects.length,
      facets: {
        categories: [...new Set(projects.map((p: any) => p.worldCategory).filter(Boolean))],
        modalities: [...new Set(projects.map((p: any) => p.worldModality).filter(Boolean))],
        statuses: [...new Set(projects.map((p: any) => p.worldStatus).filter(Boolean))],
      },
    });
  }, { fallbackMessage: "Comparison fetch failed" })
);

router.post(
  "/:worldId/verify",
  hardQueryRateLimiter,
  ...requireAdmin,
  asyncHandler(async (req, res) => {
    const { verdict, note } = req.body || {};
    const project = await prisma.worldModelProject.findUnique({
      where: { id: req.params.worldId },
    });
    if (!project) {
      return res.status(404).json({ success: false, error: "World not found" });
    }
    const result = await prisma.worldModelProject.update({
      where: { id: req.params.worldId },
      data: {
        verificationVerdict: verdict as any,
        verificationNote: note as string,
        verificationLastSeen: new Date(),
      },
    });
    res.json({ success: true, data: result });
  }, { fallbackMessage: "Verification update failed" })
);

router.post(
  "/:worldId/metadata",
  hardQueryRateLimiter,
  ...requireAdmin,
  asyncHandler(async (req, res) => {
    const { worldCategory, worldModality, worldStatus, worldLifecycle, worldYear, worldLabel, worldRole, worldOwnerOrg, worldLicenses, metadata } = req.body || {};
    const project = await prisma.worldModelProject.findUnique({
      where: { id: req.params.worldId },
    });
    if (!project) {
      return res.status(404).json({ success: false, error: "World not found" });
    }
    // Scalar facet fields: only keys actually present in the body are
    // written (Prisma ignores `undefined`, matching prior behavior).
    const scalarData: Prisma.WorldModelProjectUpdateInput = {};
    if (worldCategory !== undefined) scalarData.worldCategory = worldCategory;
    if (worldModality !== undefined) scalarData.worldModality = worldModality;
    if (worldStatus !== undefined) scalarData.worldStatus = worldStatus;
    if (worldLifecycle !== undefined) scalarData.worldLifecycle = worldLifecycle;
    if (worldYear !== undefined) scalarData.worldYear = worldYear;
    if (worldLabel !== undefined) scalarData.worldLabel = worldLabel;
    if (worldRole !== undefined) scalarData.worldRole = worldRole;
    if (worldOwnerOrg !== undefined) scalarData.worldOwnerOrg = worldOwnerOrg;
    if (worldLicenses !== undefined) scalarData.worldLicenses = worldLicenses;

    // Metadata patch: merge atomically inside Postgres (`jsonb ||`).
    // The previous read-modify-write lost concurrent admin updates —
    // two overlapping requests each merged into the same stale snapshot
    // and the later write erased the earlier one's keys.
    if (
      metadata !== undefined &&
      typeof metadata === "object" &&
      metadata !== null &&
      !Array.isArray(metadata)
    ) {
      await prisma.$executeRaw`
        UPDATE world_model_projects
        SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify(metadata)}::jsonb
        WHERE id = ${req.params.worldId}
      `;
    }

    let result = project;
    if (Object.keys(scalarData).length > 0) {
      result = await prisma.worldModelProject.update({
        where: { id: req.params.worldId },
        data: scalarData,
      });
    } else if (metadata !== undefined) {
      result = (await prisma.worldModelProject.findUnique({
        where: { id: req.params.worldId },
      })) ?? project;
    }
    res.json({ success: true, data: result });
  }, { fallbackMessage: "Metadata update failed" })
);

router.post(
  "/:worldId/synced",
  hardQueryRateLimiter,
  ...requireAdmin,
  asyncHandler(async (req, res) => {
    const { lastObservedAt } = req.body || {};
    const project = await prisma.worldModelProject.findUnique({
      where: { id: req.params.worldId },
    });
    if (!project) {
      return res.status(404).json({ success: false, error: "World not found" });
    }
    const result = await prisma.worldModelProject.update({
      where: { id: req.params.worldId },
      data: {
        lastObservedAt: lastObservedAt ? new Date(lastObservedAt) : new Date(),
      },
    });
    res.json({ success: true, data: result });
  }, { fallbackMessage: "Sync timestamp update failed" })
);

router.post(
  "/sync/github-pinned",
  hardQueryRateLimiter,
  ...requireAdmin,
  asyncHandler(async (_req, res) => {
    const result = await syncPinnedProjects();
    res.json({ success: true, data: result });
  }, { fallbackMessage: "GitHub sync failed" })
);

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

export default router;
