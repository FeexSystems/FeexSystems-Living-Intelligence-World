import { z } from 'zod';
import {
  OPERATIONS_ENQUIRY_PRIORITIES,
  OPERATIONS_ENQUIRY_STATUSES,
} from '../../../shared/operations';

/**
 * Validation for the Feex AI Operations vertical slice.
 *
 * Reuses the project's established Zod approach (see validations/user.ts).
 * Bounds are deliberately explicit so an enquiry cannot be used as an
 * unbounded payload / token sink.
 */

export const createOperationsEnquirySchema = z.object({
  contactName: z.string().trim().min(1, 'Contact name is required').max(120),
  contactEmail: z.string().trim().toLowerCase().email('A valid contact email is required').max(254),
  company: z.string().trim().max(160).optional(),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(200),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(5000),
  source: z.string().trim().max(60).optional(),
  // Client-generated; bounded so it cannot be abused as a large key.
  idempotencyKey: z.string().trim().min(8, 'idempotencyKey must be at least 8 characters').max(128),
});

export type CreateOperationsEnquiryInput = z.infer<typeof createOperationsEnquirySchema>;

export const listOperationsEnquiriesQuerySchema = z.object({
  status: z.enum(OPERATIONS_ENQUIRY_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export type ListOperationsEnquiriesQuery = z.infer<typeof listOperationsEnquiriesQuerySchema>;

export const reviewOperationsEnquirySchema = z.object({
  note: z.string().trim().max(1000).optional(),
});

export type ReviewOperationsEnquiryInput = z.infer<typeof reviewOperationsEnquirySchema>;

/**
 * Shape we require back from the model. Validated before persisting so a
 * malformed model response can never be treated as a valid classification.
 */
export const operationsClassificationSchema = z.object({
  category: z.string().trim().min(1).max(80),
  priority: z.enum(OPERATIONS_ENQUIRY_PRIORITIES),
  confidence: z.number().min(0).max(1),
  summary: z.string().trim().min(1).max(600),
  draftResponse: z.string().trim().min(1).max(4000),
});

export type OperationsClassificationInput = z.infer<typeof operationsClassificationSchema>;
