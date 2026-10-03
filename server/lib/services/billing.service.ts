import { prisma } from '../database.js';
import { usageService } from './usage.service.js';
import { subscriptionService } from './subscription.service.js';

export interface BillingCalculation {
  userId: string;
  period: string;
  baseAmount: number; // Base subscription cost in cents
  overageCharges: {
    aiRequests: number;
    deployments: number;
    securityScans: number;
    storage: number;
    bandwidth: number;
  };
  totalOverage: number;
  totalAmount: number;
  currency: string;
}

export interface OverageRates {
  aiRequestsPerUnit: number; // Cost per AI request over limit (in cents)
  deploymentsPerUnit: number; // Cost per deployment over limit (in cents)
  securityScansPerUnit: number; // Cost per security scan over limit (in cents)
  storagePerGB: number; // Cost per GB over limit per month (in cents)
  bandwidthPerGB: number; // Cost per GB bandwidth over limit (in cents)
}

export class BillingService {
  // Default overage rates (can be configured per plan)
  private defaultOverageRates: OverageRates = {
    aiRequestsPerUnit: 10, // $0.10 per AI request
    deploymentsPerUnit: 50, // $0.50 per deployment
    securityScansPerUnit: 100, // $1.00 per security scan
    storagePerGB: 20, // $0.20 per GB per month
    bandwidthPerGB: 10, // $0.10 per GB
  };

  /**
   * Calculate billing for a user's usage in a specific period
   */
  async calculateBilling(userId: string, period?: string): Promise<BillingCalculation> {
    const currentPeriod = period || new Date().toISOString().slice(0, 7);

    // Get user's subscription and usage
    const subscription = await subscriptionService.getUserSubscription(userId);
    if (!subscription) {
      throw new Error('No active subscription found for user');
    }

    const usage = await usageService.getUserUsage(userId, currentPeriod);
    const limits = subscription.plan.features as any;

    // Get overage rates (could be customized per plan)
    const overageRates = this.getOverageRates(subscription.plan.id);

    // Calculate base amount (subscription cost)
    const baseAmount = subscription.plan.price;

    // Calculate overages
    const overageCharges = {
      aiRequests: this.calculateOverage(
        usage.aiRequestsCount,
        limits.aiRequestsPerMonth,
        overageRates.aiRequestsPerUnit
      ),
      deployments: this.calculateOverage(
        usage.deploymentCount,
        limits.deploymentsPerMonth,
        overageRates.deploymentsPerUnit
      ),
      securityScans: this.calculateOverage(
        usage.securityScansCount,
        limits.securityScansPerMonth,
        overageRates.securityScansPerUnit
      ),
      storage: this.calculateStorageOverage(
        usage.storageUsed,
        limits.storageGB,
        overageRates.storagePerGB
      ),
      bandwidth: this.calculateBandwidthOverage(
        usage.bandwidthUsed,
        limits.bandwidthGB || 0,
        overageRates.bandwidthPerGB
      ),
    };

    const totalOverage = Object.values(overageCharges).reduce((sum, charge) => sum + charge, 0);
    const totalAmount = baseAmount + totalOverage;

    return {
      userId,
      period: currentPeriod,
      baseAmount,
      overageCharges,
      totalOverage,
      totalAmount,
      currency: subscription.plan.currency,
    };
  }

