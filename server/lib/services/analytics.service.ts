import { db } from '../database';
import { Redis } from 'ioredis';
import { z } from 'zod';

const redis = new Redis((process.env.REDIS_URL || 'redis://localhost:6379') as string);

export interface UserEvent {
  userId: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp?: Date;
}

export interface AnalyticsMetrics {
  totalUsers: number;
  activeUsers: number;
  conversionRate: number;
  averageSessionDuration: number;
  topFeatures: Array<{ feature: string; usage: number }>;
}

const EventSchema = z.object({
  userId: z.string(),
  eventType: z.string(),
  eventData: z.record(z.any()),
  timestamp: z.date().optional(),
});

export class AnalyticsService {
  private static readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Track a user event
   */
  async trackEvent(event: UserEvent): Promise<void> {
    try {
      // Validate event data
      EventSchema.parse(event);

      // Store event in database
      await db.userEvent.create({
        data: {
          userId: event.userId,
          eventType: event.eventType as any,
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
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<AnalyticsMetrics> {
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

      const metrics: AnalyticsMetrics = {
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
  async getUserAnalytics(userId: string): Promise<Record<string, any>> {
    try {
      const userEvents = await db.userEvent.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });

      return {
        eventHistory: userEvents,
        totalEvents: await db.userEvent.count({ where: { userId } }),
        lastActive: userEvents[0]?.timestamp,
      };
    } catch (error) {
      console.error('Failed to get user analytics:', error);
      throw new Error('Failed to get user analytics');
    }
  }

  private async updateRealTimeMetrics(event: UserEvent): Promise<void> {
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

  private async getTotalUsers(start: Date, end: Date): Promise<number> {
    return db.user.count({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });
  }

  private async getActiveUsers(start: Date, end: Date): Promise<number> {
    return (db.userEvent as any).count({
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
    });
  }

  private async getConversionRate(start: Date, end: Date): Promise<number> {
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

  private async getAverageSessionDuration(start: Date, end: Date): Promise<number> {
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
    const sessionStarts = new Map<string, Date>();
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

  private async getTopFeatures(start: Date, end: Date): Promise<Array<{ feature: string; usage: number }>> {
    const features = await (db.userEvent as any).groupBy({
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

    return features.map((f: any) => ({
      feature: f.eventType.replace('feature_', ''),
      usage: f._count.eventType,
    }));
  }
}
