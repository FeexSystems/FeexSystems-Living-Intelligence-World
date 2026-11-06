/**
 * Query Cache Service
 *
 * Redis-backed cache for frequently accessed read models:
 * - World Model graph
 * - Project lists
 * - Technology catalogs
 *
 * Falls back to in-memory cache when Redis is unavailable.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class QueryCacheService {
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTtlSeconds = 300;

  /**
   * Get a cached value.
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const entry = this.memoryCache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.value as T;
    }
    if (entry) {
      this.memoryCache.delete(key);
    }

    // Try Redis
    try {
      const { createRedisClient } = await import('../redis');
      const client = createRedisClient();
      if (client && typeof client.get === 'function') {
        const raw = await client.get(key);
        if (raw) {
          const parsed = JSON.parse(raw) as T;
          return parsed;
        }
      }
    } catch {
      // Redis unavailable, use memory only
    }

    return null;
  }

  /**
   * Set a cached value.
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.defaultTtlSeconds;
    const expiresAt = Date.now() + ttl * 1000;

    // Memory cache
    this.memoryCache.set(key, { value, expiresAt });

    // Try Redis
    try {
      const { createRedisClient } = await import('../redis');
      const client = createRedisClient();
      if (client && typeof client.set === 'function') {
        await client.set(key, JSON.stringify(value), 'EX', ttl);
      }
    } catch {
      // Redis unavailable, memory only
    }
  }

  /**
   * Invalidate a cached value.
   */
  async invalidate(key: string): Promise<void> {
    this.memoryCache.delete(key);
    try {
      const { createRedisClient } = await import('../redis');
      const client = createRedisClient();
      if (client && typeof client.del === 'function') {
        await client.del(key);
      }
    } catch {
      // Redis unavailable
    }
  }

  /**
   * Invalidate all keys matching a prefix.
   */
  async invalidatePrefix(prefix: string): Promise<void> {
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }
    try {
      const { createRedisClient } = await import('../redis');
      const client = createRedisClient();
      if (client && typeof client.keys === 'function') {
        const keys = await client.keys(`${prefix}*`);
        if (keys.length > 0) {
          await client.del(...keys);
        }
      }
    } catch {
      // Redis unavailable
    }
  }

  /**
   * Clear all cached values.
   */
  clear(): void {
    this.memoryCache.clear();
  }

  /**
   * Get cache statistics.
   */
  stats(): { memoryEntries: number; memorySize: number } {
    return {
      memoryEntries: this.memoryCache.size,
      memorySize: JSON.stringify([...this.memoryCache.entries()]).length,
    };
  }
}

export const queryCache = new QueryCacheService();
export default queryCache;

// Cache key builders
export const CacheKeys = {
  worldModelGraph: () => 'wm:graph',
  worldModelProjects: () => 'wm:projects',
  worldModelTechnologies: () => 'wm:technologies',
  projectEvidence: (projectId: string) => `wm:evidence:${projectId}`,
  embeddingStats: () => 'wm:embedding:stats',
};
