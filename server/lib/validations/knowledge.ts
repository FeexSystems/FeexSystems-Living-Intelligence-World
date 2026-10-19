import { z } from 'zod';

/** Request contract for evidence-linked document Q&A. */
export const askKnowledgeQuestionSchema = z.object({
  question: z.string().trim().min(3, 'Question must be at least 3 characters').max(1000),
  documentIds: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
});

export type AskKnowledgeQuestionInput = z.infer<typeof askKnowledgeQuestionSchema>;

/** Structured model output. Invalid payloads fall back to extractive answering. */
export const modelKnowledgeAnswerSchema = z.object({
  answer: z.string().trim().min(1).max(4000),
  citations: z
    .array(
      z.object({
        chunkId: z.string().trim().min(1).max(100),
      })
    )
    .max(20)
    .default([]),
  limitations: z.array(z.string().trim().min(1).max(400)).max(10).default([]),
  confidence: z.number().min(0).max(1),
});
