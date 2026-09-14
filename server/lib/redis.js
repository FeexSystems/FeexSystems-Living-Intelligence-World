import Redis from 'ioredis';

let redis = null;

export function createRedisClient() {
  if (redis) {
    return redis;
  }

  const redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379';

  redis = new Redis(redisUrl, {
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 5000,
    commandTimeout: 3000,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 2) return null; // Stop retrying after 2 attempts in local/offline dev
      return Math.min(times * 500, 2000);
    },
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  redis.on('error', (error) => {
    console.error('❌ Redis connection error:', error);
  });

  redis.on('close', () => {
    console.log('🔌 Redis connection closed');
  });

  return redis;
}

export function getRedisClient() {
  if (!redis) {
    return createRedisClient();
  }
  return redis;
}

// Cache utilities
export class CacheService {
  

  constructor() {
    this.redis = getRedisClient();
  }

  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttlSeconds) {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async increment(key, ttlSeconds) {
    try {
      const result = await this.redis.incr(key);
      if (ttlSeconds && result === 1) {
        await this.redis.expire(key, ttlSeconds);
      }
      return result;
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  async getKeys(pattern) {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      console.error('Cache keys error:', error);
      return [];
    }
  }
}

// Session management
export class SessionService extends CacheService {constructor(...args) { super(...args); SessionService.prototype.__init.call(this);SessionService.prototype.__init2.call(this); }
    __init() {this.SESSION_PREFIX = 'session:'}
    __init2() {this.SESSION_TTL = 24 * 60 * 60} // 24 hours

  async createSession(sessionId, userData) {
    return this.set(`${this.SESSION_PREFIX}${sessionId}`, userData, this.SESSION_TTL);
  }

  async getSession(sessionId) {
    return this.get(`${this.SESSION_PREFIX}${sessionId}`);
  }

  async updateSession(sessionId, userData) {
    return this.set(`${this.SESSION_PREFIX}${sessionId}`, userData, this.SESSION_TTL);
  }

  async deleteSession(sessionId) {
    return this.del(`${this.SESSION_PREFIX}${sessionId}`);
  }

  async extendSession(sessionId) {
    try {
      await this.redis.expire(`${this.SESSION_PREFIX}${sessionId}`, this.SESSION_TTL);
      return true;
    } catch (error) {
      console.error('Session extend error:', error);
      return false;
    }
  }
}

// Rate limiting
export class RateLimitService extends CacheService {constructor(...args2) { super(...args2); RateLimitService.prototype.__init3.call(this); }
    __init3() {this.RATE_LIMIT_PREFIX = 'rate_limit:'}

  async checkRateLimit(
    identifier,
    windowMs,
    maxRequests
  ) {
    const key = `${this.RATE_LIMIT_PREFIX}${identifier}`;
    const windowSeconds = Math.ceil(windowMs / 1000);

    try {
      const current = await this.increment(key, windowSeconds);
      const remaining = Math.max(0, maxRequests - current);
      const resetTime = Date.now() + windowMs;

      return {
        allowed: current <= maxRequests,
        remaining,
        resetTime
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Allow request on error to prevent blocking users
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: Date.now() + windowMs
      };
    }
  }
}

// Health check
export async function checkRedisHealth() {
  try {
    const redis = getRedisClient();
    await redis.ping();
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

// Cleanup function
export async function disconnectRedis() {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('✅ Redis disconnected successfully');
  }
}