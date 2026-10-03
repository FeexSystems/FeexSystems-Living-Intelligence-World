import { getRedisClient } from '../redis';
import { logger } from '../logging';

export class CacheService {
  private get client() {
    return getRedisClient();
  }
  private readonly DEFAULT_TTL = 3600; // 1 hour in seconds

  constructor() {}

  async connect() {
    try {
      if (this.client.status === 'wait') {
        await this.client.connect();
      }
    } catch {
      // Lazy connection fallback
    }
  }

  async disconnect() {
    try {
      if (this.client.status === 'ready' || this.client.status === 'connecting') {
        await this.client.quit();
      }
    } catch {
      // Ignored during shutdown
    }
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set data in cache with optional TTL
   */
  async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  /**
   * Delete data from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await this.client.flushall();
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  /**
   * Get or set cache with callback
   */
  async getOrSet<T>(key: string, callback: () => Promise<T>, ttl?: number): Promise<T> {
    try {
      const cachedData = await this.get<T>(key);
      if (cachedData) {
        return cachedData;
      }

      const freshData = await callback();
      await this.set(key, freshData, ttl);
      return freshData;
    } catch (error) {
      logger.error('Cache getOrSet error:', error);
      return await callback();
    }
  }

  /**
   * Cache keys for different data types
   */
  static keys = {
    userProfile: (userId: string) => `user:${userId}:profile`,
    userSubscription: (userId: string) => `user:${userId}:subscription`,
    plan: (planId: string) => `plan:${planId}`,
    aiService: (serviceId: string) => `ai:service:${serviceId}`,
    securityScan: (scanId: string) => `security:scan:${scanId}`,
    teamMembers: (teamId: string) => `team:${teamId}:members`,
    metrics: (userId: string, type: string) => `metrics:${userId}:${type}`,
    worldModelGraph: () => 'world_model:graph'
  };

  /**
   * TTL configurations for different data types
   */
  static ttl = {
    userProfile: 3600, // 1 hour
    subscription: 1800, // 30 minutes
    plan: 86400, // 24 hours
    aiService: 3600, // 1 hour
    securityScan: 300, // 5 minutes
    teamMembers: 1800, // 30 minutes
    metrics: 300 // 5 minutes
  };
}

// Export singleton instance
export const cacheService = new CacheService();
