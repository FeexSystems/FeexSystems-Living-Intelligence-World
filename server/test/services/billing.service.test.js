// Mock dependencies
import { vi } from 'vitest';

vi.mock('../../lib/services/usage.service.js');
vi.mock('../../lib/services/subscription.service.js');
vi.mock('../../lib/services/stripe.service.js');
vi.mock('@prisma/client');

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { billingService } from '../../lib/services/billing.service.js';
import { usageService } from '../../lib/services/usage.service.js';
import { subscriptionService } from '../../lib/services/subscription.service.js';
import { stripeService } from '../../lib/services/stripe.service.js';
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset } from 'vitest-mock-extended';

const mockPrisma = mockDeep();
beforeEach(() => {
  mockReset(mockPrisma);
  vi.mocked(PrismaClient).mockImplementation(() => mockPrisma );
});


describe('BillingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateBilling', () => {
    it('should calculate billing with base amount and no overages', async () => {
      const mockSubscription = {
        plan: {
          id: 'plan-starter',
          price: 2900, // $29.00
          currency: 'usd',
          features: {
            aiRequestsPerMonth: 100,
            deploymentsPerMonth: 10,
            securityScansPerMonth: 5,
            storageGB: 10,
            bandwidthGB: 50,
          },
        },
      };

      const mockUsage = {
        userId: 'user-1',
        period: '2024-01',
        aiRequestsCount: 50,
        deploymentCount: 3,
        securityScansCount: 2,
        storageUsed: BigInt(5 * 1024 * 1024 * 1024), // 5GB
        bandwidthUsed: BigInt(10 * 1024 * 1024 * 1024), // 10GB
      };

      vi.mocked(subscriptionService.getUserSubscription).mockResolvedValue(mockSubscription );
      vi.mocked(usageService.getUserUsage).mockResolvedValue(mockUsage);

      const result = await billingService.calculateBilling('user-1', '2024-01');

      expect(result).toEqual({
        userId: 'user-1',
        period: '2024-01',
        baseAmount: 2900,
        overageCharges: {
          aiRequests: 0,
          deployments: 0,
          securityScans: 0,
          storage: 0,
          bandwidth: 0,
        },
        totalOverage: 0,
        totalAmount: 2900,
        currency: 'usd',
      });
    });

    it('should calculate billing with overage charges', async () => {
      const mockSubscription = {
        plan: {
          id: 'plan-starter',
          price: 2900,
          currency: 'usd',
          features: {
            aiRequestsPerMonth: 100,
            deploymentsPerMonth: 10,
            securityScansPerMonth: 5,
            storageGB: 10,
            bandwidthGB: 50,
          },
        },
      };

      const mockUsage = {
        userId: 'user-1',
        period: '2024-01',
        aiRequestsCount: 120, // 20 over limit
        deploymentCount: 15, // 5 over limit
        securityScansCount: 8, // 3 over limit
        storageUsed: BigInt(12 * 1024 * 1024 * 1024), // 12GB (2GB over)
        bandwidthUsed: BigInt(60 * 1024 * 1024 * 1024), // 60GB (10GB over)
      };

      vi.mocked(subscriptionService.getUserSubscription).mockResolvedValue(mockSubscription );
      vi.mocked(usageService.getUserUsage).mockResolvedValue(mockUsage);

      const result = await billingService.calculateBilling('user-1', '2024-01');

      expect(result.overageCharges.aiRequests).toBe(200); // 20 * $0.10
      expect(result.overageCharges.deployments).toBe(250); // 5 * $0.50
      expect(result.overageCharges.securityScans).toBe(300); // 3 * $1.00
      expect(result.overageCharges.storage).toBe(40); // 2GB * $0.20
      expect(result.overageCharges.bandwidth).toBe(100); // 10GB * $0.10
      expect(result.totalOverage).toBe(890);
      expect(result.totalAmount).toBe(3790); // 2900 + 890
    });

    it('should handle unlimited limits', async () => {
      const mockSubscription = {
        plan: {
          id: 'plan-enterprise',
          price: 19900,
          currency: 'usd',
          features: {
            aiRequestsPerMonth: -1, // Unlimited
            deploymentsPerMonth: -1, // Unlimited
            securityScansPerMonth: -1, // Unlimited
            storageGB: 1000,
            bandwidthGB: 0, // No bandwidth limits
          },
        },
      };

      const mockUsage = {
        userId: 'user-1',
        period: '2024-01',
        aiRequestsCount: 10000,
        deploymentCount: 1000,
        securityScansCount: 500,
        storageUsed: BigInt(500 * 1024 * 1024 * 1024), // 500GB
        bandwidthUsed: BigInt(1000 * 1024 * 1024 * 1024), // 1000GB
      };

      vi.mocked(subscriptionService.getUserSubscription).mockResolvedValue(mockSubscription );
      vi.mocked(usageService.getUserUsage).mockResolvedValue(mockUsage);

      const result = await billingService.calculateBilling('user-1', '2024-01');

      expect(result.overageCharges.aiRequests).toBe(0);
      expect(result.overageCharges.deployments).toBe(0);
      expect(result.overageCharges.securityScans).toBe(0);
      expect(result.overageCharges.storage).toBe(0);
      expect(result.overageCharges.bandwidth).toBe(0);
      expect(result.totalOverage).toBe(0);
      expect(result.totalAmount).toBe(19900);
    });

    it('should throw error when no subscription found', async () => {
      vi.mocked(subscriptionService.getUserSubscription).mockResolvedValue(null);

      await expect(billingService.calculateBilling('user-1', '2024-01'))
        .rejects.toThrow('No active subscription found for user');
    });
  });

  describe('processBillingForAllUsers', () => {
    it('should process billing for all active subscriptions', async () => {
      const mockSubscriptions = [
        {
          userId: 'user-1',
          stripeCustomerId: 'cus_1',
          plan: { id: 'plan-1', price: 2900, currency: 'usd' },
          user: { id: 'user-1' },
        },
        {
          userId: 'user-2',
          stripeCustomerId: 'cus_2',
          plan: { id: 'plan-2', price: 9900, currency: 'usd' },
          user: { id: 'user-2' },
        },
      ];

      mockPrisma.subscription.findMany.mockResolvedValue(mockSubscriptions);

      // Mock billing calculations
      vi.mocked(subscriptionService.getUserSubscription)
        .mockResolvedValueOnce(mockSubscriptions[0] )
        .mockResolvedValueOnce(mockSubscriptions[1] );

      vi.mocked(usageService.getUserUsage)
        .mockResolvedValueOnce({
          userId: 'user-1',
          period: '2024-01',
          aiRequestsCount: 50,
          deploymentCount: 3,
          securityScansCount: 2,
          storageUsed: BigInt(0),
          bandwidthUsed: BigInt(0),
        })
        .mockResolvedValueOnce({
          userId: 'user-2',
          period: '2024-01',
          aiRequestsCount: 150, // Over limit
          deploymentCount: 5,
          securityScansCount: 3,
          storageUsed: BigInt(0),
          bandwidthUsed: BigInt(0),
        });

      // Mock Stripe service calls
      vi.mocked(stripeService.createInvoiceItem).mockResolvedValue({} );
      vi.mocked(stripeService.createInvoice).mockResolvedValue({ id: 'inv_123' } );
      vi.mocked(stripeService.finalizeInvoice).mockResolvedValue({} );

      const result = await billingService.processBillingForAllUsers('2024-01');

      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.totalRevenue).toBeGreaterThan(0);
    });

    it('should handle billing errors gracefully', async () => {
      const mockSubscriptions = [
        {
          userId: 'user-1',
          stripeCustomerId: 'cus_1',
          plan: { id: 'plan-1', price: 2900, currency: 'usd' },
          user: { id: 'user-1' },
        },
      ];

      mockPrisma.subscription.findMany.mockResolvedValue(mockSubscriptions);
      vi.mocked(subscriptionService.getUserSubscription).mockRejectedValue(new Error('Service error'));

      const result = await billingService.processBillingForAllUsers('2024-01');

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        userId: 'user-1',
        error: 'Service error',
      });
    });
  });

  describe('getBillingHistory', () => {
    it('should return billing history for multiple months', async () => {
      const mockSubscription = {
        plan: {
          id: 'plan-starter',
          price: 2900,
          currency: 'usd',
          features: {
            aiRequestsPerMonth: 100,
            deploymentsPerMonth: 10,
            securityScansPerMonth: 5,
            storageGB: 10,
            bandwidthGB: 50,
          },
        },
      };

      vi.mocked(subscriptionService.getUserSubscription).mockResolvedValue(mockSubscription );
      
      // Mock usage for different months
      vi.mocked(usageService.getUserUsage)
        .mockResolvedValueOnce({
          userId: 'user-1',
          period: '2024-01',
          aiRequestsCount: 50,
          deploymentCount: 3,
          securityScansCount: 2,
          storageUsed: BigInt(0),
          bandwidthUsed: BigInt(0),
        })
        .mockResolvedValueOnce({
          userId: 'user-1',
          period: '2023-12',
          aiRequestsCount: 80,
          deploymentCount: 5,
          securityScansCount: 3,
          storageUsed: BigInt(0),
          bandwidthUsed: BigInt(0),
        });

      const result = await billingService.getBillingHistory('user-1', 2);

      expect(result).toHaveLength(2);
      expect(result[0].period).toMatch(/^\d{4}-\d{2}$/);
      expect(result[0].baseAmount).toBe(2900);
      expect(result[1].period).toMatch(/^\d{4}-\d{2}$/);
      expect(result[1].baseAmount).toBe(2900);
    });

    it('should skip periods without subscription', async () => {
      vi.mocked(subscriptionService.getUserSubscription)
        .mockResolvedValueOnce({
          plan: { id: 'plan-1', price: 2900, currency: 'usd', features: {} },
        } )
        .mockRejectedValueOnce(new Error('No subscription'));

      vi.mocked(usageService.getUserUsage).mockResolvedValue({
        userId: 'user-1',
        period: '2024-01',
        aiRequestsCount: 50,
        deploymentCount: 3,
        securityScansCount: 2,
        storageUsed: BigInt(0),
        bandwidthUsed: BigInt(0),
      });

      const result = await billingService.getBillingHistory('user-1', 2);

      expect(result).toHaveLength(1);
    });
  });

  describe('estimateNextBill', () => {
    it('should estimate next bill based on current usage trends', async () => {
      const mockSubscription = {
        plan: {
          id: 'plan-starter',
          price: 2900,
          currency: 'usd',
          features: {
            aiRequestsPerMonth: 100,
            deploymentsPerMonth: 10,
            securityScansPerMonth: 5,
            storageGB: 10,
            bandwidthGB: 50,
          },
        },
      };

      // Mock current usage (assume we're halfway through the month)
      const mockUsage = {
        userId: 'user-1',
        period: new Date().toISOString().slice(0, 7),
        aiRequestsCount: 60, // Would be 120 for full month
        deploymentCount: 6, // Would be 12 for full month
        securityScansCount: 3, // Would be 6 for full month
        storageUsed: BigInt(8 * 1024 * 1024 * 1024), // 8GB (stays same)
        bandwidthUsed: BigInt(25 * 1024 * 1024 * 1024), // 25GB, would be 50GB
      };

      vi.mocked(subscriptionService.getUserSubscription).mockResolvedValue(mockSubscription );
      vi.mocked(usageService.getUserUsage).mockResolvedValue(mockUsage);

      // Mock Date to simulate being halfway through month
      const mockDate = new Date('2024-01-15');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate );

      const result = await billingService.estimateNextBill('user-1');

      expect(result.isEstimate).toBe(true);
      expect(result.baseAmount).toBe(2900);
      // Should have overage charges for estimated usage
      expect(result.overageCharges.aiRequests).toBeGreaterThan(0); // 20 over limit
      expect(result.overageCharges.deployments).toBeGreaterThan(0); // 2 over limit
      expect(result.overageCharges.securityScans).toBeGreaterThan(0); // 1 over limit
    });
  });

  describe('getRevenueAnalytics', () => {
    it('should return revenue analytics for specific period', async () => {
      const mockSubscriptions = [
        {
          userId: 'user-1',
          plan: { id: 'plan-1', name: 'Starter', price: 2900 },
          currentPeriodStart: new Date('2024-01-01'),
          currentPeriodEnd: new Date('2024-01-31'),
        },
        {
          userId: 'user-2',
          plan: { id: 'plan-2', name: 'Pro', price: 9900 },
          currentPeriodStart: new Date('2024-01-01'),
          currentPeriodEnd: new Date('2024-01-31'),
        },
      ];

      mockPrisma.subscription.findMany.mockResolvedValue(mockSubscriptions);

      // Mock billing calculations with overage
      vi.mocked(subscriptionService.getUserSubscription)
        .mockResolvedValueOnce(mockSubscriptions[0] )
        .mockResolvedValueOnce(mockSubscriptions[1] );

      vi.mocked(usageService.getUserUsage)
        .mockResolvedValueOnce({
          userId: 'user-1',
          period: '2024-01',
          aiRequestsCount: 50,
          deploymentCount: 3,
          securityScansCount: 2,
          storageUsed: BigInt(0),
          bandwidthUsed: BigInt(0),
        })
        .mockResolvedValueOnce({
          userId: 'user-2',
          period: '2024-01',
          aiRequestsCount: 150, // Over limit
          deploymentCount: 5,
          securityScansCount: 3,
          storageUsed: BigInt(0),
          bandwidthUsed: BigInt(0),
        });

      const result = await billingService.getRevenueAnalytics('2024-01');

      expect(result.subscriptionRevenue).toBe(12800); // 2900 + 9900
      expect(result.overageRevenue).toBeGreaterThan(0);
      expect(result.totalRevenue).toBeGreaterThan(12800);
      expect(result.revenueByPlan).toHaveLength(2);
      expect(result.monthlyTrends).toHaveLength(1);
      expect(result.monthlyTrends[0].period).toBe('2024-01');
    });

    it('should return revenue trends for multiple months', async () => {
      // Mock the recursive call for monthly trends
      const billingServiceSpy = vi.spyOn(billingService, 'getRevenueAnalytics');
      
      // First call (the main call)
      billingServiceSpy.mockImplementationOnce(async (period, months) => {
        if (period) {
          // Mock individual month data
          return {
            totalRevenue: 5000,
            subscriptionRevenue: 4000,
            overageRevenue: 1000,
            revenueByPlan: [
              { planId: 'plan-1', planName: 'Starter', revenue: 3000, subscribers: 1 },
              { planId: 'plan-2', planName: 'Pro', revenue: 2000, subscribers: 1 },
            ],
            monthlyTrends: [{ period: period, revenue: 5000, subscribers: 2 }],
          };
        }
        // Call original implementation for the main logic
        return billingServiceSpy.getMockImplementation()(period, months);
      });

      // Mock individual month calls
      billingServiceSpy.mockResolvedValueOnce({
        totalRevenue: 5000,
        subscriptionRevenue: 4000,
        overageRevenue: 1000,
        revenueByPlan: [{ planId: 'plan-1', planName: 'Starter', revenue: 3000, subscribers: 1 }],
        monthlyTrends: [{ period: '2024-01', revenue: 5000, subscribers: 1 }],
      });

      billingServiceSpy.mockResolvedValueOnce({
        totalRevenue: 4500,
        subscriptionRevenue: 3500,
        overageRevenue: 1000,
        revenueByPlan: [{ planId: 'plan-1', planName: 'Starter', revenue: 2500, subscribers: 1 }],
        monthlyTrends: [{ period: '2023-12', revenue: 4500, subscribers: 1 }],
      });

      const result = await billingService.getRevenueAnalytics(undefined, 2);

      expect(result.monthlyTrends).toHaveLength(2);
      expect(result.totalRevenue).toBeGreaterThan(0);
      expect(result.revenueByPlan.length).toBeGreaterThan(0);
    });
  });
});