import type { PrismaClient } from "@prisma/client";
import { similaritySearch } from "../services/embedding.service";

export class MarketingHybridRetrievalService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Search for MarketingClaims combining semantic vector search and structural db hydration.
   * ALWAYS returns full evidence graph (Provenance invariant).
   */
  async searchClaims(query: string, limit = 10) {
    // 1. Get semantic hits for claims
    const hits = await similaritySearch(query, {
      entityTypes: ["claim"],
      limit,
    });

    if (!hits.length) return [];

    const claimIds = hits.map((h) => h.entityId);

    // 2. Hydrate from DB with full evidence provenance
    const claims = await this.prisma.marketingClaim.findMany({
      where: {
        id: { in: claimIds }
      },
      include: {
        product: true,
        evidence: {
          include: {
            worldModelEvidence: true,
            marketingEvidence: true
          }
        },
        aboutLinks: {
          include: {
            feature: true
          }
        }
      }
    });

    // 3. Re-sort based on semantic similarity score
    const claimMap = new Map(claims.map((c) => [c.id, c]));
    
    return hits
      .map((h) => ({
        ...claimMap.get(h.entityId),
        _semanticScore: h.score,
      }))
      .filter((c) => c.id); // Remove any that were missing in DB
  }

  /**
   * Search for Content Assets using semantic search.
   */
  async searchContent(query: string, limit = 10) {
    // 1. Get semantic hits for content
    const hits = await similaritySearch(query, {
      entityTypes: ["content_asset"],
      limit,
    });

    if (!hits.length) return [];

    const assetIds = hits.map((h) => h.entityId);

    // 2. Hydrate from DB
    const assets = await this.prisma.marketingContentAsset.findMany({
      where: {
        id: { in: assetIds }
      },
      include: {
        parent: true,
        topics: {
          include: {
            topic: true
          }
        }
      }
    });

    // 3. Sort by score
    const assetMap = new Map(assets.map((a) => [a.id, a]));

    return hits
      .map((h) => ({
        ...assetMap.get(h.entityId),
        _semanticScore: h.score,
      }))
      .filter((a) => a.id);
  }

  /**
   * Search for MarketingCampaigns using semantic search.
   * Hydrated with the campaign's product links (graph, not list).
   */
  async searchCampaigns(query: string, limit = 10) {
    // 1. Get semantic hits for campaigns
    const hits = await similaritySearch(query, {
      entityTypes: ["campaign"],
      limit,
    });

    if (!hits.length) return [];

    const campaignIds = hits.map((h) => h.entityId);

    // 2. Hydrate from DB with product relations
    const campaigns = await this.prisma.marketingCampaign.findMany({
      where: {
        id: { in: campaignIds }
      },
      include: {
        products: {
          include: {
            product: true
          }
        }
      }
    });

    // 3. Sort by score
    const campaignMap = new Map(campaigns.map((c) => [c.id, c]));

    return hits
      .map((h) => ({
        ...campaignMap.get(h.entityId),
        _semanticScore: h.score,
      }))
      .filter((c) => c.id);
  }
}
