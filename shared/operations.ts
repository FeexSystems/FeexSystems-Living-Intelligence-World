/**
 * Feex AI Operations — shared contracts (client + server).
 *
 * These types are the single contract for the Mission 001 vertical slice.
 * They intentionally mirror the Prisma enums without importing generated
 * Prisma code into the browser bundle.
 */

export const OPERATIONS_ENQUIRY_STATUSES = [
  'RECEIVED',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'FAILED',
] as const;

export type OperationsEnquiryStatus = (typeof OPERATIONS_ENQUIRY_STATUSES)[number];

export const OPERATIONS_ENQUIRY_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;

export type OperationsEnquiryPriority = (typeof OPERATIONS_ENQUIRY_PRIORITIES)[number];

/** Provenance of a classification: which model produced it, if any. */
export type OperationsAiProvider = 'gemini' | 'openai' | 'deterministic';

/** Input accepted by POST /api/operations/enquiries. */
export interface CreateOperationsEnquiryInput {
  contactName: string;
  contactEmail: string;
  company?: string;
  subject: string;
  message: string;
  source?: string;
  /** Client-generated key so retries do not create duplicates. */
  idempotencyKey: string;
}

/** AI / deterministic classification output. This is an interpretation, not a fact. */
export interface OperationsClassification {
  category: string;
  priority: OperationsEnquiryPriority;
  confidence: number;
  summary: string;
  draftResponse: string;
}

/** Serialised enquiry returned by the API. */
export interface OperationsEnquiryDTO {
  id: string;
  tenantId: string;
  source: string;
  contactName: string;
  contactEmail: string;
  company: string | null;
  subject: string;
  message: string;
  status: OperationsEnquiryStatus;
  category: string | null;
  priority: OperationsEnquiryPriority;
  confidence: number | null;
  summary: string | null;
  draftResponse: string | null;
  aiProvider: OperationsAiProvider | null;
  aiModel: string | null;
  error: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OperationsEnquiryListResponse {
  enquiries: OperationsEnquiryDTO[];
  total: number;
}
