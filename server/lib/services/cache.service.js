import { getRedisClient } from '../redis';
import { logger } from '../logging';

export class CacheService {
   get client() {
    return getRedisClient();
  }
    __init() {this.DEFAULT_TTL = 3600} // 1 hour in seconds

  constructor() {;CacheService.prototype.__init.call(this);}

  async connect() {
    try {
      if (this.client.status === 'wait') {
        await this.client.connect();
      }
    } catch (e) {
      // Lazy connection fallback
    }
  }

  async disconnect() {
    try {
      if (this.client.status === 'ready' || this.client.status === 'connecting') {
        await this.client.quit();
      }
    } catch (e2) {
      // Ignored during shutdown
    }
  }

  /**
   * Get data from cache
   */
  async get(key) {
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
  async set(key, value, ttl = this.DEFAULT_TTL) {
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
  async del(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      await this.client.flushall();
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  /**
   * Get or set cache with callback
   */
  async getOrSet(key, callback, ttl) {
    try {
      const cachedData = await this.get(key);
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
  static __initStatic() {this.keys = {
    userProfile: (userId) => `user:${userId}:profile`,
    userSubscription: (userId) => `user:${userId}:subscription`,
    plan: (planId) => `plan:${planId}`,
    aiService: (serviceId) => `ai:service:${serviceId}`,
    securityScan: (scanId) => `security:scan:${scanId}`,
    teamMembers: (teamId) => `team:${teamId}:members`,
    metrics: (userId, type) => `metrics:${userId}:${type}`
  }}

  /**
   * TTL configurations for different data types
   */
  static __initStatic2() {this.ttl = {
    userProfile: 3600, // 1 hour
    subscription: 1800, // 30 minutes
    plan: 86400, // 24 hours
    aiService: 3600, // 1 hour
    securityScan: 300, // 5 minutes
    teamMembers: 1800, // 30 minutes
    metrics: 300 // 5 minutes
  }}
} CacheService.__initStatic(); CacheService.__initStatic2();

// Export singleton instance
export const cacheService = new CacheService();
