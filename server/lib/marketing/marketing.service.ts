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
        claims: { include: { evidence: true } },
        worldModelProject: true,
      },
    });
  }

  async createProduct(data: CreateProduct) {
    return this.prisma.marketingProduct.create({
      data: {
        name: data.name,
        description: data.description,
        worldModelProjectId: data.worldModelProjectId ?? null,
        repositoryId: data.repositoryId ?? null,
      },
    });
  }

  async listContent(filters?: { productId?: string; lifecycle?: string }) {
    return this.prisma.marketingContentAsset.findMany({
      where: {
        state: filters?.lifecycle === "IDEA" ? "DRAFT" : "PUBLISHED", // Or whatever logic
      },
      include: {
        topics: { include: { topic: { select: { id: true, name: true } } } },
      },
    });
  }

  async createContent(data: CreateContentAsset) {
    return this.prisma.marketingContentAsset.create({
      data: {
        title: data.title,
        type: data.format ?? "DOCUMENT",
        state: "DRAFT",
        content: data.body ?? null,
        parentId: data.parentId ?? null,
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
          productId: data.productId ?? "",
        },
      });

      for (const evidenceId of wmIds) {
        await tx.marketingClaimEvidence.create({
          data: {
            claimId: claim.id,
            worldModelEvidenceId: evidenceId,
          },
        });
      }

      for (const ev of mktEv) {
        const row = await tx.marketingEvidence.create({
          data: {
            sourceUrl: ev.sourceUrl,
            description: ev.sourceRef,
          },
        });
        await tx.marketingClaimEvidence.create({
          data: {
            claimId: claim.id,
            marketingEvidenceId: row.id,
          },
        });
      }

      return tx.marketingClaim.findUnique({
        where: { id: claim.id },
        include: {
          evidence: {
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
        evidence: {
          include: {
            worldModelEvidence: true,
            marketingEvidence: true,
          },
        },
        product: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createCampaign(data: CreateCampaign) {
    return this.prisma.$transaction(async (tx) => {
      const campaign = await tx.marketingCampaign.create({
        data: {
          name: data.name,
          description: data.objective,
        },
      });

      for (const productId of data.productIds ?? []) {
        await tx.marketingCampaignProduct.create({
          data: { campaignId: campaign.id, productId },
        });
      }
      for (const contentId of data.contentIds ?? []) {
        await tx.marketingEvent.create({
          data: { campaignId: campaign.id, assetId: contentId, eventType: "content_linked" },
        });
      }
      for (const audienceId of data.audienceIds ?? []) {
        // Audiences handled differently now
      }

      return tx.marketingCampaign.findUnique({
        where: { id: campaign.id },
        include: {
          products: { include: { product: true } },
        },
      });
    });
  }

  async listCampaigns() {
    return this.prisma.marketingCampaign.findMany({
      include: {
        products: { include: { product: { select: { id: true, name: true } } } },
      },
    });
  }

  async ensureDefaultChannels() {
    const types = [
      "WEBSITE",
      "SOCIAL",
      "EMAIL",
      "OTHER",
    ] as const;
    for (const type of types) {
      const existing = await this.prisma.marketingChannel.findFirst({
        where: { type },
      });
      if (!existing) {
        await this.prisma.marketingChannel.create({
          data: { type, name: type },
        });
      }
    }
  }
}
