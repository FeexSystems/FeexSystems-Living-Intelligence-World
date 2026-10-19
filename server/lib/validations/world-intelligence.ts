import { z } from 'zod';

/** Request contract for POST /api/world-model/intelligence */
export const interpretWorldRequestSchema = z.object({
  projectId: z.string().trim().min(1).max(200),
  question: z.string().trim().min(3, 'Question must be at least 3 characters').max(1000),
});

export type InterpretWorldRequestInput = z.infer<typeof interpretWorldRequestSchema>;

/**
 * Structured model output contract. Anything that does not satisfy this is
 * rejected and the deterministic fallback is used.
 */
export const modelInterpretationSchema = z.object({
  answer: z.string().trim().min(1).max(4000),
  claims: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(600),
        evidenceIds: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
      })
    )
    .max(20)
    .default([]),
  limitations: z.array(z.string().trim().min(1).max(400)).max(10).default([]),
  confidence: z.number().min(0).max(1),
});

export type ModelInterpretationInput = z.infer<typeof modelInterpretationSchema>;
