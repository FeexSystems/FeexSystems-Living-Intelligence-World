import { PrismaClient } from '@prisma/client';
import { prisma } from '../database';
import { aiServiceRegistry } from './ai-registry.service';

interface UsageMetrics {
  period: string;
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  totalTokensUsed: number;
  totalCost: number;
  serviceBreakdown: ServiceUsage[];
  hourlyDistribution: HourlyUsage[];
}

interface ServiceUsage {
  serviceId: string;
  serviceName: string;
  requestCount: number;
  tokensUsed: number;
  cost: number;
  averageProcessingTime: number;
  successRate: number;
}

interface HourlyUsage {
  hour: number;
  requestCount: number;
  tokensUsed: number;
  cost: number;
}

interface CostAnalysis {
  totalCost: number;
  projectedMonthlyCost: number;
  costByService: { serviceId: string; cost: number }[];
  costTrend: { date: string; cost: number }[];
}

interface PerformanceMetrics {
  averageProcessingTime: number;
  p95ProcessingTime: number;
  p99ProcessingTime: number;
  successRate: number;
  errorRate: number;
  throughput: number; // requests per hour
}

interface BudgetAlert {
  id: string;
  userId: string;
  budgetLimit: number;
  currentSpend: number;
  alertThreshold: number; // percentage
  isTriggered: boolean;
  period: 'daily' | 'weekly' | 'monthly';
  createdAt: Date;
}

/**
 * AI Analytics Service - Handles AI usage monitoring and analytics
 */
export class AIAnalyticsService {
  constructor(private db: PrismaClient = prisma) {}

  /**
   * Get usage metrics for a user
   */
  async getUserUsageMetrics(
    userId: string,
    period: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<UsageMetrics> {
    const { startDate, endDate } = this.getPeriodDates(period);

    // Get all requests in period
    const requests = await this.db.aIRequest.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate
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

    const totalRequests = requests.length;
    const completedRequests = requests.filter(r => r.status === 'COMPLETED').length;
    const failedRequests = requests.filter(r => r.status === 'FAILED').length;

    // Calculate average processing time
    const completedWithTime = requests.filter(r => r.processingTime);
    const averageProcessingTime = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, r) => sum + (r.processingTime || 0), 0) / completedWithTime.length
      : 0;

