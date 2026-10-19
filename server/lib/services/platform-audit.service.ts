/**
 * Platform audit + usage recording (Mission 002).
 *
 * Audit reuses the tenant-scoped `TeamActivityLog` table (tenant = teamId) and
 * adds structured `outcome` / `correlationId` metadata rather than introducing a
 * duplicate audit table.
 *
 * Usage writes append-only `PlatformUsageEvent` rows that distinguish MEASURED
 * provider usage from ESTIMATED/unavailable usage. Token counts are never
 * fabricated: when a provider does not report usage, `measured` is false.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../database';

export type AuditOutcome = 'success' | 'failure' | 'denied';

export interface AuditRecordInput {
  tenantId: string;
  actorId: string;
  action: string;
  resource: string;
  resourceId: string;
  outcome: AuditOutcome;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface UsageRecordInput {
  tenantId: string;
  actorId?: string;
  operation: string;
  provider?: string;
  model?: string;
  /** Unit count (e.g. tokens). Only meaningful when `measured` is true. */
  units?: number;
  /** True only when the provider actually reported usage. */
  measured?: boolean;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

function toJson(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (value as Prisma.InputJsonValue);
}

export class PlatformAuditService {
  /**
   * Record a tenant-scoped audit event. Never throws into the caller's path —
   * a failed audit write is logged and swallowed so it cannot break a workflow.
   */
  async recordAudit(input: AuditRecordInput): Promise<void> {
    try {
      await prisma.teamActivityLog.create({
        data: {
          teamId: input.tenantId,
          userId: input.actorId,
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId,
          metadata: toJson({
            ...(input.metadata ?? {}),
            outcome: input.outcome,
            correlationId: input.correlationId ?? null,
          }),
        },
      });
    } catch (error) {
      console.warn('[platform-audit] failed to record audit event', input.action, error);
    }
  }

  /**
   * Record an append-only usage event. `measured` defaults to false so an
   * unmeasured call is never presented as measured billing data.
   */
  async recordUsage(input: UsageRecordInput): Promise<void> {
    try {
      await prisma.platformUsageEvent.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorId ?? null,
          operation: input.operation,
          provider: input.provider ?? null,
          model: input.model ?? null,
          units: input.measured ? Math.max(0, Math.trunc(input.units ?? 0)) : 0,
          measured: Boolean(input.measured),
          correlationId: input.correlationId ?? null,
          metadata: toJson(input.metadata),
        },
      });
    } catch (error) {
      console.warn('[platform-usage] failed to record usage event', input.operation, error);
    }
  }
}

export const platformAuditService = new PlatformAuditService();
