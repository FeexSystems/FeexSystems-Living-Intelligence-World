import { describe, it, expect } from 'vitest';
import {
  planSchema,
  subscriptionSchema,
  createSubscriptionRequestSchema,
  updateSubscriptionRequestSchema,
  cancelSubscriptionRequestSchema,
  usageMetricsSchema,
  billingPortalRequestSchema,
  featureLimitsSchema,
  usageActionSchema,
  periodSchema,
} from '../subscription';

describe('Subscription Validation Schemas', () => {
  describe('planSchema', () => {
    it('should validate a valid plan', () => {
      const validPlan = {
        id: 'clp123456789',
        name: 'Professional Plan',
        description: 'A professional plan for teams',
        stripePriceId: 'price_1234567890',
        stripeProductId: 'prod_1234567890',
        price: 2900,
        currency: 'usd',
        interval: 'month' as const,
        intervalCount: 1,
        trialPeriodDays: 14,
        features: { aiRequestsPerMonth: 100 },
        isActive: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => planSchema.parse(validPlan)).not.toThrow();
    });

    it('should reject invalid currency', () => {
      const invalidPlan = {
        id: 'clp123456789',
        name: 'Test Plan',
        description: null,
        stripePriceId: 'price_123',
        stripeProductId: 'prod_123',
        price: 1000,
        currency: 'invalid', // Invalid currency
        interval: 'month' as const,
        intervalCount: 1,
        trialPeriodDays: null,
        features: {},
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => planSchema.parse(invalidPlan)).toThrow('Currency must be 3 characters');
    });

    it('should reject invalid interval', () => {
      const invalidPlan = {
        id: 'clp123456789',
        name: 'Test Plan',
        description: null,
        stripePriceId: 'price_123',
        stripeProductId: 'prod_123',
        price: 1000,
        currency: 'usd',
        interval: 'week' as any, // Invalid interval
        intervalCount: 1,
        trialPeriodDays: null,
        features: {},
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => planSchema.parse(invalidPlan)).toThrow('Interval must be month or year');
    });
  });

  describe('subscriptionSchema', () => {
    it('should validate a valid subscription', () => {
      const validSubscription = {
        id: 'cls123456789',
        userId: 'clu123456789',
        planId: 'clp123456789',
        status: 'ACTIVE' as const,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: 'sub_123456789',
        stripeCustomerId: 'cus_123456789',
        trialStart: null,
        trialEnd: null,
        canceledAt: null,
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => subscriptionSchema.parse(validSubscription)).not.toThrow();
    });

    it('should reject invalid status', () => {
      const invalidSubscription = {
        id: 'cls123456789',
        userId: 'clu123456789',
        planId: 'clp123456789',
        status: 'INVALID_STATUS' as any,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        trialStart: null,
        trialEnd: null,
        canceledAt: null,
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => subscriptionSchema.parse(invalidSubscription)).toThrow();
    });
  });

  describe('createSubscriptionRequestSchema', () => {
    it('should validate valid create subscription request', () => {
      const validRequest = {
        planId: 'clp123456789',
        paymentMethodId: 'pm_123456789',
        trialPeriodDays: 14,
      };

      expect(() => createSubscriptionRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should validate minimal create subscription request', () => {
      const minimalRequest = {
        planId: 'clp123456789',
      };

      expect(() => createSubscriptionRequestSchema.parse(minimalRequest)).not.toThrow();
    });

    it('should reject invalid plan ID format', () => {
      const invalidRequest = {
        planId: 'invalid-id',
      };

      expect(() => createSubscriptionRequestSchema.parse(invalidRequest)).toThrow('Invalid plan ID format');
    });

    it('should reject negative trial period', () => {
      const invalidRequest = {
        planId: 'clp123456789',
        trialPeriodDays: -1,
      };

      expect(() => createSubscriptionRequestSchema.parse(invalidRequest)).toThrow('Trial period must be non-negative');
    });

    it('should reject trial period over 365 days', () => {
      const invalidRequest = {
        planId: 'clp123456789',
        trialPeriodDays: 400,
      };

      expect(() => createSubscriptionRequestSchema.parse(invalidRequest)).toThrow('Trial period cannot exceed 365 days');
    });
  });

  describe('updateSubscriptionRequestSchema', () => {
    it('should validate valid update request', () => {
      const validRequest = {
        planId: 'clp123456789',
        cancelAtPeriodEnd: true,
      };

      expect(() => updateSubscriptionRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should validate empty update request', () => {
      const emptyRequest = {};

      expect(() => updateSubscriptionRequestSchema.parse(emptyRequest)).not.toThrow();
    });

    it('should reject invalid plan ID format', () => {
      const invalidRequest = {
        planId: 'invalid-id',
      };

      expect(() => updateSubscriptionRequestSchema.parse(invalidRequest)).toThrow('Invalid plan ID format');
    });
  });

  describe('cancelSubscriptionRequestSchema', () => {
    it('should parse immediate=true', () => {
      const request = { immediate: 'true' };
      const result = cancelSubscriptionRequestSchema.parse(request);
      expect(result.immediate).toBe(true);
    });

    it('should parse immediate=false', () => {
      const request = { immediate: 'false' };
      const result = cancelSubscriptionRequestSchema.parse(request);
      expect(result.immediate).toBe(false);
    });

    it('should default to false when immediate is not provided', () => {
      const request = {};
      const result = cancelSubscriptionRequestSchema.parse(request);
      expect(result.immediate).toBe(false);
    });
  });

  describe('usageMetricsSchema', () => {
    it('should validate valid usage metrics', () => {
      const validMetrics = {
        id: 'clm123456789',
        userId: 'clu123456789',
        period: '2024-01',
        aiRequestsCount: 50,
        deploymentCount: 5,
        securityScansCount: 2,
        storageUsed: 1024n,
        bandwidthUsed: 2048n,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => usageMetricsSchema.parse(validMetrics)).not.toThrow();
    });

    it('should reject invalid period format', () => {
      const invalidMetrics = {
        id: 'clm123456789',
        userId: 'clu123456789',
        period: '2024-1', // Invalid format
        aiRequestsCount: 50,
        deploymentCount: 5,
        securityScansCount: 2,
        storageUsed: 1024n,
        bandwidthUsed: 2048n,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => usageMetricsSchema.parse(invalidMetrics)).toThrow('Period must be in YYYY-MM format');
    });

    it('should reject negative counts', () => {
      const invalidMetrics = {
        id: 'clm123456789',
        userId: 'clu123456789',
        period: '2024-01',
        aiRequestsCount: -1, // Negative count
        deploymentCount: 5,
        securityScansCount: 2,
        storageUsed: 1024n,
        bandwidthUsed: 2048n,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => usageMetricsSchema.parse(invalidMetrics)).toThrow();
    });
  });

  describe('billingPortalRequestSchema', () => {
    it('should validate valid return URL', () => {
      const validRequest = {
        returnUrl: 'https://example.com/billing',
      };

      expect(() => billingPortalRequestSchema.parse(validRequest)).not.toThrow();
    });

    it.skip('should use default return URL when not provided', () => {
      const request = {};
      process.env.FRONTEND_URL = 'http://localhost:3000';
      const result = billingPortalRequestSchema.parse(request);
      expect(result.returnUrl).toBe('http://localhost:3000/dashboard/billing');
    });

    it('should reject invalid URL', () => {
      const invalidRequest = {
        returnUrl: 'not-a-url',
      };

      expect(() => billingPortalRequestSchema.parse(invalidRequest)).toThrow('Return URL must be a valid URL');
    });
  });

  describe('featureLimitsSchema', () => {
    it('should validate valid feature limits', () => {
      const validLimits = {
        aiRequestsPerMonth: 100,
        deploymentsPerMonth: 10,
        securityScansPerMonth: 5,
        storageGB: 50,
        bandwidthGB: 100,
        teamMembers: 5,
        customIntegrations: true,
        prioritySupport: true,
        advancedAnalytics: false,
        whiteLabeling: false,
      };

      expect(() => featureLimitsSchema.parse(validLimits)).not.toThrow();
    });

    it('should validate partial feature limits', () => {
      const partialLimits = {
        aiRequestsPerMonth: 50,
        teamMembers: 2,
      };

      expect(() => featureLimitsSchema.parse(partialLimits)).not.toThrow();
    });

    it('should reject negative values', () => {
      const invalidLimits = {
        aiRequestsPerMonth: -1,
      };

      expect(() => featureLimitsSchema.parse(invalidLimits)).toThrow();
    });

    it('should reject zero team members', () => {
      const invalidLimits = {
        teamMembers: 0,
      };

      expect(() => featureLimitsSchema.parse(invalidLimits)).toThrow();
    });
  });

  describe('usageActionSchema', () => {
    it('should validate valid usage actions', () => {
      expect(() => usageActionSchema.parse('ai_request')).not.toThrow();
      expect(() => usageActionSchema.parse('deployment')).not.toThrow();
      expect(() => usageActionSchema.parse('security_scan')).not.toThrow();
    });

    it('should reject invalid usage action', () => {
      expect(() => usageActionSchema.parse('invalid_action')).toThrow('Invalid usage action type');
    });
  });

  describe('periodSchema', () => {
    it('should validate valid periods', () => {
      expect(() => periodSchema.parse('2024-01')).not.toThrow();
      expect(() => periodSchema.parse('2024-12')).not.toThrow();
      expect(() => periodSchema.parse('2025-06')).not.toThrow();
    });

    it('should reject invalid format', () => {
      expect(() => periodSchema.parse('2024-1')).toThrow('Period must be in YYYY-MM format');
      expect(() => periodSchema.parse('24-01')).toThrow('Period must be in YYYY-MM format');
      expect(() => periodSchema.parse('2024/01')).toThrow('Period must be in YYYY-MM format');
    });

    it('should reject invalid months', () => {
      expect(() => periodSchema.parse('2024-00')).toThrow('Period must be a valid year-month combination');
      expect(() => periodSchema.parse('2024-13')).toThrow('Period must be a valid year-month combination');
    });

    it('should reject invalid years', () => {
      expect(() => periodSchema.parse('2019-01')).toThrow('Period must be a valid year-month combination');
      expect(() => periodSchema.parse('2031-01')).toThrow('Period must be a valid year-month combination');
    });
  });
});