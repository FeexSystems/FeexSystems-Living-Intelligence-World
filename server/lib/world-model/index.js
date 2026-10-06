/**
 * World Model service facade — split entry points over the legacy monolith.
 *
 * Prefer importing from these submodules going forward:
 *   discovery  — pinned repo discovery
 *   sync       — repository analysis + webhook processing
 *   retrieve   — projects, graph, navigator keyword path
 *
 * Implementation still lives in github-pinned.service.ts until further extraction.
 */

export {
  // discovery
  discoverPinnedRepositories,
  ensureWorldModelTables,
  // sync
  syncPinnedProjects,
  syncRepository,
  processWebhook,
  verifyGitHubSignature,
  // retrieve
  getPinnedWorldModelProjects,
  getWorldModelGraph,
  retrieveWorld,
  getProjectEvidence,
  getAllProjectsEvidenceSummary,
  getArtifactContent,
  computeGitBlobSha,
} from "../services/github-pinned.service";

export { retrieveWorldHybrid } from "../services/hybrid-retrieval.service";
export {
  ensureEmbeddingTables,
  reindexWorldModelEmbeddings,
  similaritySearch,
  upsertEmbedding,
} from "../services/embedding.service";
export {
  reconstructProjectState,
  listProjectEvents,
} from "../services/temporal-reconstruction.service";
export {
  provisionWebhooksForWorldModel,
  createOrUpdateWorldModelWebhook,
  listRepoWebhooks,
} from "../services/webhook-provisioning.service";
export {
  runWorldModelMaintenance,
  startWorldModelMaintenanceScheduler,
  getLastMaintenanceReport,
} from "../services/world-model-maintenance.service";
