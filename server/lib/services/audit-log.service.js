 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }/**
 * Audit Log Service (Priority 2 — Important)
 *
 * Provides centralized audit logging for all status changes, approval decisions,
 * and cross-product events across all five verticals. Every audit entry is
 * append-only and immutable.
 */

import { prisma } from '../database';


/**
 * Audit entry payload.
 */













/**
 * Write an audit log entry. Never throws — failures are logged but do not
 * break the calling workflow.
 */
export async function writeAuditLog(entry) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: _nullishCoalesce(entry.actorId, () => ( entry.tenantId)),
        eventType: 'feature_used' ,
        eventData: {
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          action: entry.action,
          fromValue: entry.fromValue,
          toValue: entry.toValue,
          metadata: _nullishCoalesce(entry.metadata, () => ( {})),
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          timestamp: new Date().toISOString(),
        },
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
  tenantId,
  actorId,
  resourceType,
  resourceId,
  action,
  fromValue,
  toValue,
  metadata,
  ipAddress,
  userAgent
) {
  await writeAuditLog({
    tenantId,
    actorId,
    resourceType,
    resourceId,
    action,
    fromValue: _nullishCoalesce(fromValue, () => ( null)),
    toValue: _nullishCoalesce(toValue, () => ( null)),
    metadata,
    ipAddress,
    userAgent,
  });
}

/**
 * Convenience wrapper for approval decision audits.
 */
export async function auditApprovalDecision(
  tenantId,
  actorId,
  resourceType,
  resourceId,
  decision,
  note,
  ipAddress,
  userAgent
) {
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