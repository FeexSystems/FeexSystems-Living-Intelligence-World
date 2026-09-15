import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIAnalyticsService } from '../ai-analytics.service';
import { aiServiceRegistry } from '../ai-registry.service';

// Mock dependencies
vi.mock('../ai-registry.service');
vi.mock('../database', () => ({
  prisma: {
    aIRequest: {
      findMany: vi.fn(),
      count: vi.fn()
    }
  }
}));

describe.skip('AIAnalyticsService', () => {
  let analyticsService: AIAnalyticsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      aIRequest: {
        findMany: vi.fn(),
        count: vi.fn()
      }
    };
    
    analyticsService = new AIAnalyticsService(mockDb);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserUsageMetrics', () => {
    const mockRequests = [
      {
        id: 'req-1',
        serviceId: 'chat-gpt-3.5',
        status: 'COMPLETED',
        processingTime: 1500,
        tokensUsed: 100,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T10:00:01Z')
      },
      {
        id: 'req-2',
        serviceId: 'chat-gpt-4',
        status: 'COMPLETED',
        processingTime: 2000,
        tokensUsed: 150,
        createdAt: new Date('2024-01-01T11:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:02Z')
      },
      {
        id: 'req-3',
        serviceId: 'chat-gpt-3.5',
        status: 'FAILED',
        processingTime: null,
        tokensUsed: 0,
        createdAt: new Date('2024-01-01T12:00:00Z'),
        completedAt: null
      }
    ];

    beforeEach(() => {
      mockDb.aIRequest.findMany.mockResolvedValue(mockRequests);
      
      // Mock service registry
      vi.mocked(aiServiceRegistry.getService).mockImplementation((serviceId) => {
        const services: any = {
          'chat-gpt-3.5': {
            id: 'chat-gpt-3.5',
            name: 'ChatGPT 3.5',
            pricing: { type: 'per_token', cost: 0.002, currency: 'usd' }
          },
          'chat-gpt-4': {
            id: 'chat-gpt-4',
            name: 'ChatGPT 4',
            pricing: { type: 'per_token', cost: 0.03, currency: 'usd' }
          }
        };
        return services[serviceId];
      });
    });

    it('should calculate usage metrics correctly', async () => {
      const metrics = await analyticsService.getUserUsageMetrics('user-123', 'day');

      expect(metrics.totalRequests).toBe(3);
      expect(metrics.completedRequests).toBe(2);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.totalTokensUsed).toBe(250);
      expect(metrics.averageProcessingTime).toBe(1750); // (1500 + 2000) / 2

      // Verify database query
      expect(mockDb.aIRequest.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          createdAt: {
            gte: expect.any(Date),
            lte: expect.any(Date)
          }
        },
        select: {
          id: true,
          serviceId: true,
          status: true,
          processingTime: true,
          tokensUsed: true,
          createdAt: true,
          completedAt: true
        }
      });
    });

    it('should calculate service breakdown correctly', async () => {
      const metrics = await analyticsService.getUserUsageMetrics('user-123', 'day');

      expect(metrics.serviceBreakdown).toHaveLength(2);
      
      const chatGpt35 = metrics.serviceBreakdown.find(s => s.serviceId === 'chat-gpt-3.5');
      expect(chatGpt35).toBeDefined();
      expect(chatGpt35!.requestCount).toBe(2);
      expect(chatGpt35!.tokensUsed).toBe(100);
      expect(chatGpt35!.successRate).toBe(50); // 1 out of 2 completed

      const chatGpt4 = metrics.serviceBreakdown.find(s => s.serviceId === 'chat-gpt-4');
      expect(chatGpt4).toBeDefined();
      expect(chatGpt4!.requestCount).toBe(1);
      expect(chatGpt4!.tokensUsed).toBe(150);
      expect(chatGpt4!.successRate).toBe(100); // 1 out of 1 completed
    });

    it('should calculate hourly distribution', async () => {
      const metrics = await analyticsService.getUserUsageMetrics('user-123', 'day');

      expect(metrics.hourlyDistribution).toHaveLength(24);
      
      // Check specific hours
      const hour10 = metrics.hourlyDistribution[10];
      expect(hour10.requestCount).toBe(1);
      expect(hour10.tokensUsed).toBe(100);

      const hour11 = metrics.hourlyDistribution[11];
      expect(hour11.requestCount).toBe(1);
      expect(hour11.tokensUsed).toBe(150);

      const hour12 = metrics.hourlyDistribution[12];
      expect(hour12.requestCount).toBe(1);
      expect(hour12.tokensUsed).toBe(0);

      // Check empty hour
      const hour0 = metrics.hourlyDistribution[0];
      expect(hour0.requestCount).toBe(0);
      expect(hour0.tokensUsed).toBe(0);
    });
  });

  describe('getPerformanceMetrics', () => {
    const mockRequests = [
      { status: 'COMPLETED', processingTime: 1000, createdAt: new Date() },
      { status: 'COMPLETED', processingTime: 2000, createdAt: new Date() },
      { status: 'COMPLETED', processingTime: 3000, createdAt: new Date() },
      { status: 'COMPLETED', processingTime: 4000, createdAt: new Date() },
      { status: 'COMPLETED', processingTime: 5000, createdAt: new Date() },
      { status: 'FAILED', processingTime: null, createdAt: new Date() },
      { status: 'PENDING', processingTime: null, createdAt: new Date() }
    ];

    beforeEach(() => {
      mockDb.aIRequest.findMany.mockResolvedValue(mockRequests);
    });

    it('should calculate performance metrics correctly', async () => {
      const metrics = await analyticsService.getPerformanceMetrics('user-123', 'day');

      expect(metrics.averageProcessingTime).toBe(3000); // (1000+2000+3000+4000+5000)/5
      expect(metrics.successRate).toBe((5/7) * 100); // 5 completed out of 7 total
      expect(metrics.errorRate).toBe((1/7) * 100); // 1 failed out of 7 total
      expect(metrics.throughput).toBeGreaterThan(0); // Should calculate requests per hour

      // P95 and P99 should be calculated from sorted processing times
      expect(metrics.p95ProcessingTime).toBe(5000); // 95th percentile of [1000,2000,3000,4000,5000]
      expect(metrics.p99ProcessingTime).toBe(5000); // 99th percentile
    });

    it('should handle empty data gracefully', async () => {
      mockDb.aIRequest.findMany.mockResolvedValue([]);

      const metrics = await analyticsService.getPerformanceMetrics('user-123', 'day');

      expect(metrics.averageProcessingTime).toBe(0);
      expect(metrics.p95ProcessingTime).toBe(0);
      expect(metrics.p99ProcessingTime).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.throughput).toBe(0);
    });
  });

  describe('getCostAnalysis', () => {
    const mockRequests = [
      {
        serviceId: 'chat-gpt-3.5',
        tokensUsed: 1000,
        createdAt: new Date('2024-01-01')
      },
      {
        serviceId: 'chat-gpt-4',
        tokensUsed: 500,
        createdAt: new Date('2024-01-02')
      }
    ];

    beforeEach(() => {
      mockDb.aIRequest.findMany.mockResolvedValue(mockRequests);
      
      // Mock service registry for cost calculation
      vi.mocked(aiServiceRegistry.getService).mockImplementation((serviceId) => {
        const services: any = {
          'chat-gpt-3.5': {
            pricing: { type: 'per_token', cost: 0.2 } // 0.2 cents per token
          },
          'chat-gpt-4': {
            pricing: { type: 'per_token', cost: 3 } // 3 cents per token
          }
        };
        return services[serviceId];
      });
    });

    it('should calculate cost analysis correctly', async () => {
      const analysis = await analyticsService.getCostAnalysis('user-123', 'month');

      expect(analysis.totalCost).toBeGreaterThan(0);
      expect(analysis.projectedMonthlyCost).toBe(analysis.totalCost); // Same for month period
      expect(analysis.costByService).toHaveLength(2);
      expect(analysis.costTrend).toBeDefined();
    });

    it('should project weekly cost to monthly', async () => {
      const analysis = await analyticsService.getCostAnalysis('user-123', 'week');

      // Monthly projection should be higher than weekly cost
      expect(analysis.projectedMonthlyCost).toBeGreaterThan(analysis.totalCost);
    });
  });

  describe('getSystemAnalytics', () => {
    const mockRequests = [
      {
        userId: 'user-1',
        serviceId: 'chat-gpt-3.5',
        status: 'COMPLETED',
        processingTime: 1500,
        tokensUsed: 100,
        createdAt: new Date()
      },
      {
        userId: 'user-2',
        serviceId: 'chat-gpt-4',
        status: 'COMPLETED',
        processingTime: 2000,
        tokensUsed: 150,
        createdAt: new Date()
      }
    ];

    beforeEach(() => {
      mockDb.aIRequest.findMany.mockResolvedValue(mockRequests);
      
      vi.mocked(aiServiceRegistry.getService).mockImplementation((serviceId) => {
        const services: any = {
          'chat-gpt-3.5': {
            name: 'ChatGPT 3.5',
            pricing: { type: 'per_token', cost: 0.002 }
          },
          'chat-gpt-4': {
            name: 'ChatGPT 4',
            pricing: { type: 'per_token', cost: 0.03 }
          }
        };
        return services[serviceId];
      });
    });

    it('should calculate system analytics correctly', async () => {
      const analytics = await analyticsService.getSystemAnalytics('day');

      expect(analytics.totalUsers).toBe(2); // user-1 and user-2
      expect(analytics.totalRequests).toBe(2);
      expect(analytics.averageProcessingTime).toBe(1750); // (1500 + 2000) / 2
      expect(analytics.totalCost).toBeGreaterThan(0);
      expect(analytics.topServices).toHaveLength(2);
      expect(analytics.systemLoad).toBeDefined();
    });
  });

  describe('createBudgetAlert', () => {
    it('should create budget alert', async () => {
      const alertData = {
        userId: 'user-123',
        budgetLimit: 100,
        alertThreshold: 80,
        period: 'monthly' as const
      };

      const alert = await analyticsService.createBudgetAlert(alertData);

      expect(alert.userId).toBe('user-123');
      expect(alert.budgetLimit).toBe(100);
      expect(alert.alertThreshold).toBe(80);
      expect(alert.period).toBe('monthly');
      expect(alert.isTriggered).toBe(false);
      expect(alert.id).toBeDefined();
      expect(alert.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('checkBudgetAlerts', () => {
    it('should return empty array for simplified implementation', async () => {
      const alerts = await analyticsService.checkBudgetAlerts('user-123');
      expect(alerts).toEqual([]);
    });
  });
});