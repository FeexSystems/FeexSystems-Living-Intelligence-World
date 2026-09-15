import { PrismaClient, Prisma, UserRole } from '@prisma/client';
import { ActivityLogService } from './activity-log.service';

export interface AdminDashboardMetrics {
  systemHealth: {
    status: 'healthy' | 'degraded' | 'critical';
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    usersByRole: Record<string, number>;
  };
  subscriptionMetrics: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    revenue: {
      monthly: number;
      yearly: number;
      currency: string;
    };
    planDistribution: Array<{
      planId: string;
      planName: string;
      count: number;
      revenue: number;
    }>;
  };
  usageMetrics: {
    aiRequests: number;
    deployments: number;
    securityScans: number;
    storage: number;
    bandwidth: number;
  };
  securityMetrics: {
    totalScans: number;
    criticalVulnerabilities: number;
    highVulnerabilities: number;
    scanSuccessRate: number;
  };
}

export interface AdminUserAnalytics {
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    emailVerified: boolean;
    createdAt: Date;
    lastLoginAt: Date | null;
    activityCount: number;
    subscriptionStatus: string | null;
  }>;
  analytics: {
    registrationTrends: Array<{
      date: string;
      count: number;
    }>;
    roleDistribution: Record<string, number>;
    activityDistribution: Array<{
      userId: string;
      activityCount: number;
    }>;
  };
}

export interface AdminSecurityReport {
  overview: {
    totalScans: number;
    completedScans: number;
    failedScans: number;
    successRate: number;
  };
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  trends: Array<{
    date: string;
    scansCount: number;
    vulnerabilitiesFound: number;
  }>;
  topVulnerabilities: Array<{
    type: string;
    count: number;
    severity: string;
  }>;
}

export class AdminService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(): Promise<AdminDashboardMetrics> {
    const [
      userMetrics,
      subscriptionMetrics,
      usageMetrics,
      securityMetrics,
      systemHealth
    ] = await Promise.all([
      this.getUserMetrics(),
      this.getSubscriptionMetrics(),
      this.getUsageMetrics(),
      this.getSecurityMetrics(),
      this.getSystemHealth()
    ]);

