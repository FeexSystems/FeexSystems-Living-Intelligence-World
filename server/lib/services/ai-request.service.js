 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

import { prisma } from '../database';

/**
 * AI Request Service - Handles database operations for AI requests
 */
export class AIRequestService {
  constructor( db = prisma) {;this.db = db;}

  /**
   * Create a new AI request
   */
  async createRequest(data





) {
    const request = await this.db.aIRequest.create({
      data: {
        userId: data.userId,
        serviceId: data.serviceId,
        inputData: data.input,
        metadata: {
          parameters: data.parameters || {},
          priority: data.priority || 'normal',
          createdAt: new Date().toISOString()
        },
        status: 'PENDING'
      }
    });

    return this.mapPrismaToAIRequest(request);
  }

  /**
   * Get AI request by ID
   */
  async getRequest(requestId) {
    const request = await this.db.aIRequest.findUnique({
      where: { id: requestId }
    });

    return request ? this.mapPrismaToAIRequest(request) : null;
  }

  /**
   * Get AI requests for a user
   */
  async getUserRequests(
    userId,
    options




 = {}
  ) {
    const where = {
      userId,
      ...(options.status && { status: options.status.toUpperCase()  }),
      ...(options.serviceId && { serviceId: options.serviceId })
    };

    const [requests, total] = await Promise.all([
      this.db.aIRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0
      }),
      this.db.aIRequest.count({ where })
    ]);

    return {
      requests: requests.map(this.mapPrismaToAIRequest),
      total
    };
  }

  /**
   * Update request status
   */
  async updateRequestStatus(
    requestId,
    status,
    metadata
  ) {
    const updateData = {
      status: status.toUpperCase(),
      updatedAt: new Date()
    };

    if (status === 'processing') {
      updateData.startedAt = new Date();
    } else if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    if (metadata) {
      // Merge with existing metadata
      const existing = await this.db.aIRequest.findUnique({
        where: { id: requestId },
        select: { metadata: true }
      });

      updateData.metadata = {
        ...(_optionalChain([existing, 'optionalAccess', _ => _.metadata])  || {}),
        ...metadata
      };
    }

    await this.db.aIRequest.update({
      where: { id: requestId },
      data: updateData
    });
  }

  /**
   * Complete an AI request with response data
   */
  async completeRequest(
    requestId,
    response
  ) {
    await this.db.aIRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        outputData: response.result,
        processingTime: response.metadata.processingTime,
        tokensUsed: response.metadata.tokensUsed,
        completedAt: new Date(),
        metadata: {
          ...response.metadata,
          responseStatus: response.status
        }
      }
    });
  }

  /**
   * Get request statistics for a user
   */
  async getUserRequestStats(
    userId,
    period = 'day'
  )






 {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const requests = await this.db.aIRequest.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate
        }
      },
      select: {
        status: true,
        tokensUsed: true
      }
    });

    const stats = {
      total: requests.length,
      completed: 0,
      failed: 0,
      pending: 0,
      processing: 0,
      tokensUsed: 0
    };

    requests.forEach(request => {
      switch (request.status) {
        case 'COMPLETED':
          stats.completed++;
          break;
        case 'FAILED':
          stats.failed++;
          break;
        case 'PENDING':
          stats.pending++;
          break;
        case 'PROCESSING':
          stats.processing++;
          break;
      }

      if (request.tokensUsed) {
        stats.tokensUsed += request.tokensUsed;
      }
    });

    return stats;
  }

  /**
   * Check if user has exceeded rate limits
   */
  async checkRateLimit(
    userId,
    serviceId,
    limits
  ) {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [hourlyCount, dailyCount] = await Promise.all([
      this.db.aIRequest.count({
        where: {
          userId,
          serviceId,
          createdAt: { gte: hourAgo }
        }
      }),
      this.db.aIRequest.count({
        where: {
          userId,
          serviceId,
          createdAt: { gte: dayAgo }
        }
      })
    ]);

    if (hourlyCount >= limits.maxRequestsPerHour) {
      return {
        allowed: false,
        reason: `Hourly limit of ${limits.maxRequestsPerHour} requests exceeded`
      };
    }

    if (dailyCount >= limits.maxRequestsPerDay) {
      return {
        allowed: false,
        reason: `Daily limit of ${limits.maxRequestsPerDay} requests exceeded`
      };
    }

    return { allowed: true };
  }

  /**
   * Delete old requests (cleanup)
   */
  async cleanupOldRequests(olderThanDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.db.aIRequest.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        },
        status: {
          in: ['COMPLETED', 'FAILED']
        }
      }
    });

    return result.count;
  }

  /**
   * Map Prisma AI request to our AI request type
   */
   mapPrismaToAIRequest(prismaRequest) {
    return {
      id: prismaRequest.id,
      userId: prismaRequest.userId,
      serviceId: prismaRequest.serviceId,
      input: prismaRequest.inputData,
      parameters: _optionalChain([prismaRequest, 'access', _2 => _2.metadata, 'optionalAccess', _3 => _3.parameters]) || {},
      priority: _optionalChain([prismaRequest, 'access', _4 => _4.metadata, 'optionalAccess', _5 => _5.priority]) || 'normal',
      status: prismaRequest.status.toLowerCase() ,
      createdAt: prismaRequest.createdAt,
      startedAt: prismaRequest.startedAt || undefined,
      completedAt: prismaRequest.completedAt || undefined
    };
  }
}

// Singleton instance
export const aiRequestService = new AIRequestService();