    // Calculate total tokens used
    const totalTokensUsed = requests.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);

    // Calculate service breakdown
    const serviceBreakdown = await this.calculateServiceBreakdown(requests);

    // Calculate hourly distribution
    const hourlyDistribution = this.calculateHourlyDistribution(requests);

    // Calculate total cost
    const totalCost = await this.calculateTotalCost(requests);

    return {
      period,
      totalRequests,
      completedRequests,
      failedRequests,
      averageProcessingTime,
      totalTokensUsed,
      totalCost,
      serviceBreakdown,
      hourlyDistribution
    };
  }

  /**
   * Get cost analysis for a user
   */
  async getCostAnalysis(
    userId: string,
    period: 'week' | 'month' = 'month'
  ): Promise<CostAnalysis> {
    const { startDate, endDate } = this.getPeriodDates(period);

    const requests = await this.db.aIRequest.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'COMPLETED'
      },
      select: {
        serviceId: true,
        tokensUsed: true,
        createdAt: true
      }
    });

    const totalCost = await this.calculateTotalCost(requests);
    
    // Project monthly cost based on current usage
    const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const projectedMonthlyCost = period === 'month' ? totalCost : (totalCost / daysInPeriod) * 30;

    // Cost by service
    const costByService = await this.calculateCostByService(requests);

    // Cost trend (daily breakdown)
    const costTrend = await this.calculateCostTrend(userId, startDate, endDate);

    return {
      totalCost,
      projectedMonthlyCost,
      costByService,
      costTrend
    };
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(
    userId: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<PerformanceMetrics> {
    const { startDate, endDate } = this.getPeriodDates(period);

    const requests = await this.db.aIRequest.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        status: true,
        processingTime: true,
        createdAt: true
      }
    });

    const totalRequests = requests.length;
    const completedRequests = requests.filter(r => r.status === 'COMPLETED').length;
    const failedRequests = requests.filter(r => r.status === 'FAILED').length;

    // Processing time metrics
    const processingTimes = requests
      .filter(r => r.processingTime)
      .map(r => r.processingTime!)
      .sort((a, b) => a - b);

    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    const p95Index = Math.floor(processingTimes.length * 0.95);
    const p99Index = Math.floor(processingTimes.length * 0.99);
    
    const p95ProcessingTime = processingTimes[p95Index] || 0;
    const p99ProcessingTime = processingTimes[p99Index] || 0;

    // Success and error rates
    const successRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;
    const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;

    // Throughput (requests per hour)
    const periodHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const throughput = periodHours > 0 ? totalRequests / periodHours : 0;

    return {
      averageProcessingTime,
      p95ProcessingTime,
      p99ProcessingTime,
      successRate,
      errorRate,
      throughput
    };
  }

  /**
   * Create budget alert
   */
  async createBudgetAlert(data: {
    userId: string;
    budgetLimit: number;
    alertThreshold: number;
    period: 'daily' | 'weekly' | 'monthly';
  }): Promise<BudgetAlert> {
    // For now, we'll store this in a simple way
    // In a real implementation, you'd want a dedicated table
    const alert: BudgetAlert = {
      id: `alert_${Date.now()}`,
      userId: data.userId,
      budgetLimit: data.budgetLimit,
      currentSpend: 0,
      alertThreshold: data.alertThreshold,
      isTriggered: false,
      period: data.period,
      createdAt: new Date()
    };

    // Store in user metadata or separate table
    // This is a simplified implementation
    return alert;
  }

  /**
   * Check budget alerts for a user
   */
  async checkBudgetAlerts(userId: string): Promise<BudgetAlert[]> {
    // Get current spending for different periods
await this.getUserUsageMetrics(userId, 'day');
await this.getUserUsageMetrics(userId, 'week');
await this.getUserUsageMetrics(userId, 'month');

    // This would typically fetch from a budget_alerts table
    // For now, return empty array as this is a simplified implementation
    return [];
  }

  /**
   * Get system-wide analytics (admin only)
   */
  async getSystemAnalytics(period: 'day' | 'week' | 'month' = 'day'): Promise<{
    totalUsers: number;
    totalRequests: number;
    totalCost: number;
    averageProcessingTime: number;
    topServices: ServiceUsage[];
    systemLoad: { timestamp: Date; activeRequests: number }[];
  }> {
    const { startDate, endDate } = this.getPeriodDates(period);

    // Get all requests in period
    const requests = await this.db.aIRequest.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        userId: true,
        serviceId: true,
        status: true,
        processingTime: true,
        tokensUsed: true,
        createdAt: true
      }
    });

    const totalUsers = new Set(requests.map(r => r.userId)).size;
    const totalRequests = requests.length;
    const totalCost = await this.calculateTotalCost(requests);

    const completedRequests = requests.filter(r => r.status === 'COMPLETED');
    const averageProcessingTime = completedRequests.length > 0
      ? completedRequests.reduce((sum, r) => sum + (r.processingTime || 0), 0) / completedRequests.length
      : 0;

    const topServices = await this.calculateServiceBreakdown(requests);

    // System load would typically come from monitoring data
    const systemLoad: { timestamp: Date; activeRequests: number }[] = [];

    return {
      totalUsers,
      totalRequests,
      totalCost,
      averageProcessingTime,
      topServices,
      systemLoad
    };
  }

  /**
   * Calculate service breakdown
   */
  private async calculateServiceBreakdown(requests: any[]): Promise<ServiceUsage[]> {
    const serviceMap = new Map<string, {
      requests: any[];
      tokensUsed: number;
      processingTime: number[];
    }>();

    // Group requests by service
    requests.forEach(request => {
      const serviceId = request.serviceId;
      if (!serviceMap.has(serviceId)) {
        serviceMap.set(serviceId, {
          requests: [],
          tokensUsed: 0,
          processingTime: []
        });
      }

      const serviceData = serviceMap.get(serviceId)!;
      serviceData.requests.push(request);
      serviceData.tokensUsed += request.tokensUsed || 0;
      
      if (request.processingTime) {
        serviceData.processingTime.push(request.processingTime);
      }
    });

    // Calculate metrics for each service
    const serviceUsage: ServiceUsage[] = [];

    for (const [serviceId, data] of serviceMap.entries()) {
      const service = aiServiceRegistry.getService(serviceId);
      const serviceName = service?.name || serviceId;

      const requestCount = data.requests.length;
      const completedCount = data.requests.filter(r => r.status === 'COMPLETED').length;
      const successRate = requestCount > 0 ? (completedCount / requestCount) * 100 : 0;

      const averageProcessingTime = data.processingTime.length > 0
        ? data.processingTime.reduce((sum, time) => sum + time, 0) / data.processingTime.length
        : 0;

      // Calculate cost based on service pricing
      const cost = await this.calculateServiceCost(serviceId, data.requests);

      serviceUsage.push({
        serviceId,
        serviceName,
        requestCount,
        tokensUsed: data.tokensUsed,
        cost,
        averageProcessingTime,
        successRate
      });
    }

    return serviceUsage.sort((a, b) => b.requestCount - a.requestCount);
  }

  /**
   * Calculate hourly distribution
   */
  private calculateHourlyDistribution(requests: any[]): HourlyUsage[] {
    const hourlyMap = new Map<number, { count: number; tokens: number; cost: number }>();

    // Initialize all hours
    for (let hour = 0; hour < 24; hour++) {
      hourlyMap.set(hour, { count: 0, tokens: 0, cost: 0 });
    }

    // Group requests by hour
    requests.forEach(request => {
      const hour = new Date(request.createdAt).getHours();
      const hourData = hourlyMap.get(hour)!;
      
      hourData.count++;
      hourData.tokens += request.tokensUsed || 0;
      // Cost calculation would be done here
    });

    // Convert to array
    const hourlyDistribution: HourlyUsage[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const data = hourlyMap.get(hour)!;
      hourlyDistribution.push({
        hour,
        requestCount: data.count,
        tokensUsed: data.tokens,
        cost: data.cost
      });
    }

    return hourlyDistribution;
  }

  /**
   * Calculate total cost for requests
   */
  private async calculateTotalCost(requests: any[]): Promise<number> {
    let totalCost = 0;

    for (const request of requests) {
      if (request.status === 'COMPLETED') {
        const cost = await this.calculateServiceCost(request.serviceId, [request]);
        totalCost += cost;
      }
    }

    return totalCost;
  }

  /**
   * Calculate cost for a specific service
   */
  private async calculateServiceCost(serviceId: string, requests: any[]): Promise<number> {
    const service = aiServiceRegistry.getService(serviceId);
    if (!service) return 0;

    let cost = 0;

    requests.forEach(request => {
      if (request.status === 'COMPLETED') {
        switch (service.pricing.type) {
          case 'per_request':
            cost += service.pricing.cost / 100; // Convert cents to dollars
            break;
          case 'per_token':
            const tokens = request.tokensUsed || 0;
            cost += (tokens / 1000) * (service.pricing.cost / 100);
            break;
          case 'per_minute':
            const minutes = (request.processingTime || 0) / (1000 * 60);
            cost += minutes * (service.pricing.cost / 100);
            break;
        }
      }
    });

    return cost;
  }

  /**
   * Calculate cost by service
   */
  private async calculateCostByService(requests: any[]): Promise<{ serviceId: string; cost: number }[]> {
    const serviceMap = new Map<string, any[]>();

    // Group requests by service
    requests.forEach(request => {
      if (!serviceMap.has(request.serviceId)) {
        serviceMap.set(request.serviceId, []);
      }
      serviceMap.get(request.serviceId)!.push(request);
    });

    // Calculate cost for each service
    const costByService: { serviceId: string; cost: number }[] = [];

    for (const [serviceId, serviceRequests] of serviceMap.entries()) {
      const cost = await this.calculateServiceCost(serviceId, serviceRequests);
      costByService.push({ serviceId, cost });
    }

    return costByService.sort((a, b) => b.cost - a.cost);
  }

  /**
   * Calculate cost trend over time
   */
  private async calculateCostTrend(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ date: string; cost: number }[]> {
    const costTrend: { date: string; cost: number }[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayRequests = await this.db.aIRequest.findMany({
        where: {
          userId,
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          },
          status: 'COMPLETED'
        },
        select: {
          serviceId: true,
          tokensUsed: true,
          processingTime: true
        }
      });

      const dayCost = await this.calculateTotalCost(dayRequests);

      costTrend.push({
        date: currentDate.toISOString().split('T')[0],
        cost: dayCost
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return costTrend;
  }

  /**
   * Get period dates based on period type
   */
  private getPeriodDates(period: 'hour' | 'day' | 'week' | 'month'): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'hour':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    return { startDate, endDate };
  }
}

// Singleton instance
export const aiAnalyticsService = new AIAnalyticsService();