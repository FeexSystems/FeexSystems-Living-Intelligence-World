import { OperationsEnquiry, OperationsEnquiryStatus, Prisma } from '@prisma/client';
import { prisma } from '../database';
import { aiGateway } from './ai-gateway.service';
import {
  buildClassifierUserPrompt,
  classifyDeterministically,
  OPERATIONS_CLASSIFIER_SYSTEM_PROMPT,
  parseModelClassification,
} from './operations-classifier';
import {
  CreateOperationsEnquiryInput,
  OperationsEnquiryDTO,
  OperationsAiProvider,
} from '../../../shared/operations';

/**
 * Feex AI Operations service (Mission 001).
 *
 * Responsibilities:
 *   - persist enquiries idempotently per tenant;
 *   - classify + draft via the provider-neutral AI gateway, with a deterministic
 *     fallback when no model credential is configured (or the model output is
 *     invalid);
 *   - record every state transition;
 *   - enforce the human approval gate. Approval performs NO external action.
 */

export class OperationsError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'OperationsError';
  }
}

// Review transitions are constrained inline in reviewEnquiry().

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2002'
  );
}

function resolveProvider(rawProvider: string | undefined): OperationsAiProvider {
  if (rawProvider === 'gemini' || rawProvider === 'openai') return rawProvider;
  return 'deterministic';
}

