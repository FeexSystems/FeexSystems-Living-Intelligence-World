/**
 * Authenticated Marketing CRUD (Phase 1)
 * Mount: /api/marketing
 * Capability: 03, 07, partial 08
 */
import express, { Request, Response, NextFunction } from "express";
import { authMiddleware } from "../lib/middleware/auth.middleware";
import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import { MarketingService } from "../lib/marketing/marketing.service";
import {
  CreateProductSchema,
  CreateContentAssetSchema,
  CreateClaimSchema,
  CreateCampaignSchema,
  CreateAudienceSchema,
  CreateTopicSchema,
  CreateFeatureSchema,
} from "../../shared/marketing-contracts";

const router = express.Router();
const prisma = new PrismaClient();
const marketing = new MarketingService(prisma);

router.use(authMiddleware);

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

router.get(
  "/products",
  asyncHandler(async (_req, res) => {
    const items = await marketing.listProducts();
    res.json({ items });
  })
);

router.get(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const item = await marketing.getProduct(req.params.id);
    if (!item) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({ item });
  })
);

router.post(
  "/products",
  asyncHandler(async (req, res) => {
    const parsed = CreateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const item = await marketing.createProduct(parsed.data);
    res.status(201).json({ item });
  })
);

router.post(
  "/features",
  asyncHandler(async (req, res) => {
    const parsed = CreateFeatureSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const item = await prisma.marketingFeature.create({ data: parsed.data });
    res.status(201).json({ item });
  })
);

router.post(
  "/topics",
  asyncHandler(async (req, res) => {
    const parsed = CreateTopicSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const item = await prisma.marketingTopic.create({
      data: {
        ...parsed.data,
        metadata: (parsed.data.metadata ?? {}) as object,
      },
    });
    res.status(201).json({ item });
  })
);

router.get(
  "/topics",
  asyncHandler(async (_req, res) => {
    const items = await prisma.marketingTopic.findMany({ orderBy: { name: "asc" } });
    res.json({ items });
  })
);

router.get(
  "/content",
  asyncHandler(async (req, res) => {
    const items = await marketing.listContent({
      productId: typeof req.query.productId === "string" ? req.query.productId : undefined,
      lifecycle: typeof req.query.lifecycle === "string" ? req.query.lifecycle : undefined,
    });
    res.json({ items });
  })
);

router.post(
  "/content",
  asyncHandler(async (req, res) => {
    const parsed = CreateContentAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const item = await marketing.createContent(parsed.data);
    res.status(201).json({ item });
  })
);

router.get(
  "/claims",
  asyncHandler(async (req, res) => {
    const productId =
      typeof req.query.productId === "string" ? req.query.productId : undefined;
    const items = await marketing.listClaims(productId);
    res.json({ items });
  })
);

router.post(
  "/claims",
  asyncHandler(async (req, res) => {
    const parsed = CreateClaimSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const item = await marketing.createClaim(parsed.data);
      res.status(201).json({ item });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Claim create failed";
      res.status(400).json({ error: message });
    }
  })
);

router.get(
  "/campaigns",
  asyncHandler(async (_req, res) => {
    const items = await marketing.listCampaigns();
    res.json({ items });
  })
);

router.post(
  "/campaigns",
  asyncHandler(async (req, res) => {
    const parsed = CreateCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const item = await marketing.createCampaign(parsed.data);
    res.status(201).json({ item });
  })
);

router.post(
  "/audiences",
  asyncHandler(async (req, res) => {
    const parsed = CreateAudienceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const item = await prisma.marketingAudience.create({
      data: {
        slug: parsed.data.slug,
        name: parsed.data.name,
        description: parsed.data.description,
        interests: (parsed.data.interests ?? []) as object,
        metadata: (parsed.data.metadata ?? {}) as object,
      },
    });
    res.status(201).json({ item });
  })
);

router.get(
  "/audiences",
  asyncHandler(async (_req, res) => {
    const items = await prisma.marketingAudience.findMany({ orderBy: { name: "asc" } });
    res.json({ items });
  })
);

router.post(
  "/channels/bootstrap",
  asyncHandler(async (_req, res) => {
    await marketing.ensureDefaultChannels();
    const items = await prisma.marketingChannel.findMany({ orderBy: { type: "asc" } });
    res.json({ items });
  })
);

export default router;
