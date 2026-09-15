import { Router } from "express";
import { ClaimGraphService } from "../lib/marketing/claim-graph.service";
import { MarketingGraphService } from "../lib/marketing/marketing-graph.service";
import { digitalTwinService } from "../lib/marketing/digital-twin.service";
import { syndicationService } from "../lib/marketing/syndication.service";
import { PrismaClient } from "@prisma/client";

export function createMarketingRoutes(prisma: PrismaClient) {
  const router = Router();
  const claimGraphService = new ClaimGraphService(prisma);
  const marketingGraphService = new MarketingGraphService(prisma);

  // 1. GET /api/marketing/claims/orphans - List claims with zero evidence
  router.get("/claims/orphans", async (req, res, next) => {
    try {
      const orphans = await claimGraphService.getOrphanClaims();
      res.json({ orphans });
    } catch (error) {
      next(error);
    }
  });

  // 2. POST /api/marketing/claims/integrity-check - 409 if orphans exist
  router.post("/claims/integrity-check", async (req, res, next) => {
    try {
      await claimGraphService.assertIntegrity();
      res.status(200).json({ status: "ok" });
    } catch (error: any) {
      if (error.message && error.message.includes("integrity violation")) {
        res.status(409).json({ error: error.message });
      } else {
        next(error);
      }
    }
  });

  // 3. GET /api/marketing/claims/:id/graph - Claim neighborhood graph
  router.get("/claims/:id/graph", async (req, res, next) => {
    try {
      const graph = await claimGraphService.getClaimNeighborhood(req.params.id);
      res.json({ graph });
    } catch (error: any) {
      if (error.message && error.message.includes("not found")) {
        res.status(404).json({ error: error.message });
      } else {
        next(error);
      }
    }
  });

  // 4. GET /api/marketing/products/:id/claim-graph - All claims for product
  router.get("/products/:id/claim-graph", async (req, res, next) => {
    try {
      const graph = await claimGraphService.getProductClaimGraph(req.params.id);
      if (!graph) return res.status(404).json({ error: "Product not found" });
      res.json({ graph });
    } catch (error) {
      next(error);
    }
  });

  // 5. GET /api/marketing/evidence/dependencies - Claims depending on evidence
  router.get("/evidence/dependencies", async (req, res, next) => {
    try {
      const { worldModelEvidenceId, marketingEvidenceId } = req.query;
      const dependencies = await claimGraphService.traverseFromEvidence({
        worldModelEvidenceId: worldModelEvidenceId as string,
        marketingEvidenceId: marketingEvidenceId as string,
      });
      res.json({ dependencies });
    } catch (error) {
      next(error);
    }
  });

  // 6. POST /api/marketing/evidence/propagate - Refresh dependent claim freshness + audit
  router.post("/evidence/propagate", async (req, res, next) => {
    try {
      const { worldModelEvidenceId, marketingEvidenceId, actorId } = req.body;
      const result = await claimGraphService.propagateEvidenceChange({
        worldModelEvidenceId,
        marketingEvidenceId,
        actorId,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // 7. POST /api/marketing/claims/:id/about - Link claim -> feature/technology
  router.post("/claims/:id/about", async (req, res, next) => {
    try {
      const { featureId, technologyId } = req.body;
      const result = await claimGraphService.linkClaimAbout(req.params.id, { featureId, technologyId });
      res.status(201).json({ result });
    } catch (error) {
      next(error);
    }
  });

  // 8. GET /api/marketing/evidence/traverse - BFS from evidence through claims/content
  router.get("/evidence/traverse", async (req, res, next) => {
    try {
      const { worldModelEvidenceId, marketingEvidenceId } = req.query;
      const traverseResult = await claimGraphService.traverseFromEvidence({
        worldModelEvidenceId: worldModelEvidenceId as string,
        marketingEvidenceId: marketingEvidenceId as string,
      });
      res.json({ traverseResult });
    } catch (error) {
      next(error);
    }
  });

  // 9. GET /api/marketing/products/:id/neighborhood - Product Ecosystem
  router.get("/products/:id/neighborhood", async (req, res, next) => {
    try {
      const graph = await marketingGraphService.getProductNeighborhood(req.params.id);
      res.json({ graph });
    } catch (error) {
      next(error);
    }
  });

  // 10. GET /api/marketing/campaigns/:id/neighborhood - Campaign Ecosystem
  router.get("/campaigns/:id/neighborhood", async (req, res, next) => {
    try {
      const graph = await marketingGraphService.getCampaignNeighborhood(req.params.id);
      res.json({ graph });
    } catch (error) {
      next(error);
    }
  });

  // 11. GET /api/marketing/audiences/:id/neighborhood - Audience Ecosystem
  router.get("/audiences/:id/neighborhood", async (req, res, next) => {
    try {
      const graph = await marketingGraphService.getAudienceNeighborhood(req.params.id);
      res.json({ graph });
    } catch (error) {
      next(error);
    }
  });

  // 12. GET /api/marketing/twin/snapshot - Digital Twin topology + telemetry
  router.get("/twin/snapshot", async (req, res, next) => {
    try {
      const snapshot = await digitalTwinService.getSnapshot();
      res.json(snapshot);
    } catch (error) {
      next(error);
    }
  });

  // 13. POST /api/marketing/syndication/schedule - Queue an asset for distribution
  router.post("/syndication/schedule", async (req, res, next) => {
    try {
      const { assetId, platform, scheduledFor } = req.body;
      const result = await syndicationService.syndicateAsset({
        assetId,
        platform,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      });
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  });

  // 14. GET /api/marketing/syndication/status/:assetId - Track delivery state
  router.get("/syndication/status/:assetId", async (req, res, next) => {
    try {
      // Stub for tracking delivery state, in reality we'd check BullMQ or events table
      const events = await prisma.marketingEvent.findMany({
        where: {
          assetId: req.params.assetId,
          eventType: "content.syndicated",
        },
        orderBy: { occurredAt: "desc" },
      });
      res.json({ events });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
