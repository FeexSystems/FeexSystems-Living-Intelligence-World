import type { PrismaClient } from "@prisma/client";
import { ClaimGraphIntegrity } from "./claim-graph-integrity";

export class ClaimGraphService {
  private integrity: ClaimGraphIntegrity;

  constructor(private prisma: PrismaClient) {
    this.integrity = new ClaimGraphIntegrity(prisma);
  }

  // Capability 08: Orphan detection
  async getOrphanClaims() {
    return this.integrity.findOrphanClaims();
  }

  // Capability 08: Integrity Check
  async assertIntegrity() {
    return this.integrity.assertNoOrphanClaims();
  }

  // Capability 35: Neighborhood graph
  async getClaimNeighborhood(claimId: string) {
    const claim = await this.prisma.marketingClaim.findUnique({
      where: { id: claimId },
      include: {
        product: true,
        evidence: {
          include: {
            worldModelEvidence: true,
            marketingEvidence: true,
          }
        },
        aboutLinks: {
          include: {
            feature: true,
          }
        },
      }
    });

    if (!claim) {
      throw new Error(`Claim not found: ${claimId}`);
    }

    return claim;
  }

  // Capability 35: Product claim graph
  async getProductClaimGraph(productId: string) {
    return this.prisma.marketingProduct.findUnique({
      where: { id: productId },
      include: {
        claims: {
          include: {
            evidence: true,
            aboutLinks: true,
          }
        },
        features: true,
      }
    });
  }

  // Capability 35: Link claim -> feature/technology
  async linkClaimAbout(claimId: string, params: { featureId?: string; technologyId?: string }) {
    if (!params.featureId && !params.technologyId) {
      throw new Error("Provide featureId or technologyId");
    }

    return this.prisma.marketingClaimAbout.create({
      data: {
        claimId,
        featureId: params.featureId ?? null,
        technologyId: params.technologyId ?? null,
      }
    });
  }

  // Capability 35: BFS Traversal from Evidence -> Claims -> Content
  // Simplified version returning connected paths
  async traverseFromEvidence(params: { worldModelEvidenceId?: string; marketingEvidenceId?: string }) {
    const deps = await this.integrity.claimsDependingOnEvidence(params);
    
    // In a real BFS we'd expand out to campaigns, events, etc.
    // For now we map to the claims and their products.
    return {
      evidenceRoot: params,
      impactedClaims: deps.map(d => ({
        claimId: d.claimId,
        statement: d.statement,
        product: d.product
      })),
    };
  }

  // Capability 45: Evidence Freshness & Dependency Propagation
  async propagateEvidenceChange(params: { worldModelEvidenceId?: string; marketingEvidenceId?: string; actorId?: string }) {
    return this.integrity.propagateEvidenceChange(params);
  }
}
