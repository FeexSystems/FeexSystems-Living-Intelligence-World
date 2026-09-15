import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { subscriptionService } from '../subscription.service';

// Mock Stripe service
vi.mock('../stripe.service', () => ({
  stripeService: {
    createCustomer: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
    createSubscription: vi.fn().mockResolvedValue({
      id: 'sub_test123',
      status: 'active',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 2592000, // +30 days
      cancel_at_period_end: false,
      trial_start: null,
      trial_end: null,
      canceled_at: null,
      ended_at: null,
      latest_invoice: null,
    }),
    updateSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
  },
}));

const prisma = new PrismaClient();

describe.skip('SubscriptionService', () => {
  let testUserId: string;
  let testPlanId: string;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test-subscription@example.com',
        passwordHash: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true,
      },
    });
    testUserId = user.id;

    // Create test plan
    const plan = await prisma.plan.create({
      data: {
        name: 'Test Plan',
        description: 'A test plan',
        stripePriceId: 'price_test123',
        stripeProductId: 'prod_test123',
        price: 2900,
        currency: 'usd',
        interval: 'month',
        intervalCount: 1,
        features: {
          aiRequestsPerMonth: 100,
          deploymentsPerMonth: 10,
          securityScansPerMonth: 5,
        },
        isActive: true,
      },
    });
    testPlanId = plan.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.subscription.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.usageMetrics.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.plan.delete({
      where: { id: testPlanId },
    });
  });

  describe('getPlans', () => {
    it('should return active plans', async () => {
      const plans = await subscriptionService.getPlans();
      
      expect(plans).toHaveLength(1);
      expect(plans[0].name).toBe('Test Plan');
      expect(plans[0].isActive).toBe(true);
    });
  });

  describe('createSubscription', () => {
    it('should create a new subscription', async () => {
      const result = await subscriptionService.createSubscription({
        userId: testUserId,
        planId: testPlanId,
      });

      expect(result.subscription).toBeDefined();
      expect(result.subscription.userId).toBe(testUserId);
      expect(result.subscription.planId).toBe(testPlanId);
      expect(result.subscription.status).toBe('ACTIVE');
      expect(result.subscription.stripeSubscriptionId).toBe('sub_test123');
    });

    it('should throw error if user already has active subscription', async () => {
      // Create first subscription
      await subscriptionService.createSubscription({
        userId: testUserId,
        planId: testPlanId,
      });

      // Try to create second subscription
      await expect(
        subscriptionService.createSubscription({
          userId: testUserId,
          planId: testPlanId,
        })
      ).rejects.toThrow('User already has an active subscription');
    });

    it('should throw error if plan not found', async () => {
      await expect(
        subscriptionService.createSubscription({
          userId: testUserId,
          planId: 'non-existent-plan',
        })
      ).rejects.toThrow('Plan not found or inactive');
    });
  });

  describe('getUserSubscription', () => {
    it('should return user subscription', async () => {
      // Create subscription
      await subscriptionService.createSubscription({
        userId: testUserId,
        planId: testPlanId,
      });

      const subscription = await subscriptionService.getUserSubscription(testUserId);
      
      expect(subscription).toBeDefined();
      expect(subscription!.userId).toBe(testUserId);
      expect(subscription!.plan.name).toBe('Test Plan');
    });

    it('should return null if no active subscription', async () => {
      const subscription = await subscriptionService.getUserSubscription(testUserId);
      
      expect(subscription).toBeNull();
    });
  });

  describe('getSubscriptionLimits', () => {
    it('should return plan limits for subscribed user', async () => {
      // Create subscription
      await subscriptionService.createSubscription({
        userId: testUserId,
        planId: testPlanId,
      });

      const limits = await subscriptionService.getSubscriptionLimits(testUserId);
      
      expect(limits).toEqual({
        aiRequestsPerMonth: 100,
        deploymentsPerMonth: 10,
        securityScansPerMonth: 5,
      });
    });

    it('should return free tier limits for non-subscribed user', async () => {
      const limits = await subscriptionService.getSubscriptionLimits(testUserId);
      
      expect(limits).toEqual({
        aiRequestsPerMonth: 10,
        deploymentsPerMonth: 2,
        securityScansPerMonth: 1,
        storageGB: 1,
        teamMembers: 1,
      });
    });
  });

  describe('canPerformAction', () => {
    it('should allow action when under limit', async () => {
      // Create subscription
      await subscriptionService.createSubscription({
        userId: testUserId,
        planId: testPlanId,
      });

      const canPerform = await subscriptionService.canPerformAction(
        testUserId,
        'ai_request'
      );
      
      expect(canPerform).toBe(true);
    });

    it('should deny action when over limit', async () => {
      // Create subscription
      await subscriptionService.createSubscription({
        userId: testUserId,
        planId: testPlanId,
      });

      // Create usage that exceeds limit
      const period = new Date().toISOString().slice(0, 7);
      await prisma.usageMetrics.create({
        data: {
          userId: testUserId,
          period,
          aiRequestsCount: 100, // At limit
        },
      });

      const canPerform = await subscriptionService.canPerformAction(
        testUserId,
        'ai_request'
      );
      
      expect(canPerform).toBe(false);
    });
  });
});