/**
 * FEEX Embodied Intelligence Layer — Runtime Contract Validation
 *
 * Zod schemas mirroring the TypeScript contracts. Apply at every network and
 * persistence boundary — never trust an event because it was produced
 * in-process. Timestamps must be ISO 8601 UTC.
 */

import { z } from "zod";
import {
  AGENT_STATES,
  DATA_SOURCE_LABELS,
  VALID_AGENT_STATE_TRANSITIONS,
  type AgentStateEvent,
} from "./agent-state";
import {
  EPISTEMIC_STATUSES,
  type EvidenceBundle,
  type EvidenceReference,
} from "./evidence-reference";
import {
  FIRST_RELEASE_GESTURES,
  GESTURE_INTENT_MAP,
  IMPACT_LEVELS,
  type InteractionEvent,
} from "./interaction-event";
import {
  PERCEPTION_MODALITIES,
  PERMISSION_STATUSES,
  type GestureEvent,
  type PerceptionEvent,
  type PermissionSnapshot,
} from "./perception-event";
import {
  ACTION_AUTHORIZATION_STATES,
  ACTION_CATEGORIES,
  type EmbodiedActionObservation,
  type EmbodiedActionRequest,
  type SafetyGatewayDecision,
} from "./embodied-action";
import {
  assertSupportedSchemaVersion,
  EIL_SCHEMA_VERSION,
  type VersionedEnvelope,
} from "./schema-version";

const isoUtc = z
  .string()
  .datetime({ offset: false })
  .refine((v) => v.endsWith("Z"), { message: "timestamp must be UTC (Z suffix)" });

const eventId = z.string().min(1);
const correlationId = z.string().min(1).optional();
const confidence = z.number().min(0).max(1);
const optionalConfidence = confidence.optional();

const labeledDatumSchema = <T extends z.ZodTypeAny>(value: T) =>
  z.object({
    value: value.nullable(),
    label: z.enum(DATA_SOURCE_LABELS),
    observedAt: isoUtc,
    confidence: optionalConfidence,
    source: z.string().optional(),
    correlationId,
  });

export const agentStateEventSchema = z
  .object({
    eventId,
    agentId: z.string().min(1),
    previousState: z.enum(AGENT_STATES),
    state: z.enum(AGENT_STATES),
    timestamp: isoUtc,
    source: z.enum([
      "voice",
      "perception",
      "cognition",
      "world-model",
      "robotics",
      "system",
    ]),
    correlationId,
    evidenceRefs: z.array(z.string().min(1)),
    reason: z.string().optional(),
  })
  .superRefine((event, ctx) => {
    const allowed = VALID_AGENT_STATE_TRANSITIONS[event.previousState];
    if (!allowed.includes(event.state)) {
      ctx.addIssue({
        code: "custom",
        message: `Invalid agent state transition: ${event.previousState} → ${event.state}`,
      });
    }
  });

export const permissionSnapshotSchema = z.object({
  camera: z.enum(PERMISSION_STATUSES),
  microphone: z.enum(PERMISSION_STATUSES),
  interactionAllowed: z.boolean(),
  updatedAt: isoUtc,
});

const landmarkSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number().optional(),
  visibility: z.number().min(0).max(1).optional(),
});

export const perceptionEventSchema = z.object({
  eventId,
  timestamp: isoUtc,
  modality: z.enum(PERCEPTION_MODALITIES),
  confidence,
  landmarks: z.array(landmarkSchema).optional(),
  gesture: z.string().optional(),
  interactionAllowed: z.boolean(),
  permissionSnapshot: permissionSnapshotSchema.optional(),
  correlationId,
});

export const gestureEventSchema = z.object({
  eventId,
  timestamp: isoUtc,
  gesture: z.string().min(1),
  durationMs: z.number().min(0),
  confidence,
  interactionAllowed: z.boolean(),
  correlationId,
});

export const interactionEventSchema = z
  .object({
    eventId,
    timestamp: isoUtc,
    gesture: z.string().min(1),
    impactLevel: z.enum(IMPACT_LEVELS),
    accepted: z.boolean(),
    correlationId,
    evidenceRefs: z.array(z.string().min(1)),
  })
  .superRefine((event, ctx) => {
    if (
      (FIRST_RELEASE_GESTURES as readonly string[]).includes(event.gesture) &&
      event.accepted
    ) {
      const mapped = GESTURE_INTENT_MAP[
        event.gesture as keyof typeof GESTURE_INTENT_MAP
      ];
      if (mapped && mapped.impact !== event.impactLevel) {
        ctx.addIssue({
          code: "custom",
          message: `Impact level ${event.impactLevel} does not match gesture mapping ${mapped.impact} for ${event.gesture}`,
        });
      }
    }
  });

