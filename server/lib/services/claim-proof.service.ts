/**
 * Claim Proof Verification Service (Priority 2 — Important)
 *
 * Verifies that claims made in WorldModelInterpretation records are backed by
 * actual evidence in the Evidence Fabric. Implements the "Evidence, Not Claims"
 * principle: an interpretation must never be treated as fact without
 * traceable evidence provenance.
 */

import { prisma } from '../database';
import { logger } from '../logging';

/**
 * Result of claim proof verification.
 */
export interface ClaimProofResult {
  /** Whether all claims have supporting evidence. */
  allClaimsSupported: boolean;
  /** Per-claim verification results. */
  claimResults: Array<{
    claimIndex: number;
    statement: string;
    supported: boolean;
    evidenceCount: number;
    evidenceIds: string[];
  }>;
  /** Overall confidence adjustment based on evidence. */
  adjustedConfidence: number;
}

/**
 * Verify that claims in a WorldModelInterpretation are backed by evidence.
 *
 * Checks the evidence_fabric ledger (world_model_evidence table) for
 * records matching the projectId and claim keywords.
 */
export async function verifyClaimProofs(
  projectId: string,
  claims: string[]
): Promise<ClaimProofResult> {
  const claimResults: ClaimProofResult['claimResults'] = [];
  let supportedCount = 0;

  for (let i = 0; i < claims.length; i++) {
    const statement = claims[i];
    const keywords = statement
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    // Query evidence for this project matching claim keywords.
    const evidence = await prisma.worldModelEvidence.findMany({
      where: {
        projectId,
        OR: keywords.map((kw) => ({
          sourceUrl: { contains: kw },
          sourceRef: { contains: kw },
        })),
      },
      select: { id: true, sourceUrl: true, sourceRef: true, evidenceType: true },
      take: 10,
    });

    const supported = evidence.length > 0;
    if (supported) supportedCount++;

    claimResults.push({
      claimIndex: i,
      statement,
      supported,
      evidenceCount: evidence.length,
      evidenceIds: evidence.map((e) => e.id),
    });
  }

  const allClaimsSupported = claimResults.every((r) => r.supported);
  // Adjust confidence: if no claims supported, reduce confidence significantly.
  const baseConfidence = 1.0;
  const evidenceRatio = claims.length > 0 ? supportedCount / claims.length : 0;
  const adjustedConfidence = Math.round(baseConfidence * evidenceRatio * 100) / 100;

  logger.debug('[claim-proof] verification completed', {
    projectId,
    claimCount: claims.length,
    supportedCount,
    allClaimsSupported,
    adjustedConfidence,
  });

  return {
    allClaimsSupported,
    claimResults,
    adjustedConfidence,
  };
}

/**
 * Gate function: determines whether an interpretation can be marked as
 * "supported" based on claim proof results.
 */
export function isInterpretationSupported(
  result: ClaimProofResult,
  minConfidence: number = 0.7
): boolean {
  return result.allClaimsSupported && result.adjustedConfidence >= minConfidence;
}