    return {
      systemHealth,
      userMetrics,
      subscriptionMetrics,
      usageMetrics,
      securityMetrics
    };
  }

  /**
   * Get user metrics and analytics
   */
  private async getUserMetrics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisWeek,
      usersByRole
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: today }
        }
      }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: weekAgo }
        }
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      })
    ]);

    const roleDistribution = usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisWeek,
      usersByRole: roleDistribution
    };
  }

  /**
   * Get subscription and revenue metrics
   */
  private async getSubscriptionMetrics() {
    const [
      totalSubscriptions,
      activeSubscriptions,
      subscriptionsWithPlans
    ] = await Promise.all([
      this.prisma.subscription.count(),
      this.prisma.subscription.count({
        where: { status: 'ACTIVE' }
      }),
      this.prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              currency: true,
              interval: true
            }
          }
        }
      })
    ]);

    // Calculate revenue
    let monthlyRevenue = 0;
    let yearlyRevenue = 0;
    const planDistribution = new Map<string, { name: string; count: number; revenue: number }>();

    subscriptionsWithPlans.forEach(sub => {
      const plan = sub.plan;
      const planKey = plan.id;

      // Update plan distribution
      if (!planDistribution.has(planKey)) {
        planDistribution.set(planKey, {
          name: plan.name,
          count: 0,
          revenue: 0
        });
      }
      const planData = planDistribution.get(planKey)!;
      planData.count++;

      // Calculate revenue
      if (plan.interval === 'month') {
        monthlyRevenue += plan.price;
        yearlyRevenue += plan.price * 12;
        planData.revenue += plan.price * 12; // Annualized
      } else if (plan.interval === 'year') {
        monthlyRevenue += Math.round(plan.price / 12);
        yearlyRevenue += plan.price;
        planData.revenue += plan.price;
      }
    });

    const planDistributionArray = Array.from(planDistribution.entries()).map(([planId, data]) => ({
      planId,
      planName: data.name,
      count: data.count,
      revenue: data.revenue
    }));

    return {
      totalSubscriptions,
      activeSubscriptions,
      revenue: {
        monthly: monthlyRevenue,
        yearly: yearlyRevenue,
        currency: 'USD'
      },
      planDistribution: planDistributionArray
    };
  }

  /**
   * Get usage metrics
   */
  private async getUsageMetrics() {
    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const usageData = await this.prisma.usageMetrics.findMany({
      where: { period: currentPeriod }
    });

    const totalUsage = usageData.reduce((acc, usage) => ({
      aiRequests: acc.aiRequests + usage.aiRequestsCount,
      deployments: acc.deployments + usage.deploymentCount,
      securityScans: acc.securityScans + usage.securityScansCount,
      storage: acc.storage + Number(usage.storageUsed),
      bandwidth: acc.bandwidth + Number(usage.bandwidthUsed)
    }), {
      aiRequests: 0,
      deployments: 0,
      securityScans: 0,
      storage: 0,
      bandwidth: 0
    });

    return totalUsage;
  }

  /**
   * Get security metrics
   */
  private async getSecurityMetrics() {
    const [
      totalScans,
      completedScans,
      scanResults
    ] = await Promise.all([
      this.prisma.securityScan.count(),
      this.prisma.securityScan.count({
        where: { status: 'COMPLETED' }
      }),
      this.prisma.securityScan.findMany({
        where: {
          status: 'COMPLETED',
          results: { not: Prisma.DbNull }
        },
        select: { results: true }
      })
    ]);

    let criticalVulnerabilities = 0;
    let highVulnerabilities = 0;

    // Analyze vulnerability results
    scanResults.forEach(scan => {
      if (scan.results && typeof scan.results === 'object') {
        const results = scan.results as any;
        if (results.vulnerabilities) {
          results.vulnerabilities.forEach((vuln: any) => {
            if (vuln.severity === 'critical') criticalVulnerabilities++;
            if (vuln.severity === 'high') highVulnerabilities++;
          });
        }
      }
    });

    const scanSuccessRate = totalScans > 0 ? (completedScans / totalScans) * 100 : 0;

    return {
      totalScans,
      criticalVulnerabilities,
      highVulnerabilities,
      scanSuccessRate: Math.round(scanSuccessRate * 100) / 100
    };
  }

  /**
   * Get system health metrics
   */
  private async getSystemHealth() {
    try {
      // Database health check
      await this.prisma.$queryRaw`SELECT 1 as health_check`;
      const dbHealth = 'healthy' as const;

      // Redis health check (placeholder - implement based on your Redis setup)
      const redisHealth = 'healthy' as const;

      // System resources
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const uptime = process.uptime();

      // Determine overall health
      const services = [dbHealth, redisHealth];
      const overallHealth = services.every(s => s === 'healthy') ? 'healthy' : 'degraded';

      return {
        status: overallHealth as 'healthy' | 'degraded' | 'critical',
        database: dbHealth,
        redis: redisHealth,
        uptime,
        memoryUsage,
        cpuUsage
      };
    } catch (error) {
      console.error('System health check failed:', error);
      return {
        status: 'critical' as const,
        database: 'unhealthy' as const,
        redis: 'unhealthy' as const,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      };
    }
  }

  /**
   * Get detailed user analytics
   */
  async getUserAnalytics(page: number = 1, limit: number = 20, filters?: {
    search?: string;
    role?: UserRole;
    emailVerified?: boolean;
  }): Promise<{ users: any[]; total: number; analytics: any }> {
    const offset = (page - 1) * limit;
    
    // Build where clause
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    if (filters?.role) where.role = filters.role;
    if (filters?.emailVerified !== undefined) where.emailVerified = filters.emailVerified;

    const [users, total, registrationTrends, roleDistribution] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              activityLogs: true,
              subscriptions: true
            }
          },
          subscriptions: {
            where: { status: 'ACTIVE' },
            select: { status: true },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      this.prisma.user.count({ where }),
      this.getRegistrationTrends(),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      })
    ]);

    const analytics = {
      registrationTrends,
      roleDistribution: roleDistribution.reduce((acc, item) => {
        acc[item.role] = item._count.role;
        return acc;
      }, {} as Record<string, number>)
    };

    return { users, total, analytics };
  }

  /**
   * Get registration trends for the last 12 months
   */
  private async getRegistrationTrends() {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const registrations = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: twelveMonthsAgo }
      },
      select: { createdAt: true }
    });

    // Group by month
    const trends = new Map<string, number>();
    registrations.forEach(user => {
      const monthKey = user.createdAt.toISOString().slice(0, 7); // YYYY-MM
      trends.set(monthKey, (trends.get(monthKey) || 0) + 1);
    });

    return Array.from(trends.entries()).map(([date, count]) => ({ date, count }));
  }

  /**
   * Update user role (admin action)
   */
  async updateUserRole(
    adminUserId: string,
    targetUserId: string,
    newRole: UserRole
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // Get current user data
      const currentUser = await this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, email: true, role: true, firstName: true, lastName: true }
      });

      if (!currentUser) {
        return { success: false, error: 'User not found' };
      }

      // Prevent changing super admin role unless done by another super admin
      const adminUser = await this.prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true }
      });

      if (currentUser.role === UserRole.SUPER_ADMIN && adminUser?.role !== UserRole.SUPER_ADMIN) {
        return { success: false, error: 'Only super admins can modify super admin roles' };
      }

      // Update user role
      const updatedUser = await this.prisma.user.update({
        where: { id: targetUserId },
        data: { role: newRole },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true
        }
      });

      // Log the role change
      const activityLogService = new ActivityLogService(this.prisma);
      await activityLogService.logActivity({
        userId: adminUserId,
        action: 'admin.user_role_updated',
        resource: 'user',
        resourceId: targetUserId,
        metadata: {
          targetUserEmail: currentUser.email,
          previousRole: currentUser.role,
          newRole,
          adminAction: true
        }
      });

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Error updating user role:', error);
      return { success: false, error: 'Failed to update user role' };
    }
  }

  /**
   * Get security report
   */
  async getSecurityReport(): Promise<AdminSecurityReport> {
    const [scanStats, recentScans] = await Promise.all([
      this.prisma.securityScan.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      this.prisma.securityScan.findMany({
        where: {
          status: 'COMPLETED',
          results: { not: Prisma.DbNull }
        },
        select: {
          results: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      })
    ]);

    const overview = {
      totalScans: scanStats.reduce((sum, stat) => sum + stat._count.status, 0),
      completedScans: scanStats.find(s => s.status === 'COMPLETED')?._count.status || 0,
      failedScans: scanStats.find(s => s.status === 'FAILED')?._count.status || 0,
      successRate: 0
    };

    overview.successRate = overview.totalScans > 0 
      ? (overview.completedScans / overview.totalScans) * 100 
      : 0;

    // Analyze vulnerabilities
    const vulnerabilities = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const vulnerabilityTypes = new Map<string, { count: number; severity: string }>();

    recentScans.forEach(scan => {
      if (scan.results && typeof scan.results === 'object') {
        const results = scan.results as any;
        if (results.vulnerabilities && Array.isArray(results.vulnerabilities)) {
          results.vulnerabilities.forEach((vuln: any) => {
            const severity = vuln.severity?.toLowerCase();
            if (severity && severity in vulnerabilities) {
              vulnerabilities[severity as keyof typeof vulnerabilities]++;
            }

            // Track vulnerability types
            const type = vuln.type || vuln.title || 'Unknown';
            if (!vulnerabilityTypes.has(type)) {
              vulnerabilityTypes.set(type, { count: 0, severity: severity || 'unknown' });
            }
            vulnerabilityTypes.get(type)!.count++;
          });
        }
      }
    });

    const topVulnerabilities = Array.from(vulnerabilityTypes.entries())
      .map(([type, data]) => ({ type, count: data.count, severity: data.severity }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Generate trends (simplified - group by day for last 30 days)
    const trends = this.generateSecurityTrends(recentScans);

    return {
      overview,
      vulnerabilities,
      trends,
      topVulnerabilities
    };
  }

  /**
   * Generate security trends data
   */
  private generateSecurityTrends(scans: any[]) {
    const trends = new Map<string, { scansCount: number; vulnerabilitiesFound: number }>();
    
    scans.forEach(scan => {
      const date = scan.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!trends.has(date)) {
        trends.set(date, { scansCount: 0, vulnerabilitiesFound: 0 });
      }
      
      const trend = trends.get(date)!;
      trend.scansCount++;
      
      if (scan.results && typeof scan.results === 'object') {
        const results = scan.results as any;
        if (results.vulnerabilities && Array.isArray(results.vulnerabilities)) {
          trend.vulnerabilitiesFound += results.vulnerabilities.length;
        }
      }
    });

    return Array.from(trends.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get admin audit logs
   */
  async getAdminAuditLogs(page: number = 1, limit: number = 50, filters?: {
    action?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const offset = (page - 1) * limit;
    
    const where: any = {
      action: { startsWith: 'admin.' }
    };
    
    if (filters?.action) where.action = { contains: filters.action };
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip: offset,
        take: limit
      }),
      this.prisma.activityLog.count({ where })
    ]);

    return { logs, total };
  }
}