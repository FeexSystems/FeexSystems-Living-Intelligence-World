 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { PrismaClient, } from '@prisma/client';
import { subscriptionService } from './subscription.service.js';

const prisma = new PrismaClient();












































export class UsageService {
  /**
   * Get current usage metrics for a user
   */
  async getUserUsage(userId, period) {
    const currentPeriod = period || new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const usage = await prisma.usageMetrics.findUnique({
      where: {
        userId_period: {
          userId,
          period: currentPeriod,
        },
      },
    });

    return {
      userId,
      period: currentPeriod,
      aiRequestsCount: _optionalChain([usage, 'optionalAccess', _ => _.aiRequestsCount]) || 0,
      deploymentCount: _optionalChain([usage, 'optionalAccess', _2 => _2.deploymentCount]) || 0,
      securityScansCount: _optionalChain([usage, 'optionalAccess', _3 => _3.securityScansCount]) || 0,
      storageUsed: _optionalChain([usage, 'optionalAccess', _4 => _4.storageUsed]) || BigInt(0),
      bandwidthUsed: _optionalChain([usage, 'optionalAccess', _5 => _5.bandwidthUsed]) || BigInt(0),
    };
  }

  /**
   * Get usage report with limits and percentages
   */
  async getUserUsageReport(userId, period) {
    const usage = await this.getUserUsage(userId, period);
    const limits = await subscriptionService.getSubscriptionLimits(userId);

    if (!limits) {
      throw new Error('Unable to determine subscription limits');
    }

    // Convert storage and bandwidth to GB for percentage calculation
    const storageGB = Number(usage.storageUsed) / (1024 * 1024 * 1024);
    const bandwidthGB = Number(usage.bandwidthUsed) / (1024 * 1024 * 1024);

    // Calculate percentages (handle unlimited limits with -1)
    const percentages = {
      aiRequests: limits.aiRequestsPerMonth === -1 ? 0 : 
        Math.min((usage.aiRequestsCount / limits.aiRequestsPerMonth) * 100, 100),
      deployments: limits.deploymentsPerMonth === -1 ? 0 : 
        Math.min((usage.deploymentCount / limits.deploymentsPerMonth) * 100, 100),
      securityScans: limits.securityScansPerMonth === -1 ? 0 : 
        Math.min((usage.securityScansCount / limits.securityScansPerMonth) * 100, 100),
      storage: Math.min((storageGB / limits.storageGB) * 100, 100),
      bandwidth: limits.bandwidthGB ? Math.min((bandwidthGB / limits.bandwidthGB) * 100, 100) : 0,
    };

    // Generate warnings
    const warnings = [];
    const warningThreshold = 80; // 80% usage warning
    const criticalThreshold = 95; // 95% usage critical warning

    if (percentages.aiRequests >= criticalThreshold) {
      warnings.push('AI requests usage is critically high (95%+). Consider upgrading your plan.');
    } else if (percentages.aiRequests >= warningThreshold) {
      warnings.push('AI requests usage is high (80%+). Monitor your usage closely.');
    }

    if (percentages.deployments >= criticalThreshold) {
      warnings.push('Deployment usage is critically high (95%+). Consider upgrading your plan.');
    } else if (percentages.deployments >= warningThreshold) {
      warnings.push('Deployment usage is high (80%+). Monitor your usage closely.');
    }

    if (percentages.securityScans >= criticalThreshold) {
      warnings.push('Security scan usage is critically high (95%+). Consider upgrading your plan.');
    } else if (percentages.securityScans >= warningThreshold) {
      warnings.push('Security scan usage is high (80%+). Monitor your usage closely.');
    }

    if (percentages.storage >= criticalThreshold) {
      warnings.push('Storage usage is critically high (95%+). Consider upgrading your plan or cleaning up files.');
    } else if (percentages.storage >= warningThreshold) {
      warnings.push('Storage usage is high (80%+). Monitor your storage usage.');
    }

    // Check if over any limits
    const isOverLimit = (
      (limits.aiRequestsPerMonth !== -1 && usage.aiRequestsCount >= limits.aiRequestsPerMonth) ||
      (limits.deploymentsPerMonth !== -1 && usage.deploymentCount >= limits.deploymentsPerMonth) ||
      (limits.securityScansPerMonth !== -1 && usage.securityScansCount >= limits.securityScansPerMonth) ||
      storageGB >= limits.storageGB
    );

    return {
      period: usage.period,
      usage,
      limits: limits ,
      percentages,
      warnings,
      isOverLimit,
    };
  }

  /**
   * Increment usage for a specific metric
   */
  async incrementUsage(increment) {
    const period = increment.period || new Date().toISOString().slice(0, 7);
    
    // Prepare increment data
    const incrementData = {};
    
    switch (increment.type) {
      case 'ai_request':
        incrementData.aiRequestsCount = { increment: increment.amount || 1 };
        break;
      case 'deployment':
        incrementData.deploymentCount = { increment: increment.amount || 1 };
        break;
      case 'security_scan':
        incrementData.securityScansCount = { increment: increment.amount || 1 };
        break;
      case 'storage':
        if (increment.storageBytes) {
          incrementData.storageUsed = { increment: increment.storageBytes };
        }
        break;
      case 'bandwidth':
        if (increment.bandwidthBytes) {
          incrementData.bandwidthUsed = { increment: increment.bandwidthBytes };
        }
        break;
    }

    // Upsert usage metrics
    const usage = await prisma.usageMetrics.upsert({
      where: {
        userId_period: {
          userId: increment.userId,
          period,
        },
      },
      update: incrementData,
      create: {
        userId: increment.userId,
        period,
        aiRequestsCount: increment.type === 'ai_request' ? (increment.amount || 1) : 0,
        deploymentCount: increment.type === 'deployment' ? (increment.amount || 1) : 0,
        securityScansCount: increment.type === 'security_scan' ? (increment.amount || 1) : 0,
        storageUsed: increment.type === 'storage' ? (increment.storageBytes || BigInt(0)) : BigInt(0),
        bandwidthUsed: increment.type === 'bandwidth' ? (increment.bandwidthBytes || BigInt(0)) : BigInt(0),
      },
    });

    return usage;
  }

