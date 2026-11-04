/**
 * Knowledge Document Search & Filter Service (Priority 2 — Important)
 *
 * Provides search, filter, and faceted navigation for knowledge documents
 * across all teams. Supports full-text search, status filtering, and
 * extraction method filtering.
 */

import { prisma } from '../database';


/**
 * Search and filter options for knowledge documents.
 */








































/**
 * Search knowledge documents with filtering and pagination.
 */
export async function searchKnowledgeDocuments(
  options
) {
  const {
    teamId,
    query,
    status,
    extractionMethod,
    createdByUserId,
    page = 1,
    pageSize = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const skip = (page - 1) * pageSize;

  // Build where clause.
  const where = {};
  if (teamId) where.teamId = teamId;
  if (status) where.status = status;
  if (extractionMethod) where.extractionMethod = extractionMethod;
  if (createdByUserId) where.createdByUserId = createdByUserId;

  // Full-text search on title and content hash.
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { contentHash: { contains: query, mode: 'insensitive' } },
      { error: { contains: query, mode: 'insensitive' } },
    ];
  }

  // Count total for pagination.
  const total = await prisma.knowledgeDocument.count({ where });

  // Fetch documents with chunk counts.
  const documents = await prisma.knowledgeDocument.findMany({
    where,
    skip,
    take: pageSize,
    orderBy: { [sortBy]: sortOrder },
    include: {
      _count: { select: { chunks: true } },
    },
  });

  // Compute facets.
  const allDocs = await prisma.knowledgeDocument.findMany({
    where: { teamId },
    select: { status: true, extractionMethod: true },
  });

  const statusFacets = {};
  const methodFacets = {};

  for (const doc of allDocs) {
    statusFacets[doc.status] = (statusFacets[doc.status] || 0) + 1;
    methodFacets[doc.extractionMethod] = (methodFacets[doc.extractionMethod] || 0) + 1;
  }

  return {
    documents: documents.map((d) => ({
      id: d.id,
      teamId: d.teamId,
      title: d.title,
      contentHash: d.contentHash,
      status: d.status,
      extractionMethod: d.extractionMethod,
      pageCount: d.pageCount,
      error: d.error,
      createdByUserId: d.createdByUserId,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      chunkCount: d._count.chunks,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    facets: {
      status: statusFacets,
      extractionMethod: methodFacets,
    },
  };
}