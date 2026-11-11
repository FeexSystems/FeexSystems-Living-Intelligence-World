/**
 * World Model Gateway
 *
 * Facade over world-model services (github-pinned, hybrid-retrieval, embedding).
 * Decouples route handlers from direct service imports.
 */

import {
  getPinnedWorldModelProjects,
  getWorldModelGraph,
  getProjectEvidence,
  verifyRepositoryCommit,
  syncPinnedProjects,
  getArtifactContent,
} from '../services/github-pinned.service';

import { retrieveWorldHybrid } from '../services/hybrid-retrieval.service';

import {
  reindexWorldModelEmbeddings,
  ensureEmbeddingTables,
} from '../services/embedding.service';

// ─── Project Queries ───────────────────────────────────────────────────────

export const worldModelGateway = {
  // Project queries
  getProjects: getPinnedWorldModelProjects,
  getGraph: getWorldModelGraph,
  getEvidence: getProjectEvidence,
  verifyCommit: verifyRepositoryCommit,
  getArtifactContent,

  // Sync operations
  sync: syncPinnedProjects,

  // Search/retrieval
  search: retrieveWorldHybrid,

  // Embedding operations
  reindexEmbeddings: reindexWorldModelEmbeddings,
  ensureEmbeddingTables,
};
