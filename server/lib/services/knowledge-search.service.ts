/**
 * Knowledge Document Search & Filter Service (Priority 2 — Important)
 *
 * Provides search, filter, and faceted navigation for knowledge documents
 * across all teams. Supports full-text search, status filtering, and
 * extraction method filtering.
 */

import { prisma } from '../database';
import { KnowledgeDocumentStatus, KnowledgeExtractionMethod } from '@prisma/client';

/**
 * Search and filter options for knowledge documents.
 */
export interface KnowledgeSearchOptions {
  teamId?: string;
  query?: string;
  status?: KnowledgeDocumentStatus;
  extractionMethod?: KnowledgeExtractionMethod;
  createdByUserId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'contentHash' | 'pageCount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated search result.
 */
export interface KnowledgeSearchResult {
  documents: Array<{
    id: string;
    teamId: string;
    filename: string;
    contentHash: string;
    status: KnowledgeDocumentStatus;
    extractionMethod: KnowledgeExtractionMethod;
    pageCount: number | null;
    error: string | null;
    createdByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
    chunkCount: number;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    status: Record<string, number>;
    extractionMethod: Record<string, number>;
  };
}

/**
 * Search knowledge documents with filtering and pagination.
 */
export async function searchKnowledgeDocuments(
  options: KnowledgeSearchOptions
): Promise<KnowledgeSearchResult> {
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
  const where: any = {};
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

  const statusFacets: Record<string, number> = {};
  const methodFacets: Record<string, number> = {};

  for (const doc of allDocs) {
    statusFacets[doc.status] = (statusFacets[doc.status] || 0) + 1;
    methodFacets[doc.extractionMethod] = (methodFacets[doc.extractionMethod] || 0) + 1;
  }

  return {
    documents: documents.map((d) => ({
      id: d.id,
      teamId: d.teamId,
      filename: d.filename,
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