  /**
   * Check if user can perform an action based on current usage and limits
   */
  async canPerformAction(
    userId,
    action,
    period
  ) {
    const currentPeriod = period || new Date().toISOString().slice(0, 7);
    const usage = await this.getUserUsage(userId, currentPeriod);
    const limits = await subscriptionService.getSubscriptionLimits(userId);

    if (!limits) {
      return { allowed: false, reason: 'Unable to determine subscription limits' };
    }

    let currentUsage;
    let limit;

    switch (action) {
      case 'ai_request':
        currentUsage = usage.aiRequestsCount;
        limit = limits.aiRequestsPerMonth;
        break;
      case 'deployment':
        currentUsage = usage.deploymentCount;
        limit = limits.deploymentsPerMonth;
        break;
      case 'security_scan':
        currentUsage = usage.securityScansCount;
        limit = limits.securityScansPerMonth;
        break;
      default:
        return { allowed: false, reason: 'Invalid action type' };
    }

    // Unlimited access (enterprise plans)
    if (limit === -1) {
      return { allowed: true, currentUsage, limit };
    }

    // Check if under limit
    if (currentUsage < limit) {
      return { allowed: true, currentUsage, limit };
    }

    return {
      allowed: false,
      reason: `${action.replace('_', ' ')} limit exceeded. Current: ${currentUsage}, Limit: ${limit}`,
      currentUsage,
      limit,
    };
  }

  /**
   * Get usage history for a user across multiple periods
   */
  async getUserUsageHistory(
    userId,
    months = 6
  ) {
    const periods = [];
    const now = new Date();
    
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push(date.toISOString().slice(0, 7));
    }

    const usageMetrics = await prisma.usageMetrics.findMany({
      where: {
        userId,
        period: { in: periods },
      },
      orderBy: { period: 'desc' },
    });

    // Fill in missing periods with zero usage
    return periods.map(period => {
      const usage = usageMetrics.find(u => u.period === period);
      return {
        userId,
        period,
        aiRequestsCount: _optionalChain([usage, 'optionalAccess', _6 => _6.aiRequestsCount]) || 0,
        deploymentCount: _optionalChain([usage, 'optionalAccess', _7 => _7.deploymentCount]) || 0,
        securityScansCount: _optionalChain([usage, 'optionalAccess', _8 => _8.securityScansCount]) || 0,
        storageUsed: _optionalChain([usage, 'optionalAccess', _9 => _9.storageUsed]) || BigInt(0),
        bandwidthUsed: _optionalChain([usage, 'optionalAccess', _10 => _10.bandwidthUsed]) || BigInt(0),
      };
    });
  }

  /**
   * Get aggregated usage statistics for admin dashboard
   */
  async getAggregatedUsage(period)











 {
    const currentPeriod = period || new Date().toISOString().slice(0, 7);

    const aggregation = await prisma.usageMetrics.aggregate({
      where: { period: currentPeriod },
      _sum: {
        aiRequestsCount: true,
        deploymentCount: true,
        securityScansCount: true,
        storageUsed: true,
        bandwidthUsed: true,
      },
      _count: {
        userId: true,
      },
    });

    const totalUsers = aggregation._count.userId || 0;
    const totalAiRequests = aggregation._sum.aiRequestsCount || 0;
    const totalDeployments = aggregation._sum.deploymentCount || 0;
    const totalSecurityScans = aggregation._sum.securityScansCount || 0;
    const totalStorageUsed = aggregation._sum.storageUsed || BigInt(0);
    const totalBandwidthUsed = aggregation._sum.bandwidthUsed || BigInt(0);

    return {
      totalUsers,
      totalAiRequests,
      totalDeployments,
      totalSecurityScans,
      totalStorageUsed,
      totalBandwidthUsed,
      averageUsagePerUser: {
        aiRequests: totalUsers > 0 ? Math.round(totalAiRequests / totalUsers) : 0,
        deployments: totalUsers > 0 ? Math.round(totalDeployments / totalUsers) : 0,
        securityScans: totalUsers > 0 ? Math.round(totalSecurityScans / totalUsers) : 0,
      },
    };
  }

  /**
   * Reset usage for a new billing period (called by billing service)
   */
  async resetUsageForNewPeriod(userId, newPeriod) {
    // Create new period entry with zero usage
    await prisma.usageMetrics.upsert({
      where: {
        userId_period: {
          userId,
          period: newPeriod,
        },
      },
      update: {}, // Don't update if already exists
      create: {
        userId,
        period: newPeriod,
        aiRequestsCount: 0,
        deploymentCount: 0,
        securityScansCount: 0,
        storageUsed: BigInt(0),
        bandwidthUsed: BigInt(0),
      },
    });
  }
}

export const usageService = new UsageService(); 