import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import billingRoutes from '../../routes/billing.js';
import { billingService } from '../../lib/services/billing.service.js';
import { requireAuth } from '../../lib/middleware/auth.middleware.js';

// Mock services and middleware
vi.mock('../../lib/services/billing.service.js');
vi.mock('../../lib/middleware/auth.middleware.js');
vi.mock('../../lib/middleware/rate-limit.middleware.js', () => ({
  trackBandwidthUsage: () => (req, res, next) => next(),
}));

const app = express();
app.use(express.json());

// Mock auth middleware to add user to request
vi.mocked(requireAuth).mockImplementation((req, res, next) => {
  req.user = { id: 'user-1', email: 'test@example.com', role: 'USER' };
  next();
});

app.use('/api/billing', billingRoutes);

describe('Billing Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/billing/calculate', () => {
    it('should return billing calculation for current period', async () => {
      const mockBilling = {
        userId: 'user-1',
        period: '2024-01',
        baseAmount: 2900,
        overageCharges: {
          aiRequests: 200,
          deployments: 0,
          securityScans: 0,
          storage: 0,
          bandwidth: 0,
        },
        totalOverage: 200,
        totalAmount: 3100,
        currency: 'usd',
      };

      vi.mocked(billingService.calculateBilling).mockResolvedValue(mockBilling);

      const response = await request(app)
        .get('/api/billing/calculate')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          billing: mockBilling,
        },
      });

      expect(billingService.calculateBilling).toHaveBeenCalledWith('user-1', undefined);
    });

    it('should accept period parameter', async () => {
      const mockBilling = {
        userId: 'user-1',
        period: '2023-12',
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
      };

      vi.mocked(billingService.calculateBilling).mockResolvedValue(mockBilling);

      await request(app)
        .get('/api/billing/calculate?period=2023-12')
        .expect(200);

      expect(billingService.calculateBilling).toHaveBeenCalledWith('user-1', '2023-12');
    });

    it('should handle service errors', async () => {
      vi.mocked(billingService.calculateBilling).mockRejectedValue(new Error('No subscription'));

      const response = await request(app)
        .get('/api/billing/calculate')
        .expect(500);

      expect(response.body.error.type).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error.code).toBe('BILLING_CALCULATION_FAILED');
    });
  });

  describe('GET /api/billing/history', () => {
    it('should return billing history', async () => {
      const mockHistory = [
        {
          userId: 'user-1',
          period: '2024-01',
          baseAmount: 2900,
          overageCharges: {
            aiRequests: 200,
            deployments: 0,
            securityScans: 0,
            storage: 0,
            bandwidth: 0,
          },
          totalOverage: 200,
          totalAmount: 3100,
          currency: 'usd',
        },
        {
          userId: 'user-1',
          period: '2023-12',
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
        },
      ];

      vi.mocked(billingService.getBillingHistory).mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/billing/history?months=6')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          history: mockHistory,
          months: 6,
        },
      });

      expect(billingService.getBillingHistory).toHaveBeenCalledWith('user-1', 6);
    });

    it('should validate months parameter', async () => {
      const response = await request(app)
        .get('/api/billing/history?months=25')
        .expect(400);

      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.code).toBe('INVALID_MONTHS_PARAMETER');
    });

    it('should use default months when not specified', async () => {
      vi.mocked(billingService.getBillingHistory).mockResolvedValue([]);

      await request(app)
        .get('/api/billing/history')
        .expect(200);

      expect(billingService.getBillingHistory).toHaveBeenCalledWith('user-1', 6);
    });
  });

  describe('GET /api/billing/estimate', () => {
    it('should return estimated next bill', async () => {
      const mockEstimate = {
        userId: 'user-1',
        period: '2024-01',
        baseAmount: 2900,
        overageCharges: {
          aiRequests: 400,
          deployments: 100,
          securityScans: 0,
          storage: 0,
          bandwidth: 0,
        },
        totalOverage: 500,
        totalAmount: 3400,
        currency: 'usd',
        isEstimate: true,
      };

      vi.mocked(billingService.estimateNextBill).mockResolvedValue(mockEstimate);

      const response = await request(app)
        .get('/api/billing/estimate')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          estimate: mockEstimate,
        },
      });

      expect(billingService.estimateNextBill).toHaveBeenCalledWith('user-1');
    });

    it('should handle estimation errors', async () => {
      vi.mocked(billingService.estimateNextBill).mockRejectedValue(new Error('No subscription'));

      const response = await request(app)
        .get('/api/billing/estimate')
        .expect(500);

      expect(response.body.error.type).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error.code).toBe('BILLING_ESTIMATION_FAILED');
    });
  });

  describe('POST /api/billing/process-all', () => {
    beforeEach(() => {
      // Mock admin user
      vi.mocked(requireAuth).mockImplementation((req, res, next) => {
        req.user = { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' };
        next();
      });
    });

    it('should process billing for all users (admin only)', async () => {
      const mockResult = {
        processed: 10,
        failed: 1,
        totalRevenue: 50000,
        errors: [
          { userId: 'user-error', error: 'No subscription found' },
        ],
      };

      vi.mocked(billingService.processBillingForAllUsers).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/billing/process-all')
        .send({ period: '2024-01' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResult,
      });

      expect(billingService.processBillingForAllUsers).toHaveBeenCalledWith('2024-01');
    });

    it('should deny access for non-admin users', async () => {
      // Mock regular user
      vi.mocked(requireAuth).mockImplementation((req, res, next) => {
        req.user = { id: 'user-1', email: 'user@example.com', role: 'USER' };
        next();
      });

      const response = await request(app)
        .post('/api/billing/process-all')
        .send({ period: '2024-01' })
        .expect(403);

      expect(response.body.error.type).toBe('AUTHORIZATION_ERROR');
      expect(response.body.error.code).toBe('ADMIN_ACCESS_REQUIRED');
    });

    it('should handle processing errors', async () => {
      vi.mocked(billingService.processBillingForAllUsers).mockRejectedValue(new Error('Processing failed'));

      const response = await request(app)
        .post('/api/billing/process-all')
        .send({ period: '2024-01' })
        .expect(500);

      expect(response.body.error.type).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error.code).toBe('BULK_BILLING_FAILED');
    });
  });

  describe('GET /api/billing/admin/revenue', () => {
    beforeEach(() => {
      // Mock admin user
      vi.mocked(requireAuth).mockImplementation((req, res, next) => {
        req.user = { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' };
        next();
      });
    });

    it('should return revenue analytics for admin users', async () => {
      const mockRevenue = {
        totalRevenue: 100000,
        subscriptionRevenue: 80000,
        overageRevenue: 20000,
        revenueByPlan: [
          { planId: 'plan-starter', planName: 'Starter', revenue: 30000, subscribers: 10 },
          { planId: 'plan-pro', planName: 'Professional', revenue: 70000, subscribers: 7 },
        ],
        monthlyTrends: [
          { period: '2024-01', revenue: 50000, subscribers: 17 },
          { period: '2023-12', revenue: 45000, subscribers: 15 },
        ],
      };

      vi.mocked(billingService.getRevenueAnalytics).mockResolvedValue(mockRevenue);

      const response = await request(app)
        .get('/api/billing/admin/revenue?months=12')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          revenue: mockRevenue,
          period: 'last_months',
          months: 12,
        },
      });

      expect(billingService.getRevenueAnalytics).toHaveBeenCalledWith(undefined, 12);
    });

    it('should accept period parameter', async () => {
      const mockRevenue = {
        totalRevenue: 50000,
        subscriptionRevenue: 40000,
        overageRevenue: 10000,
        revenueByPlan: [],
        monthlyTrends: [
          { period: '2024-01', revenue: 50000, subscribers: 17 },
        ],
      };

      vi.mocked(billingService.getRevenueAnalytics).mockResolvedValue(mockRevenue);

      const response = await request(app)
        .get('/api/billing/admin/revenue?period=2024-01')
        .expect(200);

      expect(response.body.data.period).toBe('2024-01');
      expect(response.body.data.months).toBeUndefined();

      expect(billingService.getRevenueAnalytics).toHaveBeenCalledWith('2024-01', 12);
    });

    it('should deny access for non-admin users', async () => {
      // Mock regular user
      vi.mocked(requireAuth).mockImplementation((req, res, next) => {
        req.user = { id: 'user-1', email: 'user@example.com', role: 'USER' };
        next();
      });

      const response = await request(app)
        .get('/api/billing/admin/revenue')
        .expect(403);

      expect(response.body.error.type).toBe('AUTHORIZATION_ERROR');
      expect(response.body.error.code).toBe('ADMIN_ACCESS_REQUIRED');
    });

    it('should handle analytics errors', async () => {
      vi.mocked(billingService.getRevenueAnalytics).mockRejectedValue(new Error('Analytics failed'));

      const response = await request(app)
        .get('/api/billing/admin/revenue')
        .expect(500);

      expect(response.body.error.type).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error.code).toBe('REVENUE_ANALYTICS_FAILED');
    });
  });
});