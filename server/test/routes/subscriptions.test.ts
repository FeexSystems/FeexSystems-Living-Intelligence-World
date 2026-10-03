/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createServer } from '../../index';
import { JWTService } from '../../lib/auth';
import bcrypt from 'bcryptjs';



const prisma = new PrismaClient();
const app = createServer();

describe('Subscription Routes', () => {
  let testUserId: string;
  let testPlanId: string;
  let authToken: string;
  let subscriptionId: string;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();



    // Create test user
    const passwordHash = await bcrypt.hash('testpassword', 12);
    const user = await prisma.user.create({
      data: {
        id: `usr_test_${Date.now()}`,
        email: 'subscription-test@example.com',
        passwordHash,
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true,
      },
    });
    testUserId = user.id;

    // Generate auth token
    authToken = JWTService.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Create test plan
    const plan = await prisma.plan.create({
      data: {
        name: 'Test Plan',
        description: 'A test subscription plan',
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
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await prisma.plan.deleteMany({
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
      // We expect TRIALING because the plan has trial days
      expect(response.body.data.subscription.status).toBe('TRIALING');
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
          id: `usr_test_other_${Date.now()}`,
          email: 'other-user@example.com',
          passwordHash: await bcrypt.hash('password', 12),
          firstName: 'Other',
          lastName: 'User',
          emailVerified: true,
        },
      });

      const otherToken = JWTService.generateAccessToken({
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

      expect(response.body.error.type).toBe('SUBSCRIPTION_ERROR');
      expect(response.body.error.code).toBe('SUBSCRIPTION_REQUIRED');

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


});