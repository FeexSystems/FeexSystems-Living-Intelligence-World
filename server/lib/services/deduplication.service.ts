/**
 * Knowledge Document Deduplication Service (Priority 3 — Nice-to-Have)
 *
 * Detects and merges duplicate knowledge documents based on content hash
 * similarity. Prevents storage of redundant documents and ensures chunks
 * are not duplicated across documents.
 */

import { prisma } from '../database';
import { logger } from '../logging';

/**
 * Result of deduplication analysis.
 */
export interface DeduplicationResult {
  totalDocuments: number;
  duplicateGroups: Array<{
    canonicalId: string;
    duplicateIds: string[];
    similarityScore: number;
  }>;
  mergedCount: number;
  spaceSavedBytes: number;
}

/**
 * Find potential duplicate documents based on content hash similarity.
 * Groups documents with identical contentHash values.
 */
export async function findDuplicateDocuments(
  teamId?: string
): Promise<DeduplicationResult> {
  const where = teamId ? { teamId } : {};

  const documents = await prisma.knowledgeDocument.findMany({
    where,
    select: {
      id: true,
      teamId: true,
      filename: true,
      contentHash: true,
      pageCount: true,
      createdAt: true,
      _count: { select: { chunks: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by contentHash.
  const hashGroups: Record<string, typeof documents> = {};
  for (const doc of documents) {
    const hash = doc.contentHash;
    if (!hashGroups[hash]) hashGroups[hash] = [];
    hashGroups[hash].push(doc);
  }

  const duplicateGroups: DeduplicationResult['duplicateGroups'] = [];
  let mergedCount = 0;
  let spaceSavedBytes = 0;

  for (const group of Object.values(hashGroups)) {
    if (group.length <= 1) continue;

    // Sort by createdAt — oldest is canonical.
    const sorted = [...group].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    // A group of >1 always yields at least one canonical row.
    const canonical = sorted[0];
    if (!canonical) continue;
    const duplicates = sorted.slice(1);

    // Calculate similarity (1.0 for exact hash match).
    const similarityScore = 1.0;

    duplicateGroups.push({
      canonicalId: canonical.id,
      duplicateIds: duplicates.map((d) => d.id),
      similarityScore,
    });

    // Estimate space saved (chunks * avg content length).
    const totalChunks = duplicates.reduce(
      (sum, d) => sum + d._count.chunks,
      0
    );
    void totalChunks;
    spaceSavedBytes += totalChunks * 500; // rough estimate: 500 bytes per chunk

    mergedCount += duplicates.length;

    logger.debug('[dedup] duplicate group found', {
      canonicalId: canonical.id,
      duplicateCount: duplicates.length,
      similarityScore,
    });
  }

  return {
    totalDocuments: documents.length,
    duplicateGroups,
    mergedCount,
    spaceSavedBytes,
  };
}

/**
 * Merge duplicate documents into the canonical document.
 * Deletes duplicate documents and repoints their chunks to canonical.
 */
export async function mergeDuplicateDocuments(
  canonicalId: string,
  duplicateIds: string[]
): Promise<void> {
  for (const dupId of duplicateIds) {
    // Repoint chunks from duplicate to canonical.
    await prisma.knowledgeDocumentChunk.updateMany({
      where: { documentId: dupId },
      data: { documentId: canonicalId },
    });

    // Delete the duplicate document.
    await prisma.knowledgeDocument.delete({
      where: { id: dupId },
    });

    logger.debug('[dedup] merged document', {
      duplicateId: dupId,
      canonicalId,
    });
  }
}