export class OperationsService {
  /**
   * Create (or replay) an enquiry for a tenant.
   *
   * Idempotency is guaranteed by the (tenantId, idempotencyKey) unique index:
   * a retry returns the existing record instead of creating a duplicate.
   */
  async createEnquiry(
    tenantId: string,
    input: CreateOperationsEnquiryInput
  ): Promise<{ enquiry: OperationsEnquiryDTO; created: boolean }> {
    const existing = await prisma.operationsEnquiry.findUnique({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: input.idempotencyKey } },
    });

    if (existing) {
      return { enquiry: this.toDTO(existing), created: false };
    }

    let record: OperationsEnquiry;
    try {
      record = await prisma.operationsEnquiry.create({
        data: {
          tenantId,
          idempotencyKey: input.idempotencyKey,
          source: input.source ?? 'web',
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          company: input.company ?? null,
          subject: input.subject,
          message: input.message,
          status: 'RECEIVED',
        },
      });
    } catch (error) {
      // Concurrent retry: the other request won the unique index.
      if (isUniqueViolation(error)) {
        const raced = await prisma.operationsEnquiry.findUnique({
          where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: input.idempotencyKey } },
        });
        if (raced) return { enquiry: this.toDTO(raced), created: false };
      }
      throw error;
    }

    await this.recordEvent(record.id, 'enquiry.received', null, 'RECEIVED', {
      source: record.source,
    });

    const classified = await this.classifyAndDraft(record);

    return { enquiry: this.toDTO(classified), created: true };
  }

  /**
   * Classify + draft, persisting the outcome (or the failure).
   * Model output is validated; on any failure we fall back deterministically.
   */
  private async classifyAndDraft(record: OperationsEnquiry): Promise<OperationsEnquiry> {
    const textInput = {
      contactName: record.contactName,
      company: record.company,
      subject: record.subject,
      message: record.message,
    };

    let classification = classifyDeterministically(textInput);
    let provider: OperationsAiProvider = 'deterministic';
    let model: string | null = null;
    let errorMessage: string | null = null;

    try {
      const aiResult = await aiGateway.generateObject<unknown>(
        OPERATIONS_CLASSIFIER_SYSTEM_PROMPT,
        buildClassifierUserPrompt(textInput),
        { temperature: 0.1, maxTokens: 1200 }
      );

      if (aiResult?.object) {
        const parsed = parseModelClassification(aiResult.object);
        if (parsed) {
          classification = parsed;
          provider = resolveProvider(aiResult.provider);
          model = aiResult.model;
        } else {
          errorMessage = 'Model returned an invalid classification; deterministic fallback used.';
        }
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'AI classification failed';
    }

    try {
      const updated = await prisma.operationsEnquiry.update({
        where: { id: record.id },
        data: {
          status: 'PENDING_APPROVAL',
          category: classification.category,
          priority: classification.priority,
          confidence: classification.confidence,
          summary: classification.summary,
          draftResponse: classification.draftResponse,
          aiProvider: provider,
          aiModel: model,
          error: errorMessage,
        },
      });

      await this.recordEvent(record.id, 'enquiry.classified', 'RECEIVED', 'PENDING_APPROVAL', {
        aiProvider: provider,
        aiModel: model,
        category: classification.category,
        priority: classification.priority,
        fallback: provider === 'deterministic',
        note: errorMessage,
      });

      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to persist classification';
      const failed = await prisma.operationsEnquiry.update({
        where: { id: record.id },
        data: { status: 'FAILED', error: message, aiProvider: provider, aiModel: model },
      });
      await this.recordEvent(record.id, 'enquiry.failed', 'RECEIVED', 'FAILED', { message });
      return failed;
    }
  }

  /** Tenant-scoped list, newest first. */
  async listEnquiries(
    tenantId: string,
    options: { status?: OperationsEnquiryStatus; limit?: number } = {}
  ): Promise<{ enquiries: OperationsEnquiryDTO[]; total: number }> {
    const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);

    const [rows, total] = await Promise.all([
      prisma.operationsEnquiry.findMany({
        where: { tenantId, ...(options.status ? { status: options.status } : {}) },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.operationsEnquiry.count({
        where: { tenantId, ...(options.status ? { status: options.status } : {}) },
      }),
    ]);

    return { enquiries: rows.map((row) => this.toDTO(row)), total };
  }

  /** Tenant-scoped fetch. Cross-tenant access is indistinguishable from missing. */
  async getEnquiry(tenantId: string, id: string): Promise<OperationsEnquiryDTO> {
    const record = await prisma.operationsEnquiry.findFirst({ where: { id, tenantId } });
    if (!record) {
      throw new OperationsError('Enquiry not found', 'ENQUIRY_NOT_FOUND', 404);
    }
    return this.toDTO(record);
  }

  /**
   * Human approval gate.
   *
   * Records the decision only. It deliberately performs NO external action
   * (no email, booking or payment) — that remains a separate, audited step.
   */
  async approveEnquiry(
    tenantId: string,
    id: string,
    actorId: string,
    note?: string
  ): Promise<OperationsEnquiryDTO> {
    return this.reviewEnquiry(tenantId, id, 'APPROVED', actorId, note);
  }

  async rejectEnquiry(
    tenantId: string,
    id: string,
    actorId: string,
    note?: string
  ): Promise<OperationsEnquiryDTO> {
    return this.reviewEnquiry(tenantId, id, 'REJECTED', actorId, note);
  }

  private async reviewEnquiry(
    tenantId: string,
    id: string,
    target: Extract<OperationsEnquiryStatus, 'APPROVED' | 'REJECTED'>,
    actorId: string,
    note?: string
  ): Promise<OperationsEnquiryDTO> {
    const record = await prisma.operationsEnquiry.findFirst({ where: { id, tenantId } });
    if (!record) {
      throw new OperationsError('Enquiry not found', 'ENQUIRY_NOT_FOUND', 404);
    }

    if (record.status !== 'PENDING_APPROVAL') {
      throw new OperationsError(
        `Enquiry is ${record.status}; only PENDING_APPROVAL enquiries can be reviewed`,
        'ENQUIRY_NOT_REVIEWABLE',
        409
      );
    }

    const updated = await prisma.operationsEnquiry.update({
      where: { id: record.id },
      data: {
        status: target,
        approvedAt: new Date(),
        approvedBy: actorId,
      },
    });

    await this.recordEvent(record.id, `enquiry.${target.toLowerCase()}`, record.status, target, {
      actorId,
      note: note ?? null,
      externalActionPerformed: false,
    });

    return this.toDTO(updated);
  }

  private async recordEvent(
    enquiryId: string,
    type: string,
    fromStatus: string | null,
    toStatus: string | null,
    detail?: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.operationsEnquiryEvent.create({
        data: {
          enquiryId,
          type,
          fromStatus,
          toStatus,
          detail: (detail ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      // Event logging must never break the workflow.
      console.warn('[operations] failed to record event', type, error);
    }
  }

  private toDTO(record: OperationsEnquiry): OperationsEnquiryDTO {
    return {
      id: record.id,
      tenantId: record.tenantId,
      source: record.source,
      contactName: record.contactName,
      contactEmail: record.contactEmail,
      company: record.company,
      subject: record.subject,
      message: record.message,
      status: record.status,
      category: record.category,
      priority: record.priority,
      confidence: record.confidence,
      summary: record.summary,
      draftResponse: record.draftResponse,
      aiProvider: (record.aiProvider as OperationsAiProvider | null) ?? null,
      aiModel: record.aiModel,
      error: record.error,
      approvedAt: record.approvedAt ? record.approvedAt.toISOString() : null,
      approvedBy: record.approvedBy,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}

export const operationsService = new OperationsService();

