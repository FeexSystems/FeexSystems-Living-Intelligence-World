/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createServer } from '../../index';
import { generateAccessToken } from '../../lib/auth';
import bcrypt from 'bcryptjs';

// Mock Stripe service
vi.mock('../../lib/services/stripe.service', () => ({
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
    updateSubscription: vi.fn().mockResolvedValue({
      id: 'sub_test123',
      status: 'active',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      cancel_at_period_end: true,
      canceled_at: null,
      ended_at: null,
    }),
    cancelSubscription: vi.fn().mockResolvedValue({
      id: 'sub_test123',
      status: 'canceled',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      cancel_at_period_end: false,
      canceled_at: Math.floor(Date.now() / 1000),
      ended_at: Math.floor(Date.now() / 1000),
    }),
    createBillingPortalSession: vi.fn().mockResolvedValue({
      url: 'https://billing.stripe.com/session/test123',
    }),
  },
}));

// Mock webhook service
vi.mock('../../lib/services/webhook.service', () => ({
  webhookService: {
    processStripeWebhook: vi.fn().mockResolvedValue(undefined),
  },
}));

const prisma = new PrismaClient();
const app = createServer();

describe('Subscription Routes', () => {
  let testUserId;
  let testPlanId;
  let authToken;
  let subscriptionId;

  beforeEach(async () => {
    // Create test user
    const passwordHash = await bcrypt.hash('testpassword', 12);
    const user = await prisma.user.create({
      data: {
        email: 'subscription-test@example.com',
        passwordHash,
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true,
      },
    });
    testUserId = user.id;

    // Generate auth token
    authToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Create test plan
    const plan = await prisma.plan.create({
      data: {
        name: 'Test Plan',
        description: 'A test subscription plan',
        stripePriceId: 'price_test123',
        stripeProductId: 'prod_test123',
        price: 2900,
        currency: 'usd',
        interval: 'month',
        intervalCount: 1,
        trialPeriodDays: 14,
        features: {
          aiRequestsPerMonth: 100,
          deploymentsPerMonth: 10,
          securityScansPerMonth: 5,
          storageGB: 10,
          teamMembers: 5,
        },
        isActive: true,
        sortOrder: 1,
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

  describe('GET /api/subscriptions/plans', () => {
    it('should return available plans', async () => {
      const response = await request(app)
        .get('/api/subscriptions/plans')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.plans).toHaveLength(1);
      expect(response.body.data.plans[0].name).toBe('Test Plan');
      expect(response.body.data.plans[0].isActive).toBe(true);
    });
  });

  describe('GET /api/subscriptions/current', () => {
    it('should return null when user has no subscription', async () => {
      const response = await request(app)
        .get('/api/subscriptions/current')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription).toBeNull();
    });

    it('should return user subscription when exists', async () => {
      // Create subscription
      const subscription = await prisma.subscription.create({
        data: {
          userId: testUserId,
          planId: testPlanId,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stripeSubscriptionId: 'sub_test123',
          stripeCustomerId: 'cus_test123',
        },
      });

      const response = await request(app)
        .get('/api/subscriptions/current')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription).toBeDefined();
      expect(response.body.data.subscription.id).toBe(subscription.id);
      expect(response.body.data.subscription.plan.name).toBe('Test Plan');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/subscriptions/current')
        .expect(401);
    });
  });

  describe('POST /api/subscriptions/create', () => {
    it('should create a new subscription', async () => {
      const response = await request(app)
        .post('/api/subscriptions/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: testPlanId,
          trialPeriodDays: 14,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription).toBeDefined();
      expect(response.body.data.subscription.userId).toBe(testUserId);
      expect(response.body.data.subscription.planId).toBe(testPlanId);
      expect(response.body.data.subscription.status).toBe('ACTIVE');
    });

    it('should reject invalid plan ID', async () => {
      const response = await request(app)
        .post('/api/subscriptions/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: 'invalid-plan-id',
        })
        .expect(400);

      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('should reject duplicate subscription', async () => {
      // Create first subscription
      await request(app)
        .post('/api/subscriptions/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: testPlanId,
        })
        .expect(201);

      // Try to create second subscription
      const response = await request(app)
        .post('/api/subscriptions/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: testPlanId,
        })
        .expect(409);

      expect(response.body.error.type).toBe('SUBSCRIPTION_ERROR');
      expect(response.body.error.code).toBe('SUBSCRIPTION_EXISTS');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/subscriptions/create')
        .send({
          planId: testPlanId,
        })
        .expect(401);
    });
  });

  describe('PUT /api/subscriptions/:id', () => {
    beforeEach(async () => {
      // Create subscription for update tests
      const subscription = await prisma.subscription.create({
        data: {
          userId: testUserId,
          planId: testPlanId,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stripeSubscriptionId: 'sub_test123',
          stripeCustomerId: 'cus_test123',
        },
      });
      subscriptionId = subscription.id;
    });

    it('should update subscription', async () => {
      const response = await request(app)
        .put(`/api/subscriptions/${subscriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cancelAtPeriodEnd: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription.cancelAtPeriodEnd).toBe(true);
    });

    it('should reject unauthorized access', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          email: 'other-user@example.com',
          passwordHash: await bcrypt.hash('password', 12),
          firstName: 'Other',
          lastName: 'User',
          emailVerified: true,
        },
      });

      const otherToken = generateAccessToken({
        id: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
      });

      const response = await request(app)
        .put(`/api/subscriptions/${subscriptionId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          cancelAtPeriodEnd: true,
        })
        .expect(403);

      expect(response.body.error.type).toBe('AUTHORIZATION_ERROR');
      expect(response.body.error.code).toBe('SUBSCRIPTION_ACCESS_DENIED');

      // Clean up
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/subscriptions/${subscriptionId}`)
        .send({
          cancelAtPeriodEnd: true,
        })
        .expect(401);
    });
  });

  describe('DELETE /api/subscriptions/:id', () => {
    beforeEach(async () => {
      // Create subscription for cancel tests
      const subscription = await prisma.subscription.create({
        data: {
          userId: testUserId,
          planId: testPlanId,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stripeSubscriptionId: 'sub_test123',
          stripeCustomerId: 'cus_test123',
        },
      });
      subscriptionId = subscription.id;
    });

    it('should cancel subscription at period end', async () => {
      const response = await request(app)
        .delete(`/api/subscriptions/${subscriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription.cancelAtPeriodEnd).toBe(true);
    });

    it('should cancel subscription immediately', async () => {
      const response = await request(app)
        .delete(`/api/subscriptions/${subscriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ immediate: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription.status).toBe('CANCELED');
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/subscriptions/${subscriptionId}`)
        .expect(401);
    });
  });

  describe('GET /api/subscriptions/usage', () => {
    it('should return usage and limits', async () => {
      // Create subscription
      await prisma.subscription.create({
        data: {
          userId: testUserId,
          planId: testPlanId,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stripeSubscriptionId: 'sub_test123',
          stripeCustomerId: 'cus_test123',
        },
      });

      // Create usage metrics
      const period = new Date().toISOString().slice(0, 7);
      await prisma.usageMetrics.create({
        data: {
          userId: testUserId,
          period,
          aiRequestsCount: 25,
          deploymentCount: 3,
          securityScansCount: 1,
          storageUsed: 1024n,
          bandwidthUsed: 2048n,
        },
      });

      const response = await request(app)
        .get('/api/subscriptions/usage')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.limits).toBeDefined();
      expect(response.body.data.usage).toBeDefined();
      expect(response.body.data.usage.aiRequestsCount).toBe(25);
      expect(response.body.data.limits.aiRequestsPerMonth).toBe(100);
    });

    it('should return free tier limits for non-subscribed user', async () => {
      const response = await request(app)
        .get('/api/subscriptions/usage')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.limits.aiRequestsPerMonth).toBe(10);
      expect(response.body.data.limits.deploymentsPerMonth).toBe(2);
      expect(response.body.data.limits.securityScansPerMonth).toBe(1);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/subscriptions/usage')
        .expect(401);
    });
  });

  describe('POST /api/subscriptions/billing-portal', () => {
    beforeEach(async () => {
      // Create subscription for billing portal tests
      await prisma.subscription.create({
        data: {
          userId: testUserId,
          planId: testPlanId,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stripeSubscriptionId: 'sub_test123',
          stripeCustomerId: 'cus_test123',
        },
      });
    });

    it('should create billing portal session', async () => {
      const response = await request(app)
        .post('/api/subscriptions/billing-portal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          returnUrl: 'https://example.com/billing',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.url).toBe('https://billing.stripe.com/session/test123');
    });

    it('should use default return URL', async () => {
      const response = await request(app)
        .post('/api/subscriptions/billing-portal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.url).toBeDefined();
    });

    it('should require active subscription', async () => {
      // Delete subscription to test requirement
      await prisma.subscription.deleteMany({
        where: { userId: testUserId },
      });

      await request(app)
        .post('/api/subscriptions/billing-portal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/subscriptions/billing-portal')
        .send({})
        .expect(401);
    });
  });

  describe('POST /api/subscriptions/webhook', () => {
    it('should process webhook with valid signature', async () => {
      const response = await request(app)
        .post('/api/subscriptions/webhook')
        .set('stripe-signature', 'test-signature')
        .send(Buffer.from('test-payload'))
        .expect(200);

      expect(response.body.received).toBe(true);
    });

    it('should reject webhook without signature', async () => {
      const response = await request(app)
        .post('/api/subscriptions/webhook')
        .send(Buffer.from('test-payload'))
        .expect(400);

      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.code).toBe('MISSING_SIGNATURE');
    });
  });
});