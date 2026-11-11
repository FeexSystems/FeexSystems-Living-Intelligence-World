import { PrismaClient } from '@prisma/client';

export interface ActivityLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata?: Record<string, any>;
}

export interface ActivityLogFilter {
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
}

export class ActivityLogService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create an activity log entry (convenience function)
   */
  async createActivityLog(entry: ActivityLogEntry): Promise<void> {
    return this.logActivity(entry);
  }

  /**
   * Log a user activity
   */
  async logActivity(entry: ActivityLogEntry): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          metadata: entry.metadata || {},
          timestamp: new Date(),
        },
      });
    } catch (error) {
      // Don't fail the main operation if activity logging fails
      console.error('Failed to log activity:', error);
    }
  }

  /**
   * Get user activities with pagination and filtering
   */
  async getUserActivities(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filter: ActivityLogFilter = {}
  ) {
    const skip = (page - 1) * limit;
    
    const where: any = { userId };
    
    if (filter.action) {
      where.action = filter.action;
    }
    
    if (filter.resource) {
      where.resource = filter.resource;
    }
    
    if (filter.startDate || filter.endDate) {
      where.timestamp = {};
      if (filter.startDate) {
        where.timestamp.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.timestamp.lte = filter.endDate;
      }
    }

    const [activities, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get activity summary for a user
   */
  async getUserActivitySummary(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await this.prisma.activityLog.findMany({
      where: {
        userId,
        timestamp: { gte: startDate },
      },
      select: {
        action: true,
        resource: true,
        timestamp: true,
      },
    });

    // Group by action
    const actionCounts = activities.reduce((acc, activity) => {
      acc[activity.action] = (acc[activity.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by resource
    const resourceCounts = activities.reduce((acc, activity) => {
      acc[activity.resource] = (acc[activity.resource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by day
    const dailyActivity = activities.reduce((acc, activity) => {
      const day = activity.timestamp.toISOString().split('T')[0]!;
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalActivities: activities.length,
      actionCounts,
      resourceCounts,
      dailyActivity,
      period: `${days} days`,
    };
  }

  /**
   * Clean up old activity logs
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.activityLog.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });

    return result.count;
  }

  /**
   * Get most active users
   */
  async getMostActiveUsers(days: number = 30, limit: number = 10) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.prisma.activityLog.groupBy({
      by: ['userId'],
      where: {
        timestamp: { gte: startDate },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: limit,
    });

    // Get user details for the most active users
    const userIds = result.map(r => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    return result.map(r => ({
      user: users.find(u => u.id === r.userId),
      activityCount: r._count.id,
    }));
  }

  /**
   * Get activity statistics for admin dashboard
   */
  async getActivityStats(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalActivities,
      uniqueUsers,
      actionStats,
      resourceStats,
    ] = await Promise.all([
      this.prisma.activityLog.count({
        where: { timestamp: { gte: startDate } },
      }),
      this.prisma.activityLog.findMany({
        where: { timestamp: { gte: startDate } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.activityLog.groupBy({
        by: ['action'],
        where: { timestamp: { gte: startDate } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.activityLog.groupBy({
        by: ['resource'],
        where: { timestamp: { gte: startDate } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    return {
      totalActivities,
      uniqueUsers: uniqueUsers.length,
      actionStats: actionStats.map(stat => ({
        action: stat.action,
        count: stat._count.id,
      })),
      resourceStats: resourceStats.map(stat => ({
        resource: stat.resource,
        count: stat._count.id,
      })),
      period: `${days} days`,
    };
  }
}

// Export convenience function
export const createActivityLog = async (entry: ActivityLogEntry): Promise<void> => {
  const service = new ActivityLogService(new PrismaClient());
  return service.createActivityLog(entry);
};