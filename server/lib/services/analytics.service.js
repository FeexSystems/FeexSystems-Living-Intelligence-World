 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { db } from '../database';
import { Redis } from 'ioredis';
import { z } from 'zod';

const redis = new Redis((process.env.REDIS_URL || 'redis://localhost:6379') );
















const EventSchema = z.object({
  userId: z.string(),
  eventType: z.string(),
  eventData: z.record(z.any()),
  timestamp: z.date().optional(),
});

export class AnalyticsService {
   static  __initStatic() {this.CACHE_TTL = 3600} // 1 hour

  /**
   * Track a user event
   */
  async trackEvent(event) {
    try {
      // Validate event data
      EventSchema.parse(event);

      // Store event in database
      await db.userEvent.create({
        data: {
          userId: event.userId,
          eventType: event.eventType ,
          eventData: event.eventData,
          timestamp: event.timestamp || new Date(),
        },
      });

      // Update real-time metrics in Redis
      await this.updateRealTimeMetrics(event);
    } catch (error) {
      console.error('Failed to track event:', error);
      throw new Error('Failed to track event');
    }
  }

  /**
   * Get analytics metrics for a specific time range
   */
  async getMetrics(
    startDate,
    endDate = new Date()
  ) {
    const cacheKey = `metrics:${startDate.toISOString()}:${endDate.toISOString()}`;

    try {
      // Try to get from cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Calculate metrics from database
      const [
        totalUsers,
        activeUsers,
        conversionRate,
        sessionDuration,
        featureUsage,
      ] = await Promise.all([
        this.getTotalUsers(startDate, endDate),
        this.getActiveUsers(startDate, endDate),
        this.getConversionRate(startDate, endDate),
        this.getAverageSessionDuration(startDate, endDate),
        this.getTopFeatures(startDate, endDate),
      ]);

      const metrics = {
        totalUsers,
        activeUsers,
        conversionRate,
        averageSessionDuration: sessionDuration,
        topFeatures: featureUsage,
      };

      // Cache the results
      await redis.setex(cacheKey, AnalyticsService.CACHE_TTL, JSON.stringify(metrics));

      return metrics;
    } catch (error) {
      console.error('Failed to get metrics:', error);
      throw new Error('Failed to get analytics metrics');
    }
  }

  /**
   * Get user-specific analytics
   */
  async getUserAnalytics(userId) {
    try {
      const userEvents = await db.userEvent.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });

      return {
        eventHistory: userEvents,
        totalEvents: await db.userEvent.count({ where: { userId } }),
        lastActive: _optionalChain([userEvents, 'access', _ => _[0], 'optionalAccess', _2 => _2.timestamp]),
      };
    } catch (error) {
      console.error('Failed to get user analytics:', error);
      throw new Error('Failed to get user analytics');
    }
  }

   async updateRealTimeMetrics(event) {
    const pipeline = redis.pipeline();
    const date = new Date().toISOString().split('T')[0];

    pipeline.hincrby(`events:${date}`, event.eventType, 1);
    pipeline.zadd('active_users', Date.now(), event.userId);
    
    if (event.eventType === 'session_start') {
      pipeline.hset(`sessions:${event.userId}`, 'start', Date.now().toString());
    }
    
    if (event.eventType === 'session_end') {
      pipeline.hget(`sessions:${event.userId}`, 'start');
    }

    await pipeline.exec();
  }

   async getTotalUsers(start, end) {
    return db.user.count({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });
  }

   async getActiveUsers(start, end) {
    return (db.userEvent ).count({
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
    });
  }

   async getConversionRate(start, end) {
    const [totalUsers, paidUsers] = await Promise.all([
      this.getTotalUsers(start, end),
      db.subscription.count({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
          status: 'ACTIVE',
        },
      }),
    ]);

    return totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;
  }

   async getAverageSessionDuration(start, end) {
    const sessions = await db.userEvent.findMany({
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
        eventType: {
          in: ['session_start', 'session_end'],
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    let totalDuration = 0;
    let sessionCount = 0;

    // Calculate durations
    const sessionStarts = new Map();
    for (const event of sessions) {
      if (event.eventType === 'session_start') {
        sessionStarts.set(event.userId, event.timestamp);
      } else if (event.eventType === 'session_end') {
        const startTime = sessionStarts.get(event.userId);
        if (startTime) {
          totalDuration += event.timestamp.getTime() - startTime.getTime();
          sessionCount++;
          sessionStarts.delete(event.userId);
        }
      }
    }

    return sessionCount > 0 ? totalDuration / sessionCount / 1000 : 0;
  }

   async getTopFeatures(start, end) {
    const features = await (db.userEvent ).groupBy({
      by: ['eventType'],
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
        eventType: {
          startsWith: 'feature_',
        },
      },
      _count: {
        eventType: true,
      },
      orderBy: {
        _count: {
          eventType: 'desc',
        },
      },
      take: 10,
    });

    return features.map((f) => ({
      feature: f.eventType.replace('feature_', ''),
      usage: f._count.eventType,
    }));
  }
} AnalyticsService.__initStatic();
