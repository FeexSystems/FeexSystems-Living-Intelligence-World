/** Billing Repository — handles billing and subscription operations */

import { prisma } from '../database';
import { Subscription, SubscriptionStatus } from '@prisma/client';

export interface BillingRepository {
  getUserSubscription(userId: string): Promise<Subscription | null>;

  listSubscriptions(): Promise<Subscription[]>;

  updateSubscriptionStatus(userId: string, status: 'active' | 'canceled' | 'past_due'): Promise<Subscription | null>;

  updateUsage(userId: string, period: string, usage: {
    aiRequestsCount?: number;
    deploymentCount?: number;
    securityScansCount?: number;
    storageUsed?: number;
    bandwidthUsed?: number;
  }): Promise<void>;

  getUserUsage(userId: string, period: string): Promise<{
    aiRequestsCount: number;
    deploymentCount: number;
    securityScansCount: number;
    storageUsed: number;
    bandwidthUsed: number;
  }>;
}

export class PrismaBillingRepository implements BillingRepository {
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    return prisma.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE }
    });
  }

  async listSubscriptions(): Promise<Subscription[]> {
    return prisma.subscription.findMany();
  }

  async updateSubscriptionStatus(userId: string, status: 'active' | 'canceled' | 'past_due'): Promise<Subscription | null> {
    // A user may have several subscription rows over time; update the current
    // one rather than assuming `userId` is unique (it isn't).
    const current = await this.getUserSubscription(userId);
    if (!current) return null;

    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      canceled: SubscriptionStatus.CANCELED,
      past_due: SubscriptionStatus.PAST_DUE,
    };

    return prisma.subscription.update({
      where: { id: current.id },
      data: { status: statusMap[status] ?? SubscriptionStatus.ACTIVE, updatedAt: new Date() }
    });
  }

  async updateUsage(userId: string, period: string, usage: {
    aiRequestsCount?: number;
    deploymentCount?: number;
    securityScansCount?: number;
    storageUsed?: number;
    bandwidthUsed?: number;
  }): Promise<void> {
    await prisma.usageMetrics.upsert({
      where: { userId_period: { userId, period } },
      update: {
        aiRequestsCount: usage.aiRequestsCount,
        deploymentCount: usage.deploymentCount,
        securityScansCount: usage.securityScansCount,
        // storage/bandwidth are BigInt columns; the domain type is a number.
        storageUsed: usage.storageUsed === undefined ? undefined : BigInt(usage.storageUsed),
        bandwidthUsed: usage.bandwidthUsed === undefined ? undefined : BigInt(usage.bandwidthUsed),
        updatedAt: new Date(),
      },
      create: {
        userId,
        period,
        aiRequestsCount: usage.aiRequestsCount ?? 0,
        deploymentCount: usage.deploymentCount ?? 0,
        securityScansCount: usage.securityScansCount ?? 0,
        storageUsed: BigInt(usage.storageUsed ?? 0),
        bandwidthUsed: BigInt(usage.bandwidthUsed ?? 0),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });
  }

  async getUserUsage(userId: string, period: string): Promise<{
    aiRequestsCount: number;
    deploymentCount: number;
    securityScansCount: number;
    storageUsed: number;
    bandwidthUsed: number;
  }> {
    const record = await prisma.usageMetrics.findUnique({
      where: { userId_period: { userId, period } }
    });
    if (!record) {
      return {
        aiRequestsCount: 0,
        deploymentCount: 0,
        securityScansCount: 0,
        storageUsed: 0,
        bandwidthUsed: 0,
      };
    }
    return {
      aiRequestsCount: record.aiRequestsCount,
      deploymentCount: record.deploymentCount,
      securityScansCount: record.securityScansCount,
      storageUsed: Number(record.storageUsed),
      bandwidthUsed: Number(record.bandwidthUsed),
    };
  }
}