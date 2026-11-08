/**
 * Zod schemas for the Omni-Command Orchestration Contract (v1.0)
 */
import { z } from "zod";
import type { OmniCommandRequest } from "./orchestration";

export const ReasoningStepSchema = z.object({
  id: z.string(),
  type: z.enum(["parse", "retrieve", "rank", "decide", "render", "tool"]),
  message: z.string(),
  timestamp: z.string(),
  durationMs: z.number().optional(),
});

export const EvidenceAnchorSchema = z.object({
  type: z.enum(["project", "artifact", "technology", "relationship", "commit"]),
  id: z.string(),
  label: z.string(),
  url: z.string().optional(),
  sha: z.string().optional(),
});

export const OmniComponentSchema = z.enum([
  "GraphVisualizer",
  "MarkdownViewer",
  "MetricsDashboard",
  "CodeViewer",
  "EvidencePanel",
  "EmptyStage",
  "ErrorStage",
]);

export const OmniCommandContextSchema = z.object({
  focusedNodeIds: z.array(z.string()).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  previousIntent: z.string().optional(),
  sessionId: z.string().optional(),
  lastQuery: z.string().optional(),
});

export const OmniCommandRequestSchema = z.object({
  query: z.string().min(1),
  context: OmniCommandContextSchema.optional(),
});

export const UiDirectiveSchema = z.object({
  component: OmniComponentSchema,
  props: z.record(z.string(), z.unknown()),
  layoutHint: z.enum(["full", "split", "sidebar"]).optional(),
});

export const OmniCommandResponseSchema = z.object({
  version: z.literal("1.0"),
  requestId: z.string(),
  intent: z.string(),
  status: z.enum(["success", "partial", "error"]),
  confidence: z.number().min(0).max(1),
  groundedEvidenceCount: z.number().int().min(0),
  reasoning_trace: z.array(ReasoningStepSchema),
  ui_directive: UiDirectiveSchema,
  secondary_directive: UiDirectiveSchema.optional(),
  context: OmniCommandContextSchema,
  suggestions: z.array(z.string()),
  evidence_anchors: z.array(EvidenceAnchorSchema),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      recoverable: z.boolean(),
    })
    .optional(),
});

export type OmniCommandResponseParsed = z.infer<typeof OmniCommandResponseSchema>;

/** Sanitize / coerce a raw payload into a valid contract response */
export function validateOmniResponse(raw: unknown): {
  success: boolean;
  data?: OmniCommandResponseParsed;
  error?: string;
} {
  const result = OmniCommandResponseSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
  };
}

export function validateOmniRequest(raw: unknown): {
  success: boolean;
  data?: OmniCommandRequest;
  error?: string;
} {
  const result = OmniCommandRequestSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data as OmniCommandRequest };
  return {
    success: false,
    error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
  };
}
