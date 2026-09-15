import { vi } from 'vitest';

// Mock Prisma and other services
vi.mock('@prisma/client');
vi.mock('../../lib/services/subscription.service.js');


import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { usageService } from '../../lib/services/usage.service.js';
import { subscriptionService } from '../../lib/services/subscription.service.js';
import { mockDeep, mockReset } from 'vitest-mock-extended';

const mockPrisma = mockDeep();
beforeEach(() => {
  mockReset(mockPrisma);
  vi.mocked(PrismaClient).mockImplementation(() => mockPrisma );
});


describe('UsageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserUsage', () => {
    it('should return usage data for existing metrics', async () => {
      const mockUsage = {
        userId: 'user-1',
        period: '2024-01',
        aiRequestsCount: 25,
        deploymentCount: 5,
        securityScansCount: 3,
        storageUsed: BigInt(1024 * 1024 * 100), // 100MB
        bandwidthUsed: BigInt(1024 * 1024 * 500), // 500MB
      };

      mockPrisma.usageMetrics.findUnique.mockResolvedValue(mockUsage);

      const result = await usageService.getUserUsage('user-1', '2024-01');

      expect(result).toEqual(mockUsage);
      expect(mockPrisma.usageMetrics.findUnique).toHaveBeenCalledWith({
        where: {
          userId_period: {
            userId: 'user-1',
            period: '2024-01',
          },
        },
      });
    });

    it('should return zero usage for non-existing metrics', async () => {
      mockPrisma.usageMetrics.findUnique.mockResolvedValue(null);

      const result = await usageService.getUserUsage('user-1', '2024-01');

      expect(result).toEqual({
        userId: 'user-1',
        period: '2024-01',
        aiRequestsCount: 0,
        deploymentCount: 0,
        securityScansCount: 0,
        storageUsed: BigInt(0),
        bandwidthUsed: BigInt(0),
      });
    });

    it('should use current month when no period specified', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      mockPrisma.usageMetrics.findUnique.mockResolvedValue(null);

      await usageService.getUserUsage('user-1');

      expect(mockPrisma.usageMetrics.findUnique).toHaveBeenCalledWith({
        where: {
          userId_period: {
            userId: 'user-1',
            period: currentMonth,
          },
        },
      });
    });
  });

  describe('getUserUsageReport', () => {
    it('should generate usage report with percentages and warnings', async () => {
      const mockUsage = {
        userId: 'user-1',
        period: '2024-01',
        aiRequestsCount: 85, // 85% of 100
        deploymentCount: 8, // 80% of 10
        securityScansCount: 2, // 40% of 5
        storageUsed: BigInt(9 * 1024 * 1024 * 1024), // 9GB of 10GB (90%)
        bandwidthUsed: BigInt(1024 * 1024 * 1024), // 1GB
      };

      const mockLimits = {
        aiRequestsPerMonth: 100,
        deploymentsPerMonth: 10,
        securityScansPerMonth: 5,
        storageGB: 10,
        bandwidthGB: 50,
      };

      mockPrisma.usageMetrics.findUnique.mockResolvedValue(mockUsage);
      vi.mocked(subscriptionService.getSubscriptionLimits).mockResolvedValue(mockLimits);

      const result = await usageService.getUserUsageReport('user-1', '2024-01');

      expect(result.percentages.aiRequests).toBe(85);
      expect(result.percentages.deployments).toBe(80);
      expect(result.percentages.securityScans).toBe(40);
      expect(result.percentages.storage).toBe(90);
      expect(result.warnings).toContain('AI requests usage is high (80%+). Monitor your usage closely.');
      expect(result.warnings).toContain('Storage usage is high (80%+). Monitor your storage usage.');
      expect(result.isOverLimit).toBe(false);
    });

    it('should handle unlimited limits (-1)', async () => {
      const mockUsage = {
        userId: 'user-1',
        period: '2024-01',
        aiRequestsCount: 1000,
        deploymentCount: 100,
        securityScansCount: 50,
        storageUsed: BigInt(1024 * 1024 * 1024), // 1GB
        bandwidthUsed: BigInt(1024 * 1024 * 1024), // 1GB
      };

      const mockLimits = {
        aiRequestsPerMonth: -1, // Unlimited
        deploymentsPerMonth: -1, // Unlimited
        securityScansPerMonth: -1, // Unlimited
        storageGB: 1000,
        bandwidthGB: 1000,
      };

      mockPrisma.usageMetrics.findUnique.mockResolvedValue(mockUsage);
      vi.mocked(subscriptionService.getSubscriptionLimits).mockResolvedValue(mockLimits);

      const result = await usageService.getUserUsageReport('user-1', '2024-01');

      expect(result.percentages.aiRequests).toBe(0);
      expect(result.percentages.deployments).toBe(0);
      expect(result.percentages.securityScans).toBe(0);
      expect(result.isOverLimit).toBe(false);
    });

    it('should detect over-limit usage', async () => {
      const mockUsage = {
        userId: 'user-1',
        period: '2024-01',
        aiRequestsCount: 105, // Over limit of 100
        deploymentCount: 5,
        securityScansCount: 2,
        storageUsed: BigInt(1024 * 1024 * 1024), // 1GB
        bandwidthUsed: BigInt(1024 * 1024 * 1024), // 1GB
      };

      const mockLimits = {
        aiRequestsPerMonth: 100,
        deploymentsPerMonth: 10,
        securityScansPerMonth: 5,
        storageGB: 10,
        bandwidthGB: 50,
      };

      mockPrisma.usageMetrics.findUnique.mockResolvedValue(mockUsage);
      vi.mocked(subscriptionService.getSubscriptionLimits).mockResolvedValue(mockLimits);

      const result = await usageService.getUserUsageReport('user-1', '2024-01');

      expect(result.isOverLimit).toBe(true);
    });
  });

  describe('incrementUsage', () => {
    it('should increment AI request usage', async () => {
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

      mockPrisma.usageMetrics.upsert.mockResolvedValue(mockResult);

      const result = await usageService.incrementUsage({
        userId: 'user-1',
        type: 'ai_request',
        amount: 1,
        period: '2024-01',
      });

      expect(result).toEqual(mockResult);
      expect(mockPrisma.usageMetrics.upsert).toHaveBeenCalledWith({
        where: {
          userId_period: {
            userId: 'user-1',
            period: '2024-01',
          },
        },
        update: {
          aiRequestsCount: { increment: 1 },
        },
        create: {
          userId: 'user-1',
          period: '2024-01',
          aiRequestsCount: 1,
          deploymentCount: 0,
          securityScansCount: 0,
          storageUsed: BigInt(0),
          bandwidthUsed: BigInt(0),
        },
      });
    });

    it('should increment storage usage', async () => {
      const storageBytes = BigInt(1024 * 1024); // 1MB
      const mockResult = {
        id: 'usage-1',
        userId: 'user-1',
        period: '2024-01',
        aiRequestsCount: 25,
        deploymentCount: 5,
        securityScansCount: 3,
        storageUsed: storageBytes,
        bandwidthUsed: BigInt(0),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.usageMetrics.upsert.mockResolvedValue(mockResult);

      const result = await usageService.incrementUsage({
        userId: 'user-1',
        type: 'storage',
        storageBytes,
        period: '2024-01',
      });

      expect(result).toEqual(mockResult);
      expect(mockPrisma.usageMetrics.upsert).toHaveBeenCalledWith({
        where: {
          userId_period: {
            userId: 'user-1',
            period: '2024-01',
          },
        },
        update: {
          storageUsed: { increment: storageBytes },
        },
        create: {
          userId: 'user-1',
          period: '2024-01',
          aiRequestsCount: 0,
          deploymentCount: 0,
          securityScansCount: 0,
          storageUsed: storageBytes,
          bandwidthUsed: BigInt(0),
        },
      });
    });
  });

  describe('canPerformAction', () => {
    it('should allow action when under limit', async () => {
      const mockUsage = {
        userId: 'user-1',
        period: '2024-01',
        aiRequestsCount: 50,
        deploymentCount: 5,
        securityScansCount: 3,
        storageUsed: BigInt(0),
        bandwidthUsed: BigInt(0),
      };

      const mockLimits = {
        aiRequestsPerMonth: 100,
        deploymentsPerMonth: 10,
        securityScansPerMonth: 5,
        storageGB: 10,
        bandwidthGB: 50,
      };

      mockPrisma.usageMetrics.findUnique.mockResolvedValue(mockUsage);
      vi.mocked(subscriptionService.getSubscriptionLimits).mockResolvedValue(mockLimits);

      const result = await usageService.canPerformAction('user-1', 'ai_request');

      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(50);
      expect(result.limit).toBe(100);
    });

    it('should deny action when over limit', async () => {
      const mockUsage = {
        userId: 'user-1',
        period: '2024-01',
        aiRequestsCount: 100,
        deploymentCount: 5,
        securityScansCount: 3,
        storageUsed: BigInt(0),
        bandwidthUsed: BigInt(0),
      };

      const mockLimits = {
        aiRequestsPerMonth: 100,
        deploymentsPerMonth: 10,
        securityScansPerMonth: 5,
        storageGB: 10,
        bandwidthGB: 50,
      };

      mockPrisma.usageMetrics.findUnique.mockResolvedValue(mockUsage);
      vi.mocked(subscriptionService.getSubscriptionLimits).mockResolvedValue(mockLimits);

      const result = await usageService.canPerformAction('user-1', 'ai_request');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('ai request limit exceeded');
      expect(result.currentUsage).toBe(100);
      expect(result.limit).toBe(100);
    });

    it('should allow unlimited actions', async () => {
      const mockUsage = {
        userId: 'user-1',
        period: '2024-01',
        aiRequestsCount: 1000,
        deploymentCount: 5,
        securityScansCount: 3,
        storageUsed: BigInt(0),
        bandwidthUsed: BigInt(0),
      };

      const mockLimits = {
        aiRequestsPerMonth: -1, // Unlimited
        deploymentsPerMonth: 10,
        securityScansPerMonth: 5,
        storageGB: 10,
        bandwidthGB: 50,
      };

      mockPrisma.usageMetrics.findUnique.mockResolvedValue(mockUsage);
      vi.mocked(subscriptionService.getSubscriptionLimits).mockResolvedValue(mockLimits);

      const result = await usageService.canPerformAction('user-1', 'ai_request');

      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(1000);
      expect(result.limit).toBe(-1);
    });
  });

  describe('getUserUsageHistory', () => {
    it('should return usage history for multiple months', async () => {
      const mockUsageMetrics = [
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

      mockPrisma.usageMetrics.findMany.mockResolvedValue(mockUsageMetrics);

      const result = await usageService.getUserUsageHistory('user-1', 3);

      expect(result).toHaveLength(3);
      expect(result[0].period).toMatch(/^\d{4}-\d{2}$/); // Current month
      expect(mockPrisma.usageMetrics.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          period: { in: expect.any(Array) },
        },
        orderBy: { period: 'desc' },
      });
    });

    it('should fill missing periods with zero usage', async () => {
      // Return empty array (no usage data)
      mockPrisma.usageMetrics.findMany.mockResolvedValue([]);

      const result = await usageService.getUserUsageHistory('user-1', 2);

      expect(result).toHaveLength(2);
      expect(result[0].aiRequestsCount).toBe(0);
      expect(result[0].deploymentCount).toBe(0);
      expect(result[1].aiRequestsCount).toBe(0);
      expect(result[1].deploymentCount).toBe(0);
    });
  });

  describe('getAggregatedUsage', () => {
    it('should return aggregated usage statistics', async () => {
      const mockAggregation = {
        _sum: {
          aiRequestsCount: 500,
          deploymentCount: 100,
          securityScansCount: 50,
          storageUsed: BigInt(1024 * 1024 * 1024 * 10), // 10GB
          bandwidthUsed: BigInt(1024 * 1024 * 1024 * 50), // 50GB
        },
        _count: {
          userId: 10,
        },
      };

      mockPrisma.usageMetrics.aggregate.mockResolvedValue(mockAggregation);

      const result = await usageService.getAggregatedUsage('2024-01');

      expect(result.totalUsers).toBe(10);
      expect(result.totalAiRequests).toBe(500);
      expect(result.totalDeployments).toBe(100);
      expect(result.totalSecurityScans).toBe(50);
      expect(result.averageUsagePerUser.aiRequests).toBe(50);
      expect(result.averageUsagePerUser.deployments).toBe(10);
      expect(result.averageUsagePerUser.securityScans).toBe(5);
    });

    it('should handle zero users', async () => {
      const mockAggregation = {
        _sum: {
          aiRequestsCount: null,
          deploymentCount: null,
          securityScansCount: null,
          storageUsed: null,
          bandwidthUsed: null,
        },
        _count: {
          userId: 0,
        },
      };

      mockPrisma.usageMetrics.aggregate.mockResolvedValue(mockAggregation);

      const result = await usageService.getAggregatedUsage('2024-01');

      expect(result.totalUsers).toBe(0);
      expect(result.totalAiRequests).toBe(0);
      expect(result.averageUsagePerUser.aiRequests).toBe(0);
    });
  });

  describe('resetUsageForNewPeriod', () => {
    it('should create new period entry with zero usage', async () => {
      const mockResult = {
        id: 'usage-new',
        userId: 'user-1',
        period: '2024-02',
        aiRequestsCount: 0,
        deploymentCount: 0,
        securityScansCount: 0,
        storageUsed: BigInt(0),
        bandwidthUsed: BigInt(0),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.usageMetrics.upsert.mockResolvedValue(mockResult);

      await usageService.resetUsageForNewPeriod('user-1', '2024-02');

      expect(mockPrisma.usageMetrics.upsert).toHaveBeenCalledWith({
        where: {
          userId_period: {
            userId: 'user-1',
            period: '2024-02',
          },
        },
        update: {},
        create: {
          userId: 'user-1',
          period: '2024-02',
          aiRequestsCount: 0,
          deploymentCount: 0,
          securityScansCount: 0,
          storageUsed: BigInt(0),
          bandwidthUsed: BigInt(0),
        },
      });
    });
  });
});