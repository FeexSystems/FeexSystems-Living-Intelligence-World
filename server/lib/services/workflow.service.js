 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }















import { generateUUID } from '../utils/crypto';
import { prisma } from '../database';

export class WorkflowError extends Error {
  constructor(
    message,
     code,
     statusCode
  ) {
    super(message);this.code = code;this.statusCode = statusCode;;
    this.name = 'WorkflowError';
  }
}

 










function isUniqueViolation(error) {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error ).code === 'P2002'
  );
}

function toJson(value) {
  return value === undefined ? undefined : (value );
}

export class WorkflowService {
  /**
   * Start a run idempotently. A retry with the same idempotency key returns the
   * existing run with `created: false` instead of creating a duplicate.
   */
  async startRun(input) {
    if (!input.tenantId || !input.type || !input.idempotencyKey) {
      throw new WorkflowError(
        'tenantId, type and idempotencyKey are required',
        'WORKFLOW_INPUT_INVALID',
        400
      );
    }

    const correlationId = _nullishCoalesce(input.correlationId, () => ( generateUUID()));

    const existing = await prisma.workflowRun.findUnique({
      where: {
        tenantId_type_idempotencyKey: {
          tenantId: input.tenantId,
          type: input.type,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (existing) {
      return { run: existing, created: false };
    }

    try {
      const run = await prisma.workflowRun.create({
        data: {
          tenantId: input.tenantId,
          type: input.type,
          idempotencyKey: input.idempotencyKey,
          correlationId,
          status: 'RUNNING',
          input: toJson(input.input),
          steps: _optionalChain([input, 'access', _ => _.steps, 'optionalAccess', _2 => _2.length])
            ? {
                create: input.steps.map((name, order) => ({ name, order, status: 'PENDING' })),
              }
            : undefined,
        },
      });
      return { run, created: true };
    } catch (error) {
      if (isUniqueViolation(error)) {
        const raced = await prisma.workflowRun.findUnique({
          where: {
            tenantId_type_idempotencyKey: {
              tenantId: input.tenantId,
              type: input.type,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (raced) return { run: raced, created: false };
      }
      throw error;
    }
  }

  /** Tenant-scoped fetch with steps. Cross-tenant access is a 404. */
  async getRun(
    tenantId,
    runId
  ) {
    const run = await prisma.workflowRun.findFirst({
      where: { id: runId, tenantId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    if (!run) {
      throw new WorkflowError('Workflow run not found', 'WORKFLOW_NOT_FOUND', 404);
    }
    return run;
  }

  async startStep(runId, name) {
    const step = await prisma.workflowStep.findFirst({ where: { runId, name } });
    if (!step) {
      throw new WorkflowError('Workflow step not found', 'WORKFLOW_STEP_NOT_FOUND', 404);
    }
    return prisma.workflowStep.update({
      where: { id: step.id },
      data: { status: 'RUNNING', startedAt: new Date(), attempts: { increment: 1 } },
    });
  }

  async completeStep(
    runId,
    name,
    output
  ) {
    const step = await prisma.workflowStep.findFirst({ where: { runId, name } });
    if (!step) {
      throw new WorkflowError('Workflow step not found', 'WORKFLOW_STEP_NOT_FOUND', 404);
    }
    return prisma.workflowStep.update({
      where: { id: step.id },
      data: { status: 'COMPLETED', finishedAt: new Date(), output: toJson(output) },
    });
  }

  async failStep(runId, name, error) {
    const step = await prisma.workflowStep.findFirst({ where: { runId, name } });
    if (!step) {
      throw new WorkflowError('Workflow step not found', 'WORKFLOW_STEP_NOT_FOUND', 404);
    }
    return prisma.workflowStep.update({
      where: { id: step.id },
      data: { status: 'FAILED', finishedAt: new Date(), error },
    });
  }

  /** Move a run into the human-approval state. */
  async requestApproval(tenantId, runId) {
    const run = await this.getRun(tenantId, runId);
    if (run.status !== 'RUNNING') {
      throw new WorkflowError(
        `Run is ${run.status}; only RUNNING runs can request approval`,
        'WORKFLOW_INVALID_TRANSITION',
        409
      );
    }
    return prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: 'AWAITING_APPROVAL', approvalState: 'PENDING' },
    });
  }

  /**
   * Record a human decision. Performs NO external action.
   * APPROVED → COMPLETED, REJECTED → CANCELLED.
   */
  async decideApproval(
    tenantId,
    runId,
    decision,
    actorId,
    note
  ) {
    const run = await this.getRun(tenantId, runId);
    if (run.status !== 'AWAITING_APPROVAL') {
      throw new WorkflowError(
        `Run is ${run.status}; only AWAITING_APPROVAL runs can be reviewed`,
        'WORKFLOW_INVALID_TRANSITION',
        409
      );
    }

    return prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: decision === 'APPROVED' ? 'COMPLETED' : 'CANCELLED',
        approvalState: decision,
        approvedBy: actorId,
        approvedAt: new Date(),
        output: toJson({ decision, note: _nullishCoalesce(note, () => ( null)), externalActionPerformed: false }),
      },
    });
  }

  async completeRun(
    tenantId,
    runId,
    output
  ) {
    const run = await this.getRun(tenantId, runId);
    if (run.status === 'AWAITING_APPROVAL') {
      throw new WorkflowError(
        'Run is awaiting approval; record a decision instead',
        'WORKFLOW_AWAITING_APPROVAL',
        409
      );
    }
    return prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: 'COMPLETED', output: toJson(output) },
    });
  }

  async failRun(tenantId, runId, error) {
    const run = await this.getRun(tenantId, runId);
    return prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', error },
    });
  }

  /**
   * Bounded retry for retryable failures. Delays grow linearly and are capped;
   * the attempt count is returned so callers can persist it on the step.
   */
  async withRetry(
    operation,
    options = {}
  ) {
    const attempts = Math.max(1, _nullishCoalesce(options.attempts, () => ( 3)));
    const baseDelayMs = Math.max(0, _nullishCoalesce(options.baseDelayMs, () => ( 100)));
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return { result: await operation(), attempts: attempt };
      } catch (error) {
        lastError = error;
        if (attempt < attempts && baseDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
        }
      }
    }

    throw new WorkflowError(
      `Operation failed after ${attempts} attempts: ${
        lastError instanceof Error ? lastError.message : 'unknown error'
      }`,
      'WORKFLOW_RETRIES_EXHAUSTED',
      502
    );
  }
}

export const workflowService = new WorkflowService();
