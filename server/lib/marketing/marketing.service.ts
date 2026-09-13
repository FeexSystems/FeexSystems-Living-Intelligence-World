/**
 * Marketing domain service (Phase 1)
 * Reuses World Model evidence; never invents claims without provenance.
 */
import type { PrismaClient } from "@prisma/client";
import type {
  CreateProduct,
  CreateClaim,
  CreateContentAsset,
  CreateCampaign,
} from "../../../shared/marketing-contracts";

export class MarketingService {
  constructor(private prisma: PrismaClient) {}

  async listProducts() {
    return this.prisma.marketingProduct.findMany({
      orderBy: { name: "asc" },
      include: {
        features: true,
        worldModelProject: { select: { id: true, name: true, repository: true, url: true } },
      },
    });
  }

  async getProduct(id: string) {
    return this.prisma.marketingProduct.findUnique({
      where: { id },
      include: {
        features: true,
        contentAssets: true,
        claims: { include: { evidenceLinks: true } },
        worldModelProject: true,
      },
    });
  }

  async createProduct(data: CreateProduct) {
    return this.prisma.marketingProduct.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description,
        worldModelProjectId: data.worldModelProjectId ?? null,
        repositoryId: data.repositoryId ?? null,
        metadata: (data.metadata ?? {}) as object,
      },
    });
  }

  async listContent(filters?: { productId?: string; lifecycle?: string }) {
    return this.prisma.marketingContentAsset.findMany({
      where: {
        productId: filters?.productId,
        lifecycle: filters?.lifecycle as never,
      },
      orderBy: { updatedAt: "desc" },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        topic: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async createContent(data: CreateContentAsset) {
    return this.prisma.marketingContentAsset.create({
      data: {
        slug: data.slug,
        title: data.title,
        summary: data.summary,
        body: data.body,
        format: data.format,
        lifecycle: data.lifecycle ?? "IDEA",
        productId: data.productId ?? null,
        topicId: data.topicId ?? null,
        parentId: data.parentId ?? null,
        channelType: data.channelType ?? null,
        objective: data.objective,
        metadata: (data.metadata ?? {}) as object,
      },
    });
  }

  /**
   * Creates a claim only if at least one evidence link is provided.
   * Prefer worldModelEvidenceIds when proof lives in the World Model.
   */
  async createClaim(data: CreateClaim) {
    const wmIds = data.worldModelEvidenceIds ?? [];
    const mktEv = data.marketingEvidence ?? [];

    if (wmIds.length === 0 && mktEv.length === 0) {
      throw new Error(
        "Material claims require at least one evidence link (World Model or marketing evidence)"
      );
    }

    if (wmIds.length > 0) {
      const found = await this.prisma.worldModelEvidence.findMany({
        where: { id: { in: wmIds } },
        select: { id: true },
      });
      if (found.length !== wmIds.length) {
        throw new Error("One or more worldModelEvidenceIds do not exist");
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.marketingClaim.create({
        data: {
          statement: data.statement,
          productId: data.productId ?? null,
          confidence: data.confidence ?? 0.5,
          metadata: (data.metadata ?? {}) as object,
        },
      });

      for (const evidenceId of wmIds) {
        await tx.marketingClaimEvidence.create({
          data: {
            claimId: claim.id,
            worldModelEvidenceId: evidenceId,
            role: "supports",
          },
        });
      }

      for (const ev of mktEv) {
        const row = await tx.marketingEvidence.create({
          data: {
            sourceType: ev.sourceType,
            sourceUrl: ev.sourceUrl,
            sourceRef: ev.sourceRef,
            confidence: ev.confidence ?? 0.5,
          },
        });
        await tx.marketingClaimEvidence.create({
          data: {
            claimId: claim.id,
            marketingEvidenceId: row.id,
            role: "supports",
          },
        });
      }

      return tx.marketingClaim.findUnique({
        where: { id: claim.id },
        include: {
          evidenceLinks: {
            include: {
              worldModelEvidence: true,
              marketingEvidence: true,
            },
          },
        },
      });
    });
  }

  async listClaims(productId?: string) {
    return this.prisma.marketingClaim.findMany({
      where: productId ? { productId } : undefined,
      include: {
        evidenceLinks: {
          include: {
            worldModelEvidence: true,
            marketingEvidence: true,
          },
        },
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createCampaign(data: CreateCampaign) {
    return this.prisma.$transaction(async (tx) => {
      const campaign = await tx.marketingCampaign.create({
        data: {
          slug: data.slug,
          name: data.name,
          objective: data.objective,
          status: data.status ?? "draft",
          startsAt: data.startsAt ?? null,
          endsAt: data.endsAt ?? null,
          metadata: (data.metadata ?? {}) as object,
        },
      });

      for (const productId of data.productIds ?? []) {
        await tx.marketingCampaignProduct.create({
          data: { campaignId: campaign.id, productId },
        });
      }
      for (const contentId of data.contentIds ?? []) {
        await tx.marketingCampaignContent.create({
          data: { campaignId: campaign.id, contentId },
        });
      }
      for (const audienceId of data.audienceIds ?? []) {
        await tx.marketingCampaignAudience.create({
          data: { campaignId: campaign.id, audienceId },
        });
      }

      return tx.marketingCampaign.findUnique({
        where: { id: campaign.id },
        include: {
          products: { include: { product: true } },
          content: { include: { content: true } },
          audiences: { include: { audience: true } },
        },
      });
    });
  }

  async listCampaigns() {
    return this.prisma.marketingCampaign.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        products: { include: { product: { select: { id: true, name: true, slug: true } } } },
        content: { include: { content: { select: { id: true, title: true, slug: true } } } },
      },
    });
  }

  async ensureDefaultChannels() {
    const types = [
      "LINKEDIN",
      "X",
      "YOUTUBE",
      "NEWSLETTER",
      "SITE",
      "DOCS",
      "FEEX_WORLD",
      "OTHER",
    ] as const;
    for (const type of types) {
      await this.prisma.marketingChannel.upsert({
        where: { type },
        create: { type, name: type.replace(/_/g, " ") },
        update: {},
      });
    }
  }
}