export const evidenceReferenceSchema = z.object({
  evidenceId: eventId,
  entityId: z.string().min(1),
  source: z.string().min(1),
  epistemicStatus: z.enum(EPISTEMIC_STATUSES),
  confidence: optionalConfidence,
  verifiedAt: isoUtc.optional(),
  url: z.string().url().optional(),
  commitSha: z.string().optional(),
  filePath: z.string().optional(),
});

export const evidenceBundleSchema = z.object({
  bundleId: eventId,
  references: z.array(evidenceReferenceSchema),
  lowestEpistemicStatus: z.enum(EPISTEMIC_STATUSES),
  containsFictional: z.boolean(),
  requiresDisclosure: z.boolean(),
  createdAt: isoUtc,
});

export const embodiedActionRequestSchema = z.object({
  requestId: eventId,
  timestamp: isoUtc,
  agentId: z.string().min(1),
  category: z.enum(ACTION_CATEGORIES),
  payload: z.record(z.string(), z.unknown()),
  maxImpactLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  correlationId,
  evidenceRefs: z.array(z.string().min(1)),
  authorization: z.enum(ACTION_AUTHORIZATION_STATES),
});

export const embodiedActionObservationSchema = z
  .object({
    observationId: eventId,
    requestId: eventId,
    timestamp: isoUtc,
    outcome: z.enum([
      "ACCEPTED",
      "REJECTED_BY_SAFETY",
      "REJECTED_BY_AUTH",
      "SIMULATED",
      "EXECUTED",
      "FAILED",
      "UNAVAILABLE",
    ]),
    reasonCode: z.string().optional(),
    detail: z.string().optional(),
    correlationId,
  })
  .superRefine((obs, ctx) => {
    if (obs.outcome !== "ACCEPTED" && !obs.reasonCode) {
      ctx.addIssue({
        code: "custom",
        message: `reasonCode is required for outcome ${obs.outcome}`,
      });
    }
  });

export const safetyGatewayDecisionSchema = z.object({
  decisionId: eventId,
  requestId: eventId,
  timestamp: isoUtc,
  allowSimulation: z.boolean(),
  allowPhysical: z.boolean(),
  reasons: z.array(z.string()),
});

export const versionedEnvelopeSchema = <T extends z.ZodTypeAny>(payload: T) =>
  z
    .object({
      schemaVersion: z.string().min(1),
      payload,
    })
    .superRefine((env, ctx) => {
      try {
        assertSupportedSchemaVersion(env.schemaVersion);
      } catch {
        ctx.addIssue({
          code: "custom",
          message: `Unsupported schema version: ${env.schemaVersion}`,
        });
      }
    });

export function parseWith<T>(
  schema: z.ZodType<T>,
  value: unknown,
  label: string,
): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `EIL contract validation failed for ${label}: ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

// Convenience parsers — one per contract.
export const parseAgentStateEvent = (v: unknown): AgentStateEvent =>
  parseWith(agentStateEventSchema, v, "AgentStateEvent");
export const parsePerceptionEvent = (v: unknown): PerceptionEvent =>
  parseWith(perceptionEventSchema, v, "PerceptionEvent");
export const parseGestureEvent = (v: unknown): GestureEvent =>
  parseWith(gestureEventSchema, v, "GestureEvent");
export const parsePermissionSnapshot = (v: unknown): PermissionSnapshot =>
  parseWith(permissionSnapshotSchema, v, "PermissionSnapshot");
export const parseInteractionEvent = (v: unknown): InteractionEvent =>
  parseWith(interactionEventSchema, v, "InteractionEvent");
export const parseEvidenceReference = (v: unknown): EvidenceReference =>
  parseWith(evidenceReferenceSchema, v, "EvidenceReference");
export const parseEvidenceBundle = (v: unknown): EvidenceBundle =>
  parseWith(evidenceBundleSchema, v, "EvidenceBundle");
export const parseEmbodiedActionRequest = (
  v: unknown,
): EmbodiedActionRequest =>
  parseWith(embodiedActionRequestSchema, v, "EmbodiedActionRequest");
export const parseEmbodiedActionObservation = (
  v: unknown,
): EmbodiedActionObservation =>
  parseWith(embodiedActionObservationSchema, v, "EmbodiedActionObservation");
export const parseSafetyGatewayDecision = (
  v: unknown,
): SafetyGatewayDecision =>
  parseWith(safetyGatewayDecisionSchema, v, "SafetyGatewayDecision");
export const parseLabeledDatum = <T>(
  schema: z.ZodType<T>,
  v: unknown,
): { value: T | null; label: string; observedAt: string } & Record<
  string,
  unknown
> => parseWith(labeledDatumSchema(schema), v, "LabeledDatum");

export { EIL_SCHEMA_VERSION };
export type { VersionedEnvelope };
export { labeledDatumSchema };
export { z };
