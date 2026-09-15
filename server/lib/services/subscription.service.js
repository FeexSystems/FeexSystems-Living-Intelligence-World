import { PrismaClient, } from '@prisma/client';

const prisma = new PrismaClient();

















export class SubscriptionService {
  /**
   * Get all available plans
   */
  async getPlans() {
    return await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId) {
    return await prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
        },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new subscription (without Stripe - direct database only)
   */
  async createSubscription(request)

 {
    // Get user and plan
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const plan = await prisma.plan.findUnique({
      where: { id: request.planId },
    });

    if (!plan || !plan.isActive) {
      throw new Error('Plan not found or inactive');
    }

    // Check if user already has an active subscription
    const existingSubscription = await this.getUserSubscription(request.userId);
    if (existingSubscription) {
      throw new Error('User already has an active subscription');
    }

    // Calculate subscription period
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month subscription period

    // Handle trial period
    let status = 'ACTIVE';
    let trialStart = null;
    let trialEnd = null;

    const trialDays = request.trialPeriodDays || plan.trialPeriodDays || 0;
    if (trialDays > 0) {
      status = 'TRIALING';
      trialStart = now;
      trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + trialDays);
    }

    // Create subscription in database
    const subscription = await prisma.subscription.create({
      data: {
        userId: request.userId,
        planId: request.planId,
        status,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialStart,
        trialEnd,
        cancelAtPeriodEnd: false,
      },
      include: { plan: true },
    });

    console.log(`✅ Created subscription ${subscription.id} for user ${request.userId} (Stripe disabled)`);

    return { subscription };
  }

  /**
   * Update an existing subscription (without Stripe - direct database only)
   */
  async updateSubscription(request) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: request.subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const updateData = {};

    if (request.planId && request.planId !== subscription.planId) {
      const newPlan = await prisma.plan.findUnique({
        where: { id: request.planId },
      });

      if (!newPlan || !newPlan.isActive) {
        throw new Error('New plan not found or inactive');
      }

      updateData.planId = request.planId;
    }

    if (request.cancelAtPeriodEnd !== undefined) {
      updateData.cancelAtPeriodEnd = request.cancelAtPeriodEnd;
      if (request.cancelAtPeriodEnd) {
        updateData.canceledAt = new Date();
      }
    }

    // Update database
    const updatedSubscription = await prisma.subscription.update({
      where: { id: request.subscriptionId },
      data: updateData,
      include: { plan: true },
    });

    console.log(`✅ Updated subscription ${subscription.id} (Stripe disabled)`);

    return updatedSubscription;
  }

  /**
   * Cancel a subscription (without Stripe - direct database only)
   */
  async cancelSubscription(subscriptionId, immediate = false) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const updateData = {
      canceledAt: new Date(),
    };

    if (immediate) {
      updateData.status = 'CANCELED';
      updateData.endedAt = new Date();
      updateData.cancelAtPeriodEnd = false;
    } else {
      updateData.cancelAtPeriodEnd = true;
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
      include: { plan: true },
    });

    console.log(`✅ Canceled subscription ${subscriptionId} (immediate: ${immediate}, Stripe disabled)`);

    return updatedSubscription;
  }

  /**
   * Get subscription usage limits
   */
  async getSubscriptionLimits(userId) {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      // Return free tier limits
      return {
        aiRequestsPerMonth: 10,
        deploymentsPerMonth: 2,
        securityScansPerMonth: 1,
        storageGB: 1,
        teamMembers: 1,
      };
    }

    return subscription.plan.features ;
  }

  /**
   * Check if user can perform an action based on subscription limits
   */
  async canPerformAction(
    userId,
    action,
    period = new Date().toISOString().slice(0, 7) // YYYY-MM format
  ) {
    const limits = await this.getSubscriptionLimits(userId);
    if (!limits) return false;

    const usage = await prisma.usageMetrics.findUnique({
      where: {
        userId_period: {
          userId,
          period,
        },
      },
    });

    const currentUsage = usage || {
      aiRequestsCount: 0,
      deploymentCount: 0,
      securityScansCount: 0,
    };

    switch (action) {
      case 'ai_request':
        return currentUsage.aiRequestsCount < (limits['aiRequestsPerMonth'] || 0);
      case 'deployment':
        return currentUsage.deploymentCount < (limits['deploymentsPerMonth'] || 0);
      case 'security_scan':
        return currentUsage.securityScansCount < (limits['securityScansPerMonth'] || 0);
      default:
        return false;
    }
  }

  /**
   * Map status string to database enum (for compatibility)
   */
  mapStatusToDb(status) {
    const statusMap = {
      'active': 'ACTIVE',
      'canceled': 'CANCELED',
      'incomplete': 'INCOMPLETE',
      'incomplete_expired': 'INCOMPLETE_EXPIRED',
      'past_due': 'PAST_DUE',
      'trialing': 'TRIALING',
      'unpaid': 'UNPAID',
      'paused': 'PAUSED',
    };
    return statusMap[status.toLowerCase()] || 'INCOMPLETE';
  }
}

export const subscriptionService = new SubscriptionService();