  /**
   * Process billing for all active subscriptions
   * This would typically be called by a cron job at the end of each billing period
   */
  async processBillingForAllUsers(period?: string): Promise<{
    processed: number;
    failed: number;
    totalRevenue: number;
    errors: Array<{ userId: string; error: string }>;
  }> {
    const currentPeriod = period || new Date().toISOString().slice(0, 7);

    // Get all active subscriptions
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'TRIALING'],
        },
      },
      include: {
        user: true,
        plan: true,
      },
    });

    let processed = 0;
    let failed = 0;
    let totalRevenue = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const subscription of activeSubscriptions) {
      try {
        const billing = await this.calculateBilling(subscription.userId, currentPeriod);

        // In a local billing system, you would handle the invoice generation here
        // or integrate with another payment provider.
        if (billing.totalOverage > 0) {
          console.log(`Overage calculated for user ${subscription.userId}: ${billing.totalOverage}`);
        }

        processed++;
        totalRevenue += billing.totalAmount;
      } catch (error) {
        failed++;
        errors.push({
          userId: subscription.userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`Billing failed for user ${subscription.userId}:`, error);
      }
    }

    return {
      processed,
      failed,
      totalRevenue,
      errors,
    };
  }



  /**
   * Get overage rates for a specific plan
   */
  private getOverageRates(planId: string): OverageRates {
    // In a real implementation, you might have different rates per plan
    // For now, return default rates
    return this.defaultOverageRates;
  }

  /**
   * Calculate overage charges for count-based metrics
   */
  private calculateOverage(usage: number, limit: number, ratePerUnit: number): number {
    if (limit === -1) return 0; // Unlimited
    if (usage <= limit) return 0; // Under limit

    const overage = usage - limit;
    return overage * ratePerUnit;
  }

  /**
   * Calculate storage overage charges
   */
  private calculateStorageOverage(usageBytes: bigint, limitGB: number, ratePerGB: number): number {
    const usageGB = Number(usageBytes) / (1024 * 1024 * 1024);
    if (usageGB <= limitGB) return 0;

    const overageGB = usageGB - limitGB;
    return Math.ceil(overageGB) * ratePerGB;
  }

  /**
   * Calculate bandwidth overage charges
   */
  private calculateBandwidthOverage(usageBytes: bigint, limitGB: number, ratePerGB: number): number {
    if (limitGB === 0) return 0; // No bandwidth limits

    const usageGB = Number(usageBytes) / (1024 * 1024 * 1024);
    if (usageGB <= limitGB) return 0;

    const overageGB = usageGB - limitGB;
    return Math.ceil(overageGB) * ratePerGB;
  }

  /**
   * Get billing history for a user
   */
  async getBillingHistory(userId: string, months: number = 6): Promise<BillingCalculation[]> {
    const history: BillingCalculation[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = date.toISOString().slice(0, 7);

      try {
        const billing = await this.calculateBilling(userId, period);
        history.push(billing);
      } catch (error) {
        // Skip periods where user didn't have a subscription
        console.warn(`No billing data for user ${userId} in period ${period}`);
      }
    }

    return history;
  }

  /**
   * Get revenue analytics for admin dashboard
   */
  async getRevenueAnalytics(period?: string, months: number = 12): Promise<{
    totalRevenue: number;
    subscriptionRevenue: number;
    overageRevenue: number;
    revenueByPlan: Array<{ planId: string; planName: string; revenue: number; subscribers: number }>;
    monthlyTrends: Array<{ period: string; revenue: number; subscribers: number }>;
  }> {
    if (period) {
      // Get revenue for specific period
      const subscriptions = await prisma.subscription.findMany({
        where: {
          status: {
            in: ['ACTIVE', 'TRIALING'],
          },
          currentPeriodStart: {
            lte: new Date(`${period}-31`),
          },
          currentPeriodEnd: {
            gte: new Date(`${period}-01`),
          },
        },
        include: {
          plan: true,
        },
      });

      let subscriptionRevenue = 0;
      let overageRevenue = 0;
      const planRevenue = new Map<string, { revenue: number; subscribers: number; name: string }>();

      for (const subscription of subscriptions) {
        // Base subscription revenue
        subscriptionRevenue += subscription.plan.price;

        // Track revenue by plan
        const planData = planRevenue.get(subscription.plan.id) || {
          revenue: 0,
          subscribers: 0,
          name: subscription.plan.name,
        };
        planData.revenue += subscription.plan.price;
        planData.subscribers += 1;
        planRevenue.set(subscription.plan.id, planData);

        // Calculate overage revenue for this period
        try {
          const billing = await this.calculateBilling(subscription.userId, period);
          overageRevenue += billing.totalOverage;
          planData.revenue += billing.totalOverage;
          planRevenue.set(subscription.plan.id, planData);
        } catch (error) {
          // Skip if no usage data available
        }
      }

      return {
        totalRevenue: subscriptionRevenue + overageRevenue,
        subscriptionRevenue,
        overageRevenue,
        revenueByPlan: Array.from(planRevenue.entries()).map(([planId, data]) => ({
          planId,
          planName: data.name,
          revenue: data.revenue,
          subscribers: data.subscribers,
        })),
        monthlyTrends: [{
          period,
          revenue: subscriptionRevenue + overageRevenue,
          subscribers: subscriptions.length,
        }],
      };
    } else {
      // Get revenue trends for last N months
      const monthlyTrends = [];
      let totalRevenue = 0;
      let totalSubscriptionRevenue = 0;
      let totalOverageRevenue = 0;
      const planRevenueMap = new Map<string, { revenue: number; subscribers: number; name: string }>();

      const now = new Date();
      for (let i = 0; i < months; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthPeriod = date.toISOString().slice(0, 7);

        try {
          const monthData = await this.getRevenueAnalytics(monthPeriod);
          monthlyTrends.unshift({
            period: monthPeriod,
            revenue: monthData.totalRevenue,
            subscribers: monthData.monthlyTrends[0]?.subscribers || 0,
          });

          totalRevenue += monthData.totalRevenue;
          totalSubscriptionRevenue += monthData.subscriptionRevenue;
          totalOverageRevenue += monthData.overageRevenue;

          // Aggregate plan revenue
          monthData.revenueByPlan.forEach(plan => {
            const existing = planRevenueMap.get(plan.planId) || {
              revenue: 0,
              subscribers: 0,
              name: plan.planName,
            };
            existing.revenue += plan.revenue;
            existing.subscribers = Math.max(existing.subscribers, plan.subscribers);
            planRevenueMap.set(plan.planId, existing);
          });
        } catch (error) {
          // Add zero data for months with no revenue
          monthlyTrends.unshift({
            period: monthPeriod,
            revenue: 0,
            subscribers: 0,
          });
        }
      }

      return {
        totalRevenue,
        subscriptionRevenue: totalSubscriptionRevenue,
        overageRevenue: totalOverageRevenue,
        revenueByPlan: Array.from(planRevenueMap.entries()).map(([planId, data]) => ({
          planId,
          planName: data.name,
          revenue: data.revenue,
          subscribers: data.subscribers,
        })),
        monthlyTrends,
      };
    }
  }

  /**
   * Estimate next month's bill based on current usage trends
   */
  async estimateNextBill(userId: string): Promise<BillingCalculation & { isEstimate: boolean }> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentDay = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

    // Get current month's usage
    const currentUsage = await usageService.getUserUsage(userId, currentMonth);

    // Estimate full month usage based on current progress
    const progressRatio = currentDay / daysInMonth;
    const estimatedUsage = {
      ...currentUsage,
      aiRequestsCount: Math.ceil(currentUsage.aiRequestsCount / progressRatio),
      deploymentCount: Math.ceil(currentUsage.deploymentCount / progressRatio),
      securityScansCount: Math.ceil(currentUsage.securityScansCount / progressRatio),
      storageUsed: currentUsage.storageUsed, // Storage doesn't scale linearly
      bandwidthUsed: BigInt(Math.ceil(Number(currentUsage.bandwidthUsed) / progressRatio)),
    };

    // Calculate billing with estimated usage
    const subscription = await subscriptionService.getUserSubscription(userId);
    if (!subscription) {
      throw new Error('No active subscription found for user');
    }

    const limits = subscription.plan.features as any;
    const overageRates = this.getOverageRates(subscription.plan.id);
    const baseAmount = subscription.plan.price;

    const overageCharges = {
      aiRequests: this.calculateOverage(
        estimatedUsage.aiRequestsCount,
        limits.aiRequestsPerMonth,
        overageRates.aiRequestsPerUnit
      ),
      deployments: this.calculateOverage(
        estimatedUsage.deploymentCount,
        limits.deploymentsPerMonth,
        overageRates.deploymentsPerUnit
      ),
      securityScans: this.calculateOverage(
        estimatedUsage.securityScansCount,
        limits.securityScansPerMonth,
        overageRates.securityScansPerUnit
      ),
      storage: this.calculateStorageOverage(
        estimatedUsage.storageUsed,
        limits.storageGB,
        overageRates.storagePerGB
      ),
      bandwidth: this.calculateBandwidthOverage(
        estimatedUsage.bandwidthUsed,
        limits.bandwidthGB || 0,
        overageRates.bandwidthPerGB
      ),
    };

    const totalOverage = Object.values(overageCharges).reduce((sum, charge) => sum + charge, 0);
    const totalAmount = baseAmount + totalOverage;

    return {
      userId,
      period: currentMonth,
      baseAmount,
      overageCharges,
      totalOverage,
      totalAmount,
      currency: subscription.plan.currency,
      isEstimate: true,
    };
  }
}

export const billingService = new BillingService();