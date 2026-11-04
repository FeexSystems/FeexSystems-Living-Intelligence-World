import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { MarketingHybridRetrievalService } from "../marketing-hybrid-retrieval.service";
import * as embeddingService from "../../services/embedding.service";

// Mock the PrismaClient
vi.mock("@prisma/client", () => {
  const mockPrisma = {
    marketingClaim: {
      findMany: vi.fn(),
    },
    marketingContentAsset: {
      findMany: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

// Mock the embedding service
vi.mock("../../services/embedding.service", () => {
  return {
    similaritySearch: vi.fn(),
  };
});

describe.skip("MarketingHybridRetrievalService", () => {
  let prisma;
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = new PrismaClient();
    service = new MarketingHybridRetrievalService(prisma);
  });

  describe("searchClaims", () => {
    it("should retrieve semantic hits and hydrate them from DB", async () => {
      // Mock similarity search
      vi.mocked(embeddingService.similaritySearch).mockResolvedValue([
        {
          entityType: "claim",
          entityId: "claim_1",
          content: "Fast AI processing",
          score: 0.95,
        },
        {
          entityType: "claim",
          entityId: "claim_2",
          content: "Secure infrastructure",
          score: 0.82,
        },
      ]);

      // Mock DB hydration
      const mockClaims = [
        {
          id: "claim_1",
          statement: "Fast AI processing",
          product: { id: "prod_1", name: "Vyra AI" },
          evidence: [
            {
              id: "ev_1",
              worldModelEvidence: { id: "wm_ev_1" },
            },
          ],
        },
        {
          id: "claim_2",
          statement: "Secure infrastructure",
          product: { id: "prod_2", name: "Vyra Core" },
          evidence: [],
        },
      ];

      (prisma.marketingClaim.findMany ).mockResolvedValue(mockClaims);

      const result = await service.searchClaims("fast ai");

      // Verify embedding service called
      expect(embeddingService.similaritySearch).toHaveBeenCalledWith("fast ai", {
        entityTypes: ["claim"],
        limit: 10,
      });

      // Verify DB queried with proper includes
      expect(prisma.marketingClaim.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["claim_1", "claim_2"] } },
        include: {
          product: true,
          evidence: {
            include: {
              worldModelEvidence: true,
              marketingEvidence: true,
            },
          },
          aboutLinks: {
            include: {
              feature: true,
              technology: true,
            },
          },
        },
      });

      // Verify returned objects
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("claim_1");
      expect(result[0]._semanticScore).toBe(0.95);
      expect(result[0].evidence[0].worldModelEvidence.id).toBe("wm_ev_1");
    });

    it("should return empty array if no semantic hits", async () => {
      vi.mocked(embeddingService.similaritySearch).mockResolvedValue([]);

      const result = await service.searchClaims("no matches");

      expect(result).toEqual([]);
      expect(prisma.marketingClaim.findMany).not.toHaveBeenCalled();
    });
  });

  describe("searchContent", () => {
    it("should retrieve semantic hits and hydrate them from DB", async () => {
      // Mock similarity search
      vi.mocked(embeddingService.similaritySearch).mockResolvedValue([
        {
          entityType: "content_asset",
          entityId: "asset_1",
          content: "Blog post content",
          score: 0.88,
        },
      ]);

      // Mock DB hydration
      const mockAssets = [
        {
          id: "asset_1",
          title: "Blog Post",
          topics: [
            {
              topic: { id: "top_1", name: "AI" },
            },
          ],
        },
      ];

      (prisma.marketingContentAsset.findMany ).mockResolvedValue(mockAssets);

      const result = await service.searchContent("blog");

      expect(embeddingService.similaritySearch).toHaveBeenCalledWith("blog", {
        entityTypes: ["content_asset"],
        limit: 10,
      });

      expect(prisma.marketingContentAsset.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["asset_1"] } },
        include: {
          parent: true,
          topics: {
            include: {
              topic: true,
            },
          },
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("asset_1");
      expect(result[0]._semanticScore).toBe(0.88);
      expect(result[0].topics[0].topic.name).toBe("AI");
    });
  });
});
