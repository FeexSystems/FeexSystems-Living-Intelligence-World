/**
 * Maintenance Request Workflow Integration Service (Priority 2 — Important)
 *
 * Integrates RentAll maintenance requests (Mission 004) with the shared
 * workflow lifecycle (Mission 002). When a maintenance request is created
 * or updated, a corresponding WorkflowRun is created to track multi-step
 * approval and execution.
 */

import { prisma } from '../database';
import { MaintenanceRequestStatus, Prisma } from '@prisma/client';
import { logger } from '../logging';

/**
 * Create a WorkflowRun for a maintenance request when it transitions
 * to IN_PROGRESS or RESOLVED (multi-step approval required).
 */
export async function linkMaintenanceToWorkflow(
  tenantId: string,
  maintenanceRequestId: string,
  status: MaintenanceRequestStatus
): Promise<void> {
  try {
    // Only create workflow runs for statuses that need multi-step approval.
    if (status !== 'IN_PROGRESS' && status !== 'RESOLVED') {
      return;
    }

    // Check if a workflow run already exists for this maintenance request.
    const existing = await prisma.workflowRun.findFirst({
      where: {
        tenantId,
        type: 'maintenance_request',
        correlationId: maintenanceRequestId,
      },
    });

    if (existing) {
      // Update existing workflow run status.
      await prisma.workflowRun.update({
        where: { id: existing.id },
        data: {
          status:
            status === MaintenanceRequestStatus.RESOLVED
              ? 'COMPLETED'
              : 'RUNNING',
          updatedAt: new Date(),
        },
      });
      return;
    }

    // Create a new workflow run.
    const workflowRun = await prisma.workflowRun.create({
      data: {
        tenantId,
        type: 'maintenance_request',
        status:
          status === MaintenanceRequestStatus.RESOLVED
            ? 'COMPLETED'
            : 'RUNNING',
        idempotencyKey: `maint-${maintenanceRequestId}`,
        correlationId: maintenanceRequestId,
        input: { maintenanceRequestId, initialStatus: status },
        output: Prisma.JsonNull,
        error: null,
        attempts: 0,
        approvalState: status === 'IN_PROGRESS' ? 'PENDING' : 'APPROVED',
        approvedBy: null,
        approvedAt: null,
      },
    });

    // Create workflow steps for the maintenance lifecycle.
    await prisma.workflowStep.createMany({
      data: [
        {
          runId: workflowRun.id,
          name: 'maintenance_received',
          order: 1,
          status: 'COMPLETED',
          attempts: 1,
          input: { maintenanceRequestId },
          output: { status },
          startedAt: new Date(),
          finishedAt: new Date(),
        },
        {
          runId: workflowRun.id,
          name: 'maintenance_assigned',
          order: 2,
          status:
            status === 'IN_PROGRESS' ? 'RUNNING' : 'PENDING',
          attempts: 0,
          input: { maintenanceRequestId },
          output: Prisma.JsonNull,
          startedAt: null,
          finishedAt: null,
        },
        {
          runId: workflowRun.id,
          name: 'maintenance_completed',
          order: 3,
          status: 'PENDING',
          attempts: 0,
          input: { maintenanceRequestId },
          output: Prisma.JsonNull,
          startedAt: null,
          finishedAt: null,
        },
      ],
    });

    logger.debug('[maintenance-workflow] workflow run created', {
      workflowRunId: workflowRun.id,
      maintenanceRequestId,
      tenantId,
      status,
    });
  } catch (error) {
    // Workflow integration must never break maintenance request operations.
    logger.warn('[maintenance-workflow] workflow integration failed', {
      maintenanceRequestId,
      tenantId,
      status,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Update workflow run when maintenance request status changes.
 */
export async function syncMaintenanceWorkflowStatus(
  tenantId: string,
  maintenanceRequestId: string,
  status: MaintenanceRequestStatus
): Promise<void> {
  try {
    const workflowRun = await prisma.workflowRun.findFirst({
      where: {
        tenantId,
        type: 'maintenance_request',
        correlationId: maintenanceRequestId,
      },
    });

    if (!workflowRun) return;

    let newStatus: string = workflowRun.status;
    let approvalState: string | null = workflowRun.approvalState;

    switch (status) {
      case MaintenanceRequestStatus.IN_PROGRESS:
        newStatus = 'RUNNING';
        approvalState = 'PENDING';
        break;
      case MaintenanceRequestStatus.RESOLVED:
        newStatus = 'COMPLETED';
        approvalState = 'APPROVED';
        break;
      case MaintenanceRequestStatus.CLOSED:
        newStatus = 'COMPLETED';
        approvalState = 'APPROVED';
        break;
      default:
        return;
    }

    await prisma.workflowRun.update({
      where: { id: workflowRun.id },
      data: {
        status: newStatus as any,
        approvalState,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.warn('[maintenance-workflow] status sync failed', {
      maintenanceRequestId,
      tenantId,
      status,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}