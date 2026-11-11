/**
 * AI Repository — AI request history and usage accounting.
 *
 * This previously targeted `ai_service`, `ai_model` and `aI_usage_log`, none of
 * which exist in `prisma/schema.prisma`. The canonical AI tables are:
 *
 *   AIRequest     (ai_requests)     — one row per model invocation
 *   UsageMetrics  (usage_metrics)   — per-user, per-period rollups
 *
 * The interface is expressed in domain terms (service name, model, tokens,
 * cost) and maps onto those tables, so callers never depend on table shape.
 */

import { prisma } from '../database';
import type { AIRequest, UsageMetrics } from '@prisma/client';

export interface AiUsageRecord {
  service: string;
  model: string;
  tokens: number;
  cost: number;
  requestId?: string;
}

export interface AiRepository {
  /** Most recent requests for a user, newest first. */
  listRecentRequests(userId: string, limit?: number): Promise<AIRequest[]>;

  /** Record one model invocation against the user's request history. */
  recordUsage(userId: string, serviceId: string, usage: AiUsageRecord): Promise<AIRequest>;

  /** Rollup row for a user in a given period (e.g. "2026-11"). */
  getUsageMetrics(userId: string, period: string): Promise<UsageMetrics | null>;

  /** Increment the AI request counter for a user's period, creating it if absent. */
  incrementRequestCount(userId: string, period: string): Promise<UsageMetrics>;
}

export class PrismaAiRepository implements AiRepository {
  async listRecentRequests(userId: string, limit = 50): Promise<AIRequest[]> {
    return prisma.aIRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async recordUsage(userId: string, serviceId: string, usage: AiUsageRecord): Promise<AIRequest> {
    return prisma.aIRequest.create({
      data: {
        userId,
        serviceId,
        inputData: { model: usage.model, cost: usage.cost },
        tokensUsed: usage.tokens,
        status: 'COMPLETED',
        completedAt: new Date(),
        ...(usage.requestId ? { metadata: { requestId: usage.requestId } } : {}),
      },
    });
  }

  async getUsageMetrics(userId: string, period: string): Promise<UsageMetrics | null> {
    return prisma.usageMetrics.findUnique({
      where: { userId_period: { userId, period } },
    });
  }

  async incrementRequestCount(userId: string, period: string): Promise<UsageMetrics> {
    return prisma.usageMetrics.upsert({
      where: { userId_period: { userId, period } },
      create: { userId, period, aiRequestsCount: 1 },
      update: { aiRequestsCount: { increment: 1 } },
    });
  }
}
