 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
import { prisma } from '../database';
import { aiServiceRegistry } from './ai-registry.service';

























































/**
 * AI Analytics Service - Handles AI usage monitoring and analytics
 */
export class AIAnalyticsService {
  constructor( db = prisma) {;this.db = db;}

  /**
   * Get usage metrics for a user
   */
  async getUserUsageMetrics(
    userId,
    period = 'day'
  ) {
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
    userId,
    period = 'month'
  ) {
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
    userId,
    period = 'day'
  ) {
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
      .map(r => r.processingTime)
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
  async createBudgetAlert(data




) {
    // For now, we'll store this in a simple way
    // In a real implementation, you'd want a dedicated table
    const alert = {
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
  async checkBudgetAlerts(userId) {
    // Get current spending for different periods
    const dailyCost = await this.getUserUsageMetrics(userId, 'day');
    const weeklyCost = await this.getUserUsageMetrics(userId, 'week');
    const monthlyCost = await this.getUserUsageMetrics(userId, 'month');

    // This would typically fetch from a budget_alerts table
    // For now, return empty array as this is a simplified implementation
    return [];
  }

  /**
   * Get system-wide analytics (admin only)
   */
  async getSystemAnalytics(period = 'day')






 {
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
    const systemLoad = [];

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
   async calculateServiceBreakdown(requests) {
    const serviceMap = new Map



();

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

      const serviceData = serviceMap.get(serviceId);
      serviceData.requests.push(request);
      serviceData.tokensUsed += request.tokensUsed || 0;
      
      if (request.processingTime) {
        serviceData.processingTime.push(request.processingTime);
      }
    });

    // Calculate metrics for each service
    const serviceUsage = [];

    for (const [serviceId, data] of serviceMap.entries()) {
      const service = aiServiceRegistry.getService(serviceId);
      const serviceName = _optionalChain([service, 'optionalAccess', _ => _.name]) || serviceId;

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
   calculateHourlyDistribution(requests) {
    const hourlyMap = new Map();

    // Initialize all hours
    for (let hour = 0; hour < 24; hour++) {
      hourlyMap.set(hour, { count: 0, tokens: 0, cost: 0 });
    }

    // Group requests by hour
    requests.forEach(request => {
      const hour = new Date(request.createdAt).getHours();
      const hourData = hourlyMap.get(hour);
      
      hourData.count++;
      hourData.tokens += request.tokensUsed || 0;
      // Cost calculation would be done here
    });

    // Convert to array
    const hourlyDistribution = [];
    for (let hour = 0; hour < 24; hour++) {
      const data = hourlyMap.get(hour);
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
   async calculateTotalCost(requests) {
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
   async calculateServiceCost(serviceId, requests) {
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
   async calculateCostByService(requests) {
    const serviceMap = new Map();

    // Group requests by service
    requests.forEach(request => {
      if (!serviceMap.has(request.serviceId)) {
        serviceMap.set(request.serviceId, []);
      }
      serviceMap.get(request.serviceId).push(request);
    });

    // Calculate cost for each service
    const costByService = [];

    for (const [serviceId, serviceRequests] of serviceMap.entries()) {
      const cost = await this.calculateServiceCost(serviceId, serviceRequests);
      costByService.push({ serviceId, cost });
    }

    return costByService.sort((a, b) => b.cost - a.cost);
  }

  /**
   * Calculate cost trend over time
   */
   async calculateCostTrend(
    userId,
    startDate,
    endDate
  ) {
    const costTrend = [];
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
   getPeriodDates(period) {
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