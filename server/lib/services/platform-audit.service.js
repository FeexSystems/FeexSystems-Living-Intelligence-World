 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }












import { prisma } from '../database';

 


























function toJson(value) {
  return value === undefined ? undefined : (value );
}

export class PlatformAuditService {
  /**
   * Record a tenant-scoped audit event. Never throws into the caller's path —
   * a failed audit write is logged and swallowed so it cannot break a workflow.
   */
  async recordAudit(input) {
    try {
      await prisma.teamActivityLog.create({
        data: {
          teamId: input.tenantId,
          userId: input.actorId,
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId,
          metadata: toJson({
            ...(_nullishCoalesce(input.metadata, () => ( {}))),
            outcome: input.outcome,
            correlationId: _nullishCoalesce(input.correlationId, () => ( null)),
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
  async recordUsage(input) {
    try {
      await prisma.platformUsageEvent.create({
        data: {
          tenantId: input.tenantId,
          actorId: _nullishCoalesce(input.actorId, () => ( null)),
          operation: input.operation,
          provider: _nullishCoalesce(input.provider, () => ( null)),
          model: _nullishCoalesce(input.model, () => ( null)),
          units: input.measured ? Math.max(0, Math.trunc(_nullishCoalesce(input.units, () => ( 0)))) : 0,
          measured: Boolean(input.measured),
          correlationId: _nullishCoalesce(input.correlationId, () => ( null)),
          metadata: toJson(input.metadata),
        },
      });
    } catch (error) {
      console.warn('[platform-usage] failed to record usage event', input.operation, error);
    }
  }
}

export const platformAuditService = new PlatformAuditService();
