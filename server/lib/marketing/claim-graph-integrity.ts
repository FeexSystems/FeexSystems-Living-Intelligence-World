/**
 * Phase 2 — Claim graph integrity
 */
import type { PrismaClient, Prisma } from "@prisma/client";

export class ClaimGraphIntegrity {
  constructor(private prisma: PrismaClient) {}

  async findOrphanClaims(): Promise<string[]> {
    const claims = await this.prisma.marketingClaim.findMany({
      select: {
        id: true,
        evidence: { select: { id: true }, take: 1 },
      },
    });
    return claims.filter((c) => c.evidence.length === 0).map((c) => c.id);
  }

  async assertNoOrphanClaims(): Promise<void> {
    const orphans = await this.findOrphanClaims();
    if (orphans.length > 0) {
      throw new Error(
        `Claim graph integrity violation: ${orphans.length} claim(s) without evidence: ${orphans.slice(0, 5).join(", ")}`
      );
    }
  }

  async claimsDependingOnEvidence(params: {
    worldModelEvidenceId?: string;
    marketingEvidenceId?: string;
  }) {
    const where: Prisma.MarketingClaimEvidenceWhereInput = {};
    if (params.worldModelEvidenceId) where.worldModelEvidenceId = params.worldModelEvidenceId;
    if (params.marketingEvidenceId) where.marketingEvidenceId = params.marketingEvidenceId;
    if (!params.worldModelEvidenceId && !params.marketingEvidenceId) {
      throw new Error("Provide worldModelEvidenceId or marketingEvidenceId");
    }

    const links = await this.prisma.marketingClaimEvidence.findMany({
      where,
      include: {
        claim: {
          include: {
            product: { select: { id: true, name: true } },
          },
        },
      },
    });

    return links.map((l) => ({
      claimId: l.claimId,
      statement: l.claim.statement,
      isVerified: l.claim.isVerified,
      product: l.claim.product,
    }));
  }

  async propagateEvidenceChange(params: {
    worldModelEvidenceId?: string;
    marketingEvidenceId?: string;
    actorId?: string;
  }): Promise<{ updatedClaimIds: string[] }> {
    const deps = await this.claimsDependingOnEvidence(params);
    const ids = deps.map((d) => d.claimId);
    if (ids.length === 0) return { updatedClaimIds: [] };

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      // Assuming a "refresh" of evidence implies updating updatedAt
      await tx.marketingClaim.updateMany({
        where: { id: { in: ids } },
        data: { updatedAt: now },
      });
      for (const claimId of ids) {
        await tx.marketingClaimAudit.create({
          data: {
            claimId,
            action: "evidence_propagated",
            metadata: {
              actorId: params.actorId ?? null,
              worldModelEvidenceId: params.worldModelEvidenceId ?? null,
              marketingEvidenceId: params.marketingEvidenceId ?? null,
              propagatedAt: now.toISOString(),
            },
            occurredAt: now,
          },
        });
      }
    });
    return { updatedClaimIds: ids };
  }
}
