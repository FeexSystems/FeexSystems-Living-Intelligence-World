import { describe, it, expect } from 'vitest';
import { WorkflowService, WorkflowError } from '../workflow.service';

const service = new WorkflowService();

function baseInput(overrides: Partial<Parameters<WorkflowService['startRun']>[0]> = {}) {
  return {
    tenantId: 'tenant-a',
    type: 'test.workflow',
    idempotencyKey: 'idem-1',
    steps: ['intake', 'classify'],
    ...overrides,
  };
}

describe('WorkflowService.startRun', () => {
  it('creates a RUNNING run with ordered steps', async () => {
    const { run, created } = await service.startRun(baseInput());

    expect(created).toBe(true);
    expect(run.status).toBe('RUNNING');
    expect(run.correlationId).toBeTruthy();

    const full = await service.getRun('tenant-a', run.id);
    expect(full.steps.map((s) => s.name)).toEqual(['intake', 'classify']);
    expect(full.steps.every((s) => s.status === 'PENDING')).toBe(true);
  });

  it('is idempotent on (tenant, type, idempotencyKey)', async () => {
    const first = await service.startRun(baseInput());
    const second = await service.startRun(baseInput());

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.run.id).toBe(first.run.id);
  });

  it('scopes idempotency per tenant', async () => {
    const a = await service.startRun(baseInput({ tenantId: 'tenant-a' }));
    const b = await service.startRun(baseInput({ tenantId: 'tenant-b' }));

    expect(a.run.id).not.toBe(b.run.id);
  });

  it('rejects missing required input', async () => {
    await expect(
      service.startRun({ tenantId: '', type: 'x', idempotencyKey: 'k' })
    ).rejects.toMatchObject({ code: 'WORKFLOW_INPUT_INVALID', statusCode: 400 });
  });
});

describe('WorkflowService tenant isolation', () => {
  it('returns 404 when another tenant fetches the run', async () => {
    const { run } = await service.startRun(baseInput());

    await expect(service.getRun('tenant-b', run.id)).rejects.toMatchObject({
      code: 'WORKFLOW_NOT_FOUND',
      statusCode: 404,
    });
  });
});

describe('WorkflowService approval lifecycle', () => {
  it('RUNNING -> AWAITING_APPROVAL -> COMPLETED (approved)', async () => {
    const { run } = await service.startRun(baseInput());

    const awaiting = await service.requestApproval('tenant-a', run.id);
    expect(awaiting.status).toBe('AWAITING_APPROVAL');

    const decided = await service.decideApproval('tenant-a', run.id, 'APPROVED', 'actor-1', 'ok');
    expect(decided.status).toBe('COMPLETED');
    expect(decided.approvalState).toBe('APPROVED');
    expect(decided.approvedBy).toBe('actor-1');
  });

  it('REJECTED -> CANCELLED', async () => {
    const { run } = await service.startRun(baseInput());
    await service.requestApproval('tenant-a', run.id);

    const decided = await service.decideApproval('tenant-a', run.id, 'REJECTED', 'actor-1');
    expect(decided.status).toBe('CANCELLED');
  });

  it('rejects reviewing a run that is not awaiting approval', async () => {
    const { run } = await service.startRun(baseInput());

    await expect(
      service.decideApproval('tenant-a', run.id, 'APPROVED', 'actor-1')
    ).rejects.toMatchObject({ code: 'WORKFLOW_INVALID_TRANSITION', statusCode: 409 });
  });

  it('refuses to complete a run that is awaiting approval', async () => {
    const { run } = await service.startRun(baseInput());
    await service.requestApproval('tenant-a', run.id);

    await expect(service.completeRun('tenant-a', run.id)).rejects.toMatchObject({
      code: 'WORKFLOW_AWAITING_APPROVAL',
    });
  });

  it('records failures explicitly', async () => {
    const { run } = await service.startRun(baseInput());
    const failed = await service.failRun('tenant-a', run.id, 'boom');

    expect(failed.status).toBe('FAILED');
    expect(failed.error).toBe('boom');
  });
});

describe('WorkflowService.withRetry', () => {
  it('retries then succeeds', async () => {
    let attempts = 0;
    const outcome = await service.withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('transient');
        return 'ok';
      },
      { attempts: 3, baseDelayMs: 1 }
    );

    expect(outcome.result).toBe('ok');
    expect(outcome.attempts).toBe(3);
  });

  it('throws a bounded error when retries are exhausted', async () => {
    await expect(
      service.withRetry(
        async () => {
          throw new Error('always');
        },
        { attempts: 2, baseDelayMs: 1 }
      )
    ).rejects.toBeInstanceOf(WorkflowError);
  });
});
