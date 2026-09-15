import { PrismaClient } from '@prisma/client';
import { cacheService, CacheService } from './cache.service';
import { logger } from '../logging';

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' }
      ]
    });

    // Log slow queries
    (this.prisma.$on as any)('query', (e: any) => {
      if (e.duration > 500) { // Log queries taking more than 500ms
        logger.warn('Slow query detected:', {
          query: e.query,
          duration: e.duration,
          timestamp: e.timestamp
        });
      }
    });
  }

  /**
   * Optimized user profile fetch with caching
   */
  async getUserProfile(userId: string) {
    const cacheKey = CacheService.keys.userProfile(userId);
    
    return cacheService.getOrSet(cacheKey, async () => {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profileImageUrl: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
          // Include only active subscription
          subscriptions: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              planId: true,
              status: true,
              currentPeriodEnd: true
            },
            take: 1
          }
        }
      });
      return user;
    }, CacheService.ttl.userProfile);
  }

  /**
   * Optimized team members fetch with caching
   */
  async getTeamMembers(teamId: string) {
    const cacheKey = CacheService.keys.teamMembers(teamId);
    
    return cacheService.getOrSet(cacheKey, async () => {
      const members = await this.prisma.teamMember.findMany({
        where: { teamId },
        select: {
          id: true,
          role: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true
            }
          }
        }
      });
      return members;
    }, CacheService.ttl.teamMembers);
  }

  /**
   * Optimized security scans fetch with pagination
   */
  async getSecurityScans(userId: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;
    
    const [scans, total] = await Promise.all([
      this.prisma.securityScan.findMany({
        where: { userId },
        select: {
          id: true,
          status: true,
          createdAt: true,
          completedAt: true,
          results: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.securityScan.count({
        where: { userId }
      })
    ]);

    return {
      scans,
      pagination: {
        total,
        pages: Math.ceil(total / pageSize),
        currentPage: page,
        pageSize
      }
    };
  }

  /**
   * Optimized usage metrics aggregation
   */
  async getUserUsageMetrics(userId: string, type: string, startDate: Date, endDate: Date) {
    const cacheKey = `${CacheService.keys.metrics(userId, type)}:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    return cacheService.getOrSet(cacheKey, async () => {
      const metrics = await this.prisma.usageMetrics.aggregate({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          aiRequestsCount: true,
          storageUsed: true,
          bandwidthUsed: true
        }
      });
      return [{
        type,
        _sum: {
          amount: Number(metrics._sum.aiRequestsCount || 0),
          storageBytes: Number(metrics._sum.storageUsed || 0),
          bandwidthBytes: Number(metrics._sum.bandwidthUsed || 0)
        }
      }];
    }, CacheService.ttl.metrics);
  }

  /**
   * Batch operation helper
   */
  async batchOperation<T>(items: T[], batchSize: number, operation: (batch: T[]) => Promise<void>) {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await operation(batch);
    }
  }

  /**
   * Transaction wrapper with retry logic
   */
  async transaction<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
    try {
      return await (this.prisma.$transaction as any)(operation);
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.transaction(operation, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // Add conditions for retryable database errors
    return error.code === 'P2034' || // Transaction timeout
           error.code === 'P2028' || // Connection lost
           error.code === 'P2025';   // Record not found
  }
}

// Export singleton instance
export const db = new DatabaseService();
