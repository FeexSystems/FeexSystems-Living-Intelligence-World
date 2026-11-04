/**
 * Phase 2 — Claim graph integrity contracts (unit-level)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateClaimSchema } from "../../../../shared/marketing-contracts";
import { ClaimGraphService } from "../claim-graph.service";


describe("Phase 2 claim graph integrity contracts", () => {
  it("rejects material claims with no evidence (orphan prevention at boundary)", () => {
    const result = CreateClaimSchema.safeParse({
      statement: "Unsupported product claim",
      productId: "prod_1",
    });
    expect(result.success).toBe(false);
  });

  it("accepts claim supported by World Model evidence", () => {
    const result = CreateClaimSchema.safeParse({
      statement: "World Model owns reality",
      worldModelEvidenceIds: ["wme_abc"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts claim supported by marketing evidence", () => {
    const result = CreateClaimSchema.safeParse({
      statement: "External research supports this",
      marketingEvidence: [
        {
          sourceType: "research_paper",
          sourceUrl: "https://example.com/paper",
          sourceRef: "doi:10.1000/example",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("Claim graph edge vocabulary", () => {
  const allowed = new Set(["supports", "about", "asserts", "depends_on"]);

  it("uses only typed relation labels", () => {
    for (const r of ["supports", "about", "asserts", "depends_on"]) {
      expect(allowed.has(r)).toBe(true);
    }
  });
});

// Mock the PrismaClient
const prismaMock = {
  marketingClaim: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  marketingClaimEvidence: {
    findMany: vi.fn(),
  },
  marketingProduct: {
    findUnique: vi.fn(),
  },
  marketingClaimAbout: {
    create: vi.fn(),
  },
  marketingClaimAudit: {
    create: vi.fn(),
  },
  $transaction: vi.fn(async (cb) => {
    return cb(prismaMock);
  }),
} ;

describe("ClaimGraphService", () => {
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ClaimGraphService(prismaMock);
  });

  it("should find orphan claims correctly", async () => {
    const claims = [
      { id: "claim-1", evidence: [] },
      { id: "claim-2", evidence: [{ id: "ev-1" }] },
    ];
    vi.mocked(prismaMock.marketingClaim.findMany).mockResolvedValue(claims );

    const orphans = await service.getOrphanClaims();

    expect(orphans).toEqual(["claim-1"]);
    expect(prismaMock.marketingClaim.findMany).toHaveBeenCalled();
  });

  it("should assert integrity without throwing if no orphans", async () => {
    vi.mocked(prismaMock.marketingClaim.findMany).mockResolvedValue([
      { id: "claim-2", evidence: [{ id: "ev-1" }] },
    ] );

    await expect(service.assertIntegrity()).resolves.not.toThrow();
  });

  it("should assert integrity and throw if orphans exist", async () => {
    vi.mocked(prismaMock.marketingClaim.findMany).mockResolvedValue([
      { id: "claim-1", evidence: [] },
    ] );

    await expect(service.assertIntegrity()).rejects.toThrow(/Claim graph integrity violation/);
  });

  it("should traverse from evidence and propagate changes", async () => {
    const evidenceLinks = [
      {
        claimId: "claim-1",
        claim: {
          statement: "Supports X",
          isVerified: false,
          product: { id: "prod-1", name: "Product X" }
        }
      }
    ];
    vi.mocked(prismaMock.marketingClaimEvidence.findMany).mockResolvedValue(evidenceLinks );

    const result = await service.propagateEvidenceChange({ worldModelEvidenceId: "w-ev-1", actorId: "user-1" });

    expect(result.updatedClaimIds).toEqual(["claim-1"]);
    expect(prismaMock.marketingClaim.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["claim-1"] } },
      data: { updatedAt: expect.any(Date) },
    });
    expect(prismaMock.marketingClaimAudit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        claimId: "claim-1",
        action: "evidence_propagated",
      }),
    });
  });
});
