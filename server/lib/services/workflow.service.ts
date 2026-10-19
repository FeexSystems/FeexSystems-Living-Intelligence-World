/**
 * Shared workflow lifecycle (Mission 002).
 *
 * A minimal, tenant-scoped run/step contract reused by every product:
 *   - validated input supplied by the caller (Zod at the route boundary);
 *   - explicit run + step status;
 *   - idempotent submission via (tenantId, type, idempotencyKey);
 *   - correlation ids;
 *   - bounded retries for retryable failures;
 *   - a human-approval state for consequential actions (records a decision only).
 *
 * This reuses the existing Prisma/PostgreSQL store and does not introduce a new
 * job system. Consequential external actions remain out of scope by design.
 */

import { Prisma, WorkflowRun, WorkflowStep } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '../database';

export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export type ApprovalDecision = 'APPROVED' | 'REJECTED';

export interface StartWorkflowInput {
  tenantId: string;
  type: string;
  idempotencyKey: string;
  correlationId?: string;
  input?: Record<string, unknown>;
  steps?: string[];
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2002'
  );
}

function toJson(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (value as Prisma.InputJsonValue);
}

export class WorkflowService {
  /**
   * Start a run idempotently. A retry with the same idempotency key returns the
   * existing run with `created: false` instead of creating a duplicate.
   */
  async startRun(input: StartWorkflowInput): Promise<{ run: WorkflowRun; created: boolean }> {
    if (!input.tenantId || !input.type || !input.idempotencyKey) {
      throw new WorkflowError(
        'tenantId, type and idempotencyKey are required',
        'WORKFLOW_INPUT_INVALID',
        400
      );
    }

    const correlationId = input.correlationId ?? randomUUID();

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
          steps: input.steps?.length
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
    tenantId: string,
    runId: string
  ): Promise<WorkflowRun & { steps: WorkflowStep[] }> {
    const run = await prisma.workflowRun.findFirst({
      where: { id: runId, tenantId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    if (!run) {
      throw new WorkflowError('Workflow run not found', 'WORKFLOW_NOT_FOUND', 404);
    }
    return run;
  }

  async startStep(runId: string, name: string): Promise<WorkflowStep> {
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
    runId: string,
    name: string,
    output?: Record<string, unknown>
  ): Promise<WorkflowStep> {
    const step = await prisma.workflowStep.findFirst({ where: { runId, name } });
    if (!step) {
      throw new WorkflowError('Workflow step not found', 'WORKFLOW_STEP_NOT_FOUND', 404);
    }
    return prisma.workflowStep.update({
      where: { id: step.id },
      data: { status: 'COMPLETED', finishedAt: new Date(), output: toJson(output) },
    });
  }

  async failStep(runId: string, name: string, error: string): Promise<WorkflowStep> {
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
  async requestApproval(tenantId: string, runId: string): Promise<WorkflowRun> {
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
    tenantId: string,
    runId: string,
    decision: ApprovalDecision,
    actorId: string,
    note?: string
  ): Promise<WorkflowRun> {
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
        output: toJson({ decision, note: note ?? null, externalActionPerformed: false }),
      },
    });
  }

  async completeRun(
    tenantId: string,
    runId: string,
    output?: Record<string, unknown>
  ): Promise<WorkflowRun> {
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

  async failRun(tenantId: string, runId: string, error: string): Promise<WorkflowRun> {
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
  async withRetry<T>(
    operation: () => Promise<T>,
    options: { attempts?: number; baseDelayMs?: number } = {}
  ): Promise<{ result: T; attempts: number }> {
    const attempts = Math.max(1, options.attempts ?? 3);
    const baseDelayMs = Math.max(0, options.baseDelayMs ?? 100);
    let lastError: unknown;

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
