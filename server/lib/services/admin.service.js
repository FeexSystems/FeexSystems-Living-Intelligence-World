 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { Prisma, UserRole } from '@prisma/client';
import { ActivityLogService } from './activity-log.service';



































































































export class AdminService {
  constructor( prisma) {;this.prisma = prisma;}

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics() {
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
   async getUserMetrics() {
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
    }, {} );

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
   async getSubscriptionMetrics() {
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
    const planDistribution = new Map();

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
      const planData = planDistribution.get(planKey);
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
   async getUsageMetrics() {
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
   async getSecurityMetrics() {
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
        const results = scan.results ;
        if (results.vulnerabilities) {
          results.vulnerabilities.forEach((vuln) => {
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
   async getSystemHealth() {
    try {
      // Database health check
      await this.prisma.$queryRaw`SELECT 1 as health_check`;
      const dbHealth = 'healthy' ;

      // Redis health check (placeholder - implement based on your Redis setup)
      const redisHealth = 'healthy' ;

      // System resources
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const uptime = process.uptime();

      // Determine overall health
      const services = [dbHealth, redisHealth];
      const overallHealth = services.every(s => s === 'healthy') ? 'healthy' : 'degraded';

      return {
        status: overallHealth ,
        database: dbHealth,
        redis: redisHealth,
        uptime,
        memoryUsage,
        cpuUsage
      };
    } catch (error) {
      console.error('System health check failed:', error);
      return {
        status: 'critical' ,
        database: 'unhealthy' ,
        redis: 'unhealthy' ,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      };
    }
  }

  /**
   * Get detailed user analytics
   */
  async getUserAnalytics(page = 1, limit = 20, filters



) {
    const offset = (page - 1) * limit;
    
    // Build where clause
    const where = {};
    if (_optionalChain([filters, 'optionalAccess', _ => _.search])) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    if (_optionalChain([filters, 'optionalAccess', _2 => _2.role])) where.role = filters.role;
    if (_optionalChain([filters, 'optionalAccess', _3 => _3.emailVerified]) !== undefined) where.emailVerified = filters.emailVerified;

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
      }, {} )
    };

    return { users, total, analytics };
  }

  /**
   * Get registration trends for the last 12 months
   */
   async getRegistrationTrends() {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const registrations = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: twelveMonthsAgo }
      },
      select: { createdAt: true }
    });

    // Group by month
    const trends = new Map();
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
    adminUserId,
    targetUserId,
    newRole
  ) {
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

      if (currentUser.role === UserRole.SUPER_ADMIN && _optionalChain([adminUser, 'optionalAccess', _4 => _4.role]) !== UserRole.SUPER_ADMIN) {
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
  async getSecurityReport() {
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
      completedScans: _optionalChain([scanStats, 'access', _5 => _5.find, 'call', _6 => _6(s => s.status === 'COMPLETED'), 'optionalAccess', _7 => _7._count, 'access', _8 => _8.status]) || 0,
      failedScans: _optionalChain([scanStats, 'access', _9 => _9.find, 'call', _10 => _10(s => s.status === 'FAILED'), 'optionalAccess', _11 => _11._count, 'access', _12 => _12.status]) || 0,
      successRate: 0
    };

    overview.successRate = overview.totalScans > 0 
      ? (overview.completedScans / overview.totalScans) * 100 
      : 0;

    // Analyze vulnerabilities
    const vulnerabilities = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const vulnerabilityTypes = new Map();

    recentScans.forEach(scan => {
      if (scan.results && typeof scan.results === 'object') {
        const results = scan.results ;
        if (results.vulnerabilities && Array.isArray(results.vulnerabilities)) {
          results.vulnerabilities.forEach((vuln) => {
            const severity = _optionalChain([vuln, 'access', _13 => _13.severity, 'optionalAccess', _14 => _14.toLowerCase, 'call', _15 => _15()]);
            if (severity && severity in vulnerabilities) {
              vulnerabilities[severity ]++;
            }

            // Track vulnerability types
            const type = vuln.type || vuln.title || 'Unknown';
            if (!vulnerabilityTypes.has(type)) {
              vulnerabilityTypes.set(type, { count: 0, severity: severity || 'unknown' });
            }
            vulnerabilityTypes.get(type).count++;
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
   generateSecurityTrends(scans) {
    const trends = new Map();
    
    scans.forEach(scan => {
      const date = scan.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!trends.has(date)) {
        trends.set(date, { scansCount: 0, vulnerabilitiesFound: 0 });
      }
      
      const trend = trends.get(date);
      trend.scansCount++;
      
      if (scan.results && typeof scan.results === 'object') {
        const results = scan.results ;
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
  async getAdminAuditLogs(page = 1, limit = 50, filters




) {
    const offset = (page - 1) * limit;
    
    const where = {
      action: { startsWith: 'admin.' }
    };
    
    if (_optionalChain([filters, 'optionalAccess', _16 => _16.action])) where.action = { contains: filters.action };
    if (_optionalChain([filters, 'optionalAccess', _17 => _17.userId])) where.userId = filters.userId;
    if (_optionalChain([filters, 'optionalAccess', _18 => _18.startDate]) || _optionalChain([filters, 'optionalAccess', _19 => _19.endDate])) {
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