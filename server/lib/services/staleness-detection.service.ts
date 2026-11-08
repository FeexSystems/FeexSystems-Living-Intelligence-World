/**
 * Staleness Detection Service (Priority 3 — Nice-to-Have)
 *
 * Detects WorldModelInterpretation records that have become stale because
 * the underlying World Model (projects, evidence, artifacts) has changed
 * since the interpretation was created. Stale interpretations should be
 * flagged for re-evaluation.
 */

import { prisma } from '../database';
import { logger } from '../logging';

/**
 * Result of staleness check for an interpretation.
 */
export interface StalenessResult {
  interpretationId: string;
  isStale: boolean;
  reason?: string;
  lastEvidenceUpdate: Date | null;
  interpretationCreatedAt: Date;
  hoursSinceEvidenceChange: number;
}

/**
 * Check if a WorldModelInterpretation is stale compared to the latest
 * evidence update for its project.
 */
export async function checkInterpretationStaleness(
  interpretationId: string
): Promise<StalenessResult> {
  const interpretation = await prisma.worldModelInterpretation.findUnique({
    where: { id: interpretationId },
    include: { project: true },
  });

  if (!interpretation) {
    return {
      interpretationId,
      isStale: true,
      reason: 'Interpretation not found',
      lastEvidenceUpdate: null,
      interpretationCreatedAt: new Date(),
      hoursSinceEvidenceChange: 0,
    };
  }

  // Find the latest evidence update for this project.
  const latestEvidence = await prisma.worldModelEvidence.findFirst({
    where: { projectId: interpretation.projectId },
    orderBy: { observedAt: 'desc' },
    select: { observedAt: true },
  });

  const lastEvidenceUpdate = latestEvidence?.observedAt ?? null;
  const interpretationCreatedAt = interpretation.createdAt;
  const hoursSinceEvidenceChange =
    lastEvidenceUpdate &&
    interpretationCreatedAt < lastEvidenceUpdate
      ? (lastEvidenceUpdate.getTime() - interpretationCreatedAt.getTime()) /
        (1000 * 60 * 60)
      : 0;

  // An interpretation is stale if evidence was updated after it was created
  // AND more than 24 hours have passed since the evidence change.
  const isStale =
    lastEvidenceUpdate &&
    interpretationCreatedAt < lastEvidenceUpdate &&
    hoursSinceEvidenceChange > 24;

  return {
    interpretationId,
    isStale,
    reason: isStale
      ? `Evidence updated ${hoursSinceEvidenceChange.toFixed(1)} hours after interpretation was created`
      : undefined,
    lastEvidenceUpdate,
    interpretationCreatedAt,
    hoursSinceEvidenceChange,
  };
}

/**
 * Find all stale interpretations for a project (call from maintenance scheduler).
 */
export async function findStaleInterpretations(
  projectId: string
): Promise<StalenessResult[]> {
  const interpretations = await prisma.worldModelInterpretation.findMany({
    where: { projectId },
  });

  const results: StalenessResult[] = [];
  for (const interp of interpretations) {
    const result = await checkInterpretationStaleness(interp.id);
    if (result.isStale) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Mark an interpretation as stale (adds a metadata flag).
 */
export async function markInterpretationStale(
  interpretationId: string
): Promise<void> {
  try {
    await prisma.worldModelInterpretation.update({
      where: { id: interpretationId },
      data: {
        claims: {
          // Append a stale flag to existing claims JSON.
          // Prisma JSON update would require set; we use a raw update.
        } as any,
        limitations: {
          push: [
            {
              type: 'STALE',
              message:
                'Interpretation may be stale — underlying evidence has changed since creation',
              detectedAt: new Date().toISOString(),
            },
          ],
        } as any,
      },
    });
    logger.debug('[staleness] interpretation marked stale', { interpretationId });
  } catch (error) {
    logger.warn('[staleness] failed to mark interpretation stale', {
      interpretationId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}