import { Request, Response, Router } from "express";
import { asyncHandler } from "../lib/utils/async-handler";
import { hardQueryRateLimiter } from "../lib/middleware/production-security";
import { authMiddleware, authorize } from "../lib/middleware/auth.middleware";
import { UserRole } from "@prisma/client";

const router = Router();

const requireAdmin = [authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN)];

/** In-memory robotics catalog (backed by WorldModelProject entries with
 *  worldCategory="ROBOTICS"). In production this would be a dedicated
 *  RobotCatalogEntry table. For now we surface robotics worlds through the
 *  existing WorldModelProject facade with robot-specific metadata. */
const ROBOTICS_WORLD_CATEGORY = "ROBOTICS";

/** GET /robotics — List all robotics worlds with optional facet filters. */
router.get(
  "/",
  hardQueryRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { robotClass, domain, lifecycle, protocol, holokaiIntegrated, q, limit } = req.query;

    const where: Record<string, unknown> = {
      worldCategory: ROBOTICS_WORLD_CATEGORY,
    };

    if (q) {
      where.name = { contains: String(q), mode: "insensitive" };
    }

    const take = Math.min(Math.max(Number(limit ?? 50), 1), 200);

    const projects = await (globalThis as any).prisma.worldModelProject.findMany({
      where,
      take,
      orderBy: { lastObservedAt: "desc" },
    });

    res.json({
      success: true,
      data: projects,
      count: projects.length,
      facet: { category: ROBOTICS_WORLD_CATEGORY },
    });
  }),
);

/** GET /robotics/:robotId — Get a single robotics world detail. */
router.get(
  "/:robotId",
  hardQueryRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const project = await (globalThis as any).prisma.worldModelProject.findUnique({
      where: { id: req.params.robotId },
      include: {
        evidence: { orderBy: { observedAt: "desc" }, take: 10 },
        artifacts: { orderBy: { updatedAt: "desc" }, take: 20 },
        events: { orderBy: { occurredAt: "desc" }, take: 20 },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, error: "Robotics world not found" });
    }

    res.json({ success: true, data: project });
  }),
);

/** GET /robotics/facets — Get robotics facet option values for filtering UI. */
router.get(
  "/facets",
  hardQueryRateLimiter,
  asyncHandler(async (_req: Request, res: Response) => {
    const projects = await (globalThis as any).prisma.worldModelProject.findMany({
      where: { worldCategory: ROBOTICS_WORLD_CATEGORY },
      select: {
        worldModality: true,
        worldStatus: true,
        worldLifecycle: true,
        worldOwnerOrg: true,
        worldLicenses: true,
        metadata: true,
      },
    });

    const modalityCounts = new Map<string, number>();
    const statusCounts = new Map<string, number>();
    const lifecycleCounts = new Map<string, number>();
    const orgCounts = new Map<string, number>();

    for (const p of projects) {
      const inc = (m: Map<string, number>, k: string | null) => {
        if (!k) return;
        m.set(k, (m.get(k) ?? 0) + 1);
      };
      inc(modalityCounts, p.worldModality);
      inc(statusCounts, p.worldStatus);
      inc(lifecycleCounts, p.worldLifecycle);
      inc(orgCounts, p.worldOwnerOrg);
    }

    res.json({
      success: true,
      data: {
        modalities: Array.from(modalityCounts.entries()).map(([value, count]) => ({
          value,
          label: value,
          count,
        })),
        statuses: Array.from(statusCounts.entries()).map(([value, count]) => ({
          value,
          label: value,
          count,
        })),
        lifecycles: Array.from(lifecycleCounts.entries()).map(([value, count]) => ({
          value,
          label: value,
          count,
        })),
        organizations: Array.from(orgCounts.entries()).map(([value, count]) => ({
          value,
          label: value,
          count,
        })),
      },
    });
  }),
);

/** POST /robotics — Create/update robotics world metadata (admin). */
router.post(
  "/",
  hardQueryRateLimiter,
  ...requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const {
      name,
      repository,
      owner,
      url,
      description,
      worldModality,
      worldStatus,
      worldLifecycle,
      worldYear,
      worldLabel,
      worldRole,
      worldOwnerOrg,
      worldLicenses,
      metadata,
    } = req.body || {};

    const project = await (globalThis as any).prisma.worldModelProject.upsert({
      where: { repository: repository || `robotics-${name}` },
      create: {
        repository: repository || `robotics-${name}`,
        name,
        owner: owner || "feexsystems",
        url: url || "",
        description,
        worldCategory: ROBOTICS_WORLD_CATEGORY,
        worldModality,
        worldStatus,
        worldLifecycle,
        worldYear,
        worldLabel,
        worldRole,
        worldOwnerOrg,
        worldLicenses,
        metadata: metadata || {},
      },
      update: {
        name,
        description,
        worldModality,
        worldStatus,
        worldLifecycle,
        worldYear,
        worldLabel,
        worldRole,
        worldOwnerOrg,
        worldLicenses,
        metadata: metadata ? { ...metadata } : undefined,
      },
    });

    res.json({ success: true, data: project });
  }),
);

/** POST /robotics/:robotId/metadata — Update robotics world faceted metadata (admin). */
router.post(
  "/:robotId/metadata",
  hardQueryRateLimiter,
  ...requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const {
      worldModality,
      worldStatus,
      worldLifecycle,
      worldYear,
      worldLabel,
      worldRole,
      worldOwnerOrg,
      worldLicenses,
      metadata,
    } = req.body || {};

    const project = await (globalThis as any).prisma.worldModelProject.findUnique({
      where: { id: req.params.robotId },
    });

    if (!project) {
      return res.status(404).json({ success: false, error: "Robotics world not found" });
    }

    const result = await (globalThis as any).prisma.worldModelProject.update({
      where: { id: req.params.robotId },
      data: {
        worldModality,
        worldStatus,
        worldLifecycle,
        worldYear,
        worldLabel,
        worldRole,
        worldOwnerOrg,
        worldLicenses,
        metadata: metadata ? { ...project.metadata, ...metadata } : project.metadata,
      },
    });

    res.json({ success: true, data: result });
  }),
);

/** GET /robotics/status — Robotics service health check. */
router.get(
  "/status",
  hardQueryRateLimiter,
  asyncHandler(async (_req: Request, res: Response) => {
    const count = await (globalThis as any).prisma.worldModelProject.count({
      where: { worldCategory: ROBOTICS_WORLD_CATEGORY },
    });

    res.json({
      success: true,
      data: {
        service: "robotics",
        holokaiIntegration: true,
        roboticsWorldCount: count,
        status: "operational",
      },
    });
  }),
);

export default router;