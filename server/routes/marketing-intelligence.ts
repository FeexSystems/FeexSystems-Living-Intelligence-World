/**
 * Marketing Intelligence Routes (Phase 8)
 * Mount: /api/marketing/intelligence
 *
 * Exposes the Content Gap, Content Decay and Opportunity engines, plus the
 * content-recycling stub creator. These services were already implemented and
 * unit-tested under server/lib/marketing/ but had no HTTP surface. All routes
 * are authenticated: they read canonical World Model / marketing state.
 */
import express, { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authMiddleware } from "../lib/middleware/auth.middleware";
import { detectContentGaps } from "../lib/marketing/gap-engine.service";
import { detectContentDecay } from "../lib/marketing/decay-engine.service";
import {
  detectOpportunities,
  createRecyclingStub,
} from "../lib/marketing/opportunity-engine.service";

const router = express.Router();

router.use(authMiddleware);

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

const RecycleStubSchema = z.object({
  parentAssetId: z.string().min(1, "parentAssetId is required"),
});

/**
 * GET /api/marketing/intelligence/gaps
 * Ranked products that have features but little/no marketing collateral.
 */
router.get(
  "/gaps",
  asyncHandler(async (_req, res) => {
    const gaps = await detectContentGaps();
    res.json({ success: true, data: gaps });
  })
);

/**
 * GET /api/marketing/intelligence/decay?thresholdDays=30
 * Ranked content assets whose telemetry/evidence is becoming stale.
 */
router.get(
  "/decay",
  asyncHandler(async (req, res) => {
    const raw = req.query.thresholdDays;
    const parsed =
      typeof raw === "string" && raw.trim() !== "" ? Number(raw) : 30;

    if (!Number.isFinite(parsed) || parsed <= 0) {
      res.status(400).json({
        success: false,
        error: "thresholdDays must be a positive number",
      });
      return;
    }

    const decayed = await detectContentDecay(parsed);
    res.json({ success: true, data: decayed });
  })
);

/**
 * GET /api/marketing/intelligence/opportunities
 * Fresh GitHub signals correlated with products that lack marketing assets.
 */
router.get(
  "/opportunities",
  asyncHandler(async (_req, res) => {
    const opportunities = await detectOpportunities();
    res.json({ success: true, data: opportunities });
  })
);

/**
 * POST /api/marketing/intelligence/recycle
 * Create a DRAFT derivative of a parent content asset, preserving lineage.
 */
router.post(
  "/recycle",
  asyncHandler(async (req, res) => {
    const parsed = RecycleStubSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    try {
      const id = await createRecyclingStub(parsed.data.parentAssetId);
      res.status(201).json({ success: true, data: { id } });
    } catch (error) {
      // createRecyclingStub throws when the parent asset does not exist.
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : "Parent asset not found",
      });
    }
  })
);

export default router;
