import { describe, it, expect } from 'vitest';
import { prismaMock } from '../../../test/prisma-mock';
import { PlatformAuditService } from '../platform-audit.service';

const service = new PlatformAuditService();

describe('PlatformAuditService.recordAudit', () => {
  it('writes a tenant-scoped audit event with outcome and correlation id', async () => {
    await service.recordAudit({
      tenantId: 'team-1',
      actorId: 'user-1',
      action: 'workflow.approved',
      resource: 'workflow_run',
      resourceId: 'run-1',
      outcome: 'success',
      correlationId: 'corr-1',
    });

    const events = await prismaMock.teamActivityLog.findMany({ where: { teamId: 'team-1' } });
    expect(events).toHaveLength(1);
    expect(events[0].metadata).toMatchObject({ outcome: 'success', correlationId: 'corr-1' });
  });
});

describe('PlatformAuditService.recordUsage', () => {
  it('records measured usage with units', async () => {
    await service.recordUsage({
      tenantId: 'team-1',
      actorId: 'user-1',
      operation: 'enquiry.classify',
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      measured: true,
      units: 128,
    });

    const events = await prismaMock.platformUsageEvent.findMany({ where: { tenantId: 'team-1' } });
    expect(events).toHaveLength(1);
    expect(events[0].measured).toBe(true);
    expect(events[0].units).toBe(128);
  });

  it('never fabricates units when usage is unmeasured', async () => {
    await service.recordUsage({
      tenantId: 'team-1',
      operation: 'enquiry.classify',
      measured: false,
      units: 999,
    });

    const events = await prismaMock.platformUsageEvent.findMany({ where: { tenantId: 'team-1' } });
    expect(events[0].measured).toBe(false);
    expect(events[0].units).toBe(0);
  });
});
