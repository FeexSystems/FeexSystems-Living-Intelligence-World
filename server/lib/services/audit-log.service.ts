/**
 * Audit Log Service (Priority 2 — Important)
 *
 * Provides centralized audit logging for all status changes, approval decisions,
 * and cross-product events across all five verticals. Every audit entry is
 * append-only and immutable.
 */

import { prisma } from '../database';
import { Prisma } from '@prisma/client';

/**
 * Audit entry payload.
 */
export interface AuditEntry {
  tenantId: string;
  actorId?: string;
  resourceType: string; // e.g. 'OperationsEnquiry', 'MaintenanceRequest', 'WorldModelInterpretation'
  resourceId: string;
  action: string; // e.g. 'created', 'approved', 'rejected', 'status_changed'
  fromValue?: string | number | boolean | null;
  toValue?: string | number | boolean | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Write an audit log entry. Never throws — failures are logged but do not
 * break the calling workflow.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const metadata = {
      timestamp: new Date().toISOString(),
      ...(entry.fromValue !== undefined && { fromValue: entry.fromValue }),
      ...(entry.toValue !== undefined && { toValue: entry.toValue }),
      ...(entry.metadata && { ...entry.metadata }),
      ...(entry.ipAddress && { ipAddress: entry.ipAddress }),
      ...(entry.userAgent && { userAgent: entry.userAgent }),
    } as Prisma.InputJsonValue;

    await prisma.activityLog.create({
      data: {
        userId: entry.actorId ?? entry.tenantId,
        action: entry.action,
        resource: entry.resourceType,
        resourceId: entry.resourceId,
        metadata,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    // Audit logging must never break the workflow.
    console.error('[audit] failed to write audit entry', {
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      action: entry.action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Convenience wrapper for status change audits.
 */
export async function auditStatusChange(
  tenantId: string,
  actorId: string | undefined,
  resourceType: string,
  resourceId: string,
  action: string,
  fromValue: string | number | boolean | null,
  toValue: string | number | boolean | null,
  metadata?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await writeAuditLog({
    tenantId,
    actorId,
    resourceType,
    resourceId,
    action,
    fromValue,
    toValue,
    metadata,
    ipAddress,
    userAgent,
  });
}

/**
 * Convenience wrapper for approval decision audits.
 */
export async function auditApprovalDecision(
  tenantId: string,
  actorId: string | undefined,
  resourceType: string,
  resourceId: string,
  decision: 'APPROVED' | 'REJECTED',
  note?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await writeAuditLog({
    tenantId,
    actorId,
    resourceType,
    resourceId,
    action: decision.toLowerCase(),
    fromValue: 'PENDING_APPROVAL',
    toValue: decision,
    metadata: { note, externalActionPerformed: false },
    ipAddress,
    userAgent,
  });
}