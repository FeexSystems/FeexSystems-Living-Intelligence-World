/** Billing Repository — handles billing and subscription operations */

import { prisma } from '../database';
import { Subscription, Prisma } from '@prisma/client';

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
      where: { user_id: userId, status: 'active' }
    });
  }

  async listSubscriptions(): Promise<Subscription[]> {
    return prisma.subscription.findMany();
  }

  async updateSubscriptionStatus(userId: string, status: 'active' | 'canceled' | 'past_due'): Promise<Subscription | null> {
    return prisma.subscription.update({
      where: { user_id: userId },
      data: { status, updated_at: new Date() }
    });
  }

  async updateUsage(userId: string, period: string, usage: {
    aiRequestsCount?: number;
    deploymentCount?: number;
    securityScansCount?: number;
    storageUsed?: number;
    bandwidthUsed?: number;
  }): Promise<void> {
    await prisma.user_usage.upsert({
      where: { user_id_period: { user_id: userId, period } },
      update: {
        ai_requests_count: usage.aiRequestsCount,
        deployment_count: usage.deploymentCount,
        security_scans_count: usage.securityScansCount,
        storage_used: usage.storageUsed,
        bandwidth_used: usage.bandwidthUsed,
        updated_at: new Date(),
      },
      create: {
        user_id: userId,
        period,
        ai_requests_count: usage.aiRequestsCount ?? 0,
        deployment_count: usage.deploymentCount ?? 0,
        security_scans_count: usage.securityScansCount ?? 0,
        storage_used: usage.storageUsed ?? 0,
        bandwidth_used: usage.bandwidthUsed ?? 0,
        created_at: new Date(),
        updated_at: new Date(),
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
    const record = await prisma.user_usage.findFirst({
      where: { user_id: userId, period }
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
      aiRequestsCount: record.ai_requests_count || 0,
      deploymentCount: record.deployment_count || 0,
      securityScansCount: record.security_scans_count || 0,
      storageUsed: record.storage_used || 0,
      bandwidthUsed: record.bandwidth_used ? Number(record.bandwidth_used) : 0,
    };
  }
}