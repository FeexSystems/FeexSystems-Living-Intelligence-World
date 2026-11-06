/**
 * Centralized Configuration
 *
 * Extracts all hardcoded model names, endpoints, and magic numbers
 * into a single configuration module driven by environment variables.
 */

export const config = {
  // ─── AI Models ────────────────────────────────────────────────────────
  ai: {
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'gemini',
    openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
    embeddingDim: Number(process.env.WORLD_MODEL_EMBEDDING_DIM || 1536),
  },

  // ─── API Endpoints ────────────────────────────────────────────────────
  endpoints: {
    openaiEmbeddings: process.env.OPENAI_EMBEDDINGS_URL || 'https://api.openai.com/v1/embeddings',
    geminiBase: process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta',
  },

  // ─── Pagination & Limits ──────────────────────────────────────────────
  pagination: {
    defaultPageSize: Number(process.env.DEFAULT_PAGE_SIZE || 20),
    maxPageSize: Number(process.env.MAX_PAGE_SIZE || 100),
    embeddingBatchSize: Number(process.env.EMBEDDING_BATCH_SIZE || 10),
    embeddingDelayMs: Number(process.env.EMBEDDING_DELAY_MS || 100),
    maxEmbeddingRows: Number(process.env.MAX_EMBEDDING_ROWS || 200),
  },

  // ─── Timeouts ─────────────────────────────────────────────────────────
  timeouts: {
    aiConcurrencyTimeoutMs: Number(process.env.AI_CONCURRENCY_TIMEOUT_MS || 30000),
    circuitBreakerResetMs: Number(process.env.CIRCUIT_BREAKER_RESET_MS || 30000),
    circuitBreakerThreshold: Number(process.env.CIRCUIT_BREAKER_THRESHOLD || 5),
  },

  // ─── Cache ────────────────────────────────────────────────────────────
  cache: {
    worldModelGraphTtl: Number(process.env.WM_GRAPH_CACHE_TTL || 300),
    worldModelProjectsTtl: Number(process.env.WM_PROJECTS_CACHE_TTL || 300),
  },

  // ─── Maintenance ──────────────────────────────────────────────────────
  maintenance: {
    hours: Number(process.env.WORLD_MODEL_MAINTENANCE_HOURS || 0),
    onBoot: process.env.WORLD_MODEL_MAINTENANCE_ON_BOOT === 'true',
    eventRetentionDays: Number(process.env.EVENT_RETENTION_DAYS || 90),
  },
} as const;

export type AppConfig = typeof config;
export default config;
