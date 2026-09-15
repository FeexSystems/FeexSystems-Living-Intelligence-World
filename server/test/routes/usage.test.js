import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import usageRoutes from '../../routes/usage.js';
import { usageService } from '../../lib/services/usage.service.js';
import { requireAuth } from '../../lib/middleware/auth.middleware.js';

// Mock services and middleware
vi.mock('../../lib/services/usage.service.js');
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

app.use('/api/usage', usageRoutes);

describe('Usage Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/usage/current', () => {
    it('should return current usage metrics', async () => {
      const mockUsage = {
        userId: 'user-1',
        period: '2024-01',
        aiRequestsCount: 25,
        deploymentCount: 5,
        securityScansCount: 3,
        storageUsed: BigInt(1024 * 1024 * 100),
        bandwidthUsed: BigInt(1024 * 1024 * 500),
      };

      vi.mocked(usageService.getUserUsage).mockResolvedValue(mockUsage);

      const response = await request(app)
        .get('/api/usage/current')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          usage: {
            ...mockUsage,
            storageUsed: mockUsage.storageUsed.toString(),
            bandwidthUsed: mockUsage.bandwidthUsed.toString(),
          },
        },
      });

      expect(usageService.getUserUsage).toHaveBeenCalledWith('user-1', undefined);
    });

    it('should accept period parameter', async () => {
      const mockUsage = {
        userId: 'user-1',
        period: '2023-12',
        aiRequestsCount: 30,
        deploymentCount: 8,
        securityScansCount: 2,
        storageUsed: BigInt(0),
        bandwidthUsed: BigInt(0),
      };

      vi.mocked(usageService.getUserUsage).mockResolvedValue(mockUsage);

      await request(app)
        .get('/api/usage/current?period=2023-12')
        .expect(200);

      expect(usageService.getUserUsage).toHaveBeenCalledWith('user-1', '2023-12');
    });

    it('should handle service errors', async () => {
      vi.mocked(usageService.getUserUsage).mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/usage/current')
        .expect(500);

      expect(response.body.error.type).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error.code).toBe('USAGE_RETRIEVAL_FAILED');
    });
  });

  describe('GET /api/usage/report', () => {
    it('should return detailed usage report', async () => {
      const mockReport = {
        period: '2024-01',
        usage: {
          userId: 'user-1',
          period: '2024-01',
          aiRequestsCount: 85,
          deploymentCount: 8,
          securityScansCount: 2,
          storageUsed: BigInt(9 * 1024 * 1024 * 1024),
          bandwidthUsed: BigInt(1024 * 1024 * 1024),
        },
        limits: {
          aiRequestsPerMonth: 100,
          deploymentsPerMonth: 10,
          securityScansPerMonth: 5,
          storageGB: 10,
          bandwidthGB: 50,
        },
        percentages: {
          aiRequests: 85,
          deployments: 80,
          securityScans: 40,
          storage: 90,
          bandwidth: 2,
        },
        warnings: ['AI requests usage is high (80%+). Monitor your usage closely.'],
        isOverLimit: false,
      };

      vi.mocked(usageService.getUserUsageReport).mockResolvedValue(mockReport);

      const response = await request(app)
        .get('/api/usage/report')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          report: {
            ...mockReport,
            usage: {
              ...mockReport.usage,
              storageUsed: mockReport.usage.storageUsed.toString(),
              bandwidthUsed: mockReport.usage.bandwidthUsed.toString(),
            },
          },
        },
      });
    });
  });

  describe('GET /api/usage/history', () => {
    it('should return usage history', async () => {
      const mockHistory = [
        {
          userId: 'user-1',
          period: '2024-01',
          aiRequestsCount: 25,
          deploymentCount: 5,
          securityScansCount: 3,
          storageUsed: BigInt(1024 * 1024 * 100),
          bandwidthUsed: BigInt(1024 * 1024 * 500),
        },
        {
          userId: 'user-1',
          period: '2023-12',
          aiRequestsCount: 30,
          deploymentCount: 8,
          securityScansCount: 2,
          storageUsed: BigInt(1024 * 1024 * 80),
          bandwidthUsed: BigInt(1024 * 1024 * 400),
        },
      ];

      vi.mocked(usageService.getUserUsageHistory).mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/usage/history?months=6')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          history: mockHistory.map(h => ({
            ...h,
            storageUsed: h.storageUsed.toString(),
            bandwidthUsed: h.bandwidthUsed.toString(),
          })),
          months: 6,
        },
      });

      expect(usageService.getUserUsageHistory).toHaveBeenCalledWith('user-1', 6);
    });

    it('should validate months parameter', async () => {
      const response = await request(app)
        .get('/api/usage/history?months=25')
        .expect(400);

      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.code).toBe('INVALID_MONTHS_PARAMETER');
    });

    it('should use default months when not specified', async () => {
      vi.mocked(usageService.getUserUsageHistory).mockResolvedValue([]);

      await request(app)
        .get('/api/usage/history')
        .expect(200);

      expect(usageService.getUserUsageHistory).toHaveBeenCalledWith('user-1', 6);
    });
  });

  describe('GET /api/usage/check/:action', () => {
    it('should check if user can perform action', async () => {
      const mockResult = {
        allowed: true,
        currentUsage: 50,
        limit: 100,
      };

      vi.mocked(usageService.canPerformAction).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/usage/check/ai_request')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResult,
      });

      expect(usageService.canPerformAction).toHaveBeenCalledWith('user-1', 'ai_request', undefined);
    });

    it('should validate action parameter', async () => {
      const response = await request(app)
        .get('/api/usage/check/invalid_action')
        .expect(400);

      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.code).toBe('INVALID_ACTION_TYPE');
    });

    it('should accept period parameter', async () => {
      vi.mocked(usageService.canPerformAction).mockResolvedValue({
        allowed: true,
        currentUsage: 10,
        limit: 50,
      });

      await request(app)
        .get('/api/usage/check/deployment?period=2023-12')
        .expect(200);

      expect(usageService.canPerformAction).toHaveBeenCalledWith('user-1', 'deployment', '2023-12');
    });
  });

  describe('POST /api/usage/increment', () => {
    beforeEach(() => {
      // Mock admin user
      vi.mocked(requireAuth).mockImplementation((req, res, next) => {
        req.user = { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' };
        next();
      });
    });

    it('should increment usage for admin users', async () => {
      const mockResult = {
        id: 'usage-1',
        userId: 'user-1',
        period: '2024-01',
        aiRequestsCount: 26,
        deploymentCount: 5,
        securityScansCount: 3,
        storageUsed: BigInt(0),
        bandwidthUsed: BigInt(0),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(usageService.incrementUsage).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/usage/increment')
        .send({
          userId: 'user-1',
          type: 'ai_request',
          amount: 1,
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          usage: {
            ...mockResult,
            storageUsed: mockResult.storageUsed.toString(),
            bandwidthUsed: mockResult.bandwidthUsed.toString(),
          },
        },
      });

      expect(usageService.incrementUsage).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'ai_request',
        amount: 1,
        storageBytes: undefined,
        bandwidthBytes: undefined,
        period: undefined,
      });
    });

    it('should deny access for non-admin users', async () => {
      // Mock regular user
      vi.mocked(requireAuth).mockImplementation((req, res, next) => {
        req.user = { id: 'user-1', email: 'user@example.com', role: 'USER' };
        next();
      });

      const response = await request(app)
        .post('/api/usage/increment')
        .send({
          userId: 'user-1',
          type: 'ai_request',
          amount: 1,
        })
        .expect(403);

      expect(response.body.error.type).toBe('AUTHORIZATION_ERROR');
      expect(response.body.error.code).toBe('ADMIN_ACCESS_REQUIRED');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/usage/increment')
        .send({
          type: 'ai_request',
        })
        .expect(400);

      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
    });

    it('should validate usage type', async () => {
      const response = await request(app)
        .post('/api/usage/increment')
        .send({
          userId: 'user-1',
          type: 'invalid_type',
        })
        .expect(400);

      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.code).toBe('INVALID_USAGE_TYPE');
    });
  });

  describe('GET /api/usage/admin/aggregated', () => {
    beforeEach(() => {
      // Mock admin user
      vi.mocked(requireAuth).mockImplementation((req, res, next) => {
        req.user = { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' };
        next();
      });
    });

    it('should return aggregated usage for admin users', async () => {
      const mockAggregated = {
        totalUsers: 10,
        totalAiRequests: 500,
        totalDeployments: 100,
        totalSecurityScans: 50,
        totalStorageUsed: BigInt(1024 * 1024 * 1024 * 10),
        totalBandwidthUsed: BigInt(1024 * 1024 * 1024 * 50),
        averageUsagePerUser: {
          aiRequests: 50,
          deployments: 10,
          securityScans: 5,
        },
      };

      vi.mocked(usageService.getAggregatedUsage).mockResolvedValue(mockAggregated);

      const response = await request(app)
        .get('/api/usage/admin/aggregated')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          aggregated: {
            ...mockAggregated,
            totalStorageUsed: mockAggregated.totalStorageUsed.toString(),
            totalBandwidthUsed: mockAggregated.totalBandwidthUsed.toString(),
          },
          period: expect.any(String),
        },
      });
    });

    it('should deny access for non-admin users', async () => {
      // Mock regular user
      vi.mocked(requireAuth).mockImplementation((req, res, next) => {
        req.user = { id: 'user-1', email: 'user@example.com', role: 'USER' };
        next();
      });

      const response = await request(app)
        .get('/api/usage/admin/aggregated')
        .expect(403);

      expect(response.body.error.type).toBe('AUTHORIZATION_ERROR');
      expect(response.body.error.code).toBe('ADMIN_ACCESS_REQUIRED');
    });

    it('should accept period parameter', async () => {
      vi.mocked(usageService.getAggregatedUsage).mockResolvedValue({
        totalUsers: 5,
        totalAiRequests: 250,
        totalDeployments: 50,
        totalSecurityScans: 25,
        totalStorageUsed: BigInt(0),
        totalBandwidthUsed: BigInt(0),
        averageUsagePerUser: {
          aiRequests: 50,
          deployments: 10,
          securityScans: 5,
        },
      });

      await request(app)
        .get('/api/usage/admin/aggregated?period=2023-12')
        .expect(200);

      expect(usageService.getAggregatedUsage).toHaveBeenCalledWith('2023-12');
    });
  });
});