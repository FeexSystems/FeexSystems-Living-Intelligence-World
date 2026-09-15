 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }











export class MarketingService {
  constructor( prisma) {;this.prisma = prisma;}

  async listProducts() {
    return this.prisma.marketingProduct.findMany({
      orderBy: { name: "asc" },
      include: {
        features: true,
        worldModelProject: { select: { id: true, name: true, repository: true, url: true } },
      },
    });
  }

  async getProduct(id) {
    return this.prisma.marketingProduct.findUnique({
      where: { id },
      include: {
        features: true,
        claims: { include: { evidence: true } },
        worldModelProject: true,
      },
    });
  }

  async createProduct(data) {
    return this.prisma.marketingProduct.create({
      data: {
        name: data.name,
        description: data.description,
        worldModelProjectId: _nullishCoalesce(data.worldModelProjectId, () => ( null)),
        repositoryId: _nullishCoalesce(data.repositoryId, () => ( null)),
      },
    });
  }

  async listContent(filters) {
    return this.prisma.marketingContentAsset.findMany({
      where: {
        state: _optionalChain([filters, 'optionalAccess', _ => _.lifecycle]) === "IDEA" ? "DRAFT" : "PUBLISHED", // Or whatever logic
      },
      include: {
        topics: { include: { topic: { select: { id: true, name: true } } } },
      },
    });
  }

  async createContent(data) {
    return this.prisma.marketingContentAsset.create({
      data: {
        title: data.title,
        type: _nullishCoalesce(data.format, () => ( "DOCUMENT")),
        state: "DRAFT",
        content: _nullishCoalesce(data.body, () => ( null)),
        parentId: _nullishCoalesce(data.parentId, () => ( null)),
      },
    });
  }

  /**
   * Creates a claim only if at least one evidence link is provided.
   * Prefer worldModelEvidenceIds when proof lives in the World Model.
   */
  async createClaim(data) {
    const wmIds = _nullishCoalesce(data.worldModelEvidenceIds, () => ( []));
    const mktEv = _nullishCoalesce(data.marketingEvidence, () => ( []));

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
          productId: _nullishCoalesce(data.productId, () => ( "")),
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

  async listClaims(productId) {
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

  async createCampaign(data) {
    return this.prisma.$transaction(async (tx) => {
      const campaign = await tx.marketingCampaign.create({
        data: {
          name: data.name,
          description: data.objective,
        },
      });

      for (const productId of _nullishCoalesce(data.productIds, () => ( []))) {
        await tx.marketingCampaignProduct.create({
          data: { campaignId: campaign.id, productId },
        });
      }
      for (const contentId of _nullishCoalesce(data.contentIds, () => ( []))) {
        await tx.marketingEvent.create({
          data: { campaignId: campaign.id, assetId: contentId, eventType: "content_linked" },
        });
      }
      for (const audienceId of _nullishCoalesce(data.audienceIds, () => ( []))) {
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
    ] ;
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
