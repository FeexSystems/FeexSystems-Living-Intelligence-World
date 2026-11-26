/**
 * FEEX EIL — Runtime Contract Validation
 *
 * Zod schemas mirroring the TypeScript contracts. Apply at every network and
 * persistence boundary — never trust an event because it was produced
 * in-process. Timestamps must be ISO 8601 UTC.
 */

import { z } from "zod";
import {
  DATA_SOURCE_LABELS,
  EVIDENCE_REQUIRED_STATES,
  isValidAgentStateTransition,


} from "./agent-state";
import {
  EPISTEMIC_RANK,
  EPISTEMIC_STATUSES,
  lowestStatus,


} from "./evidence-reference";
import {
  IMPACT_LEVELS,
  INTERACTION_CHANNELS,

} from "./interaction-event";
import {
  PERCEPTION_MODALITIES,
  PERMISSION_STATES,



} from "./perception-event";
import {
  ACTION_AUTHORIZATION_STATES,
  ACTION_CATEGORIES,



} from "./embodied-action";
import { assertSupportedSchemaVersion } from "./schema-version";

const isoUtc = z
  .string()
  .datetime({ offset: false })
  .refine((v) => v.endsWith("Z"), { message: "timestamp must be UTC (Z suffix)" });

// Contract requires UUID identifiers — reject malformed or ambiguous IDs
// at the boundary rather than letting them into persisted history.
const eventId = z.uuid();
const correlationId = z.string().min(1).optional();
const confidence = z.number().min(0).max(1);
const optionalConfidence = confidence.optional();

export const labeledDatumSchema = (value) =>
  z.object({
    value,
    sourceLabel: z.enum(DATA_SOURCE_LABELS),
    fetchedAt: isoUtc.optional(),
    sourceId: z.string().optional(),
  });

export const agentStateEventSchema = z
  .object({
    eventId,
    agentId: z.string().min(1),
    previousState: z.enum([
      "IDLE",
      "LISTENING",
      "PERCEIVING",
      "THINKING",
      "RESPONDING",
      "SPEAKING",
      "EXECUTING",
      "ERROR",
      "OFFLINE",
    ]),
    state: z.enum([
      "IDLE",
      "LISTENING",
      "PERCEIVING",
      "THINKING",
      "RESPONDING",
      "SPEAKING",
      "EXECUTING",
      "ERROR",
      "OFFLINE",
    ]),
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
    confidence: optionalConfidence,
    reason: z.string().optional(),
    debug: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((event, ctx) => {
    if (!isValidAgentStateTransition(event.previousState, event.state)) {
      ctx.addIssue({
        code: "custom",
        message: `Invalid agent state transition: ${event.previousState} → ${event.state}`,
      });
    }
    if (
      EVIDENCE_REQUIRED_STATES.includes(event.state) &&
      event.evidenceRefs.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: `AgentState ${event.state} requires non-empty evidenceRefs`,
      });
    }
  });

export const permissionSnapshotSchema = z.object({
  camera: z.enum(PERMISSION_STATES),
  microphone: z.enum(PERMISSION_STATES),
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
  deviceId: z.string().optional(),
  dominantFrequency: z.number().optional(),
  amplitude: z.number().min(0).max(1).optional(),
  correlationId,
});

export const gestureEventSchema = z.object({
  eventId,
  timestamp: isoUtc,
  gesture: z.string().min(1),
  confidence,
  bimanual: z.boolean(),
  sourceEventId: eventId,
  interactionAllowed: z.boolean(),
  durationMs: z.number().min(0),
  correlationId,
});

export const interactionEventSchema = z.object({
  eventId,
  timestamp: isoUtc,
  channel: z.enum(INTERACTION_CHANNELS),
  intent: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  impactLevel: z.enum(IMPACT_LEVELS),
  authorized: z.boolean(),
  sourceEventId: z.string().optional(),
  correlationId,
});

export const evidenceReferenceSchema = z
  .object({
    evidenceId: eventId,
    entityId: z.string().min(1),
    source: z.string().min(1),
    epistemicStatus: z.enum(EPISTEMIC_STATUSES),
    confidence: optionalConfidence,
    verifiedAt: isoUtc.optional(),
    commitSha: z.string().optional(),
    filePath: z.string().optional(),
    citation: z.string().optional(),
    language: z.string().optional(),
    url: z.string().url().optional(),
  })
  .superRefine((ref, ctx) => {
    // Evidence-before-claims: statuses that assert something about the
    // world must carry implementation provenance — a verification
    // timestamp plus at least one traceable locator (URL, commit, file
    // path, or citation). FICTIONAL and SPECULATIVE are exempt: the
    // contract explicitly allows omitting verifiedAt for them.
    if (
      ref.epistemicStatus === "FICTIONAL" ||
      ref.epistemicStatus === "SPECULATIVE"
    ) {
      return;
    }
    if (!ref.verifiedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["verifiedAt"],
        message: `verifiedAt is required for epistemicStatus ${ref.epistemicStatus}`,
      });
    }
    if (
      !ref.url &&
      !ref.commitSha &&
      !ref.filePath &&
      !ref.citation
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "evidence reference requires provenance: url, commitSha, filePath, or citation",
      });
    }
  });

export const evidenceBundleSchema = z
  .object({
    correlationId: z.string().min(1),
    references: z.array(evidenceReferenceSchema),
    lowestEpistemicStatus: z.enum(EPISTEMIC_STATUSES),
    containsFictional: z.boolean(),
    requiresDisclosure: z.boolean(),
    createdAt: isoUtc.optional(),
  })
  .superRefine((bundle, ctx) => {
    // Derived fields are computed, never asserted: a bundle whose flags
    // contradict its references is rejected so disclosure cannot be
    // spoofed (e.g. FICTIONAL evidence with containsFictional: false).
    const derivedLowest = lowestStatus(bundle.references);
    const derivedFictional = bundle.references.some(
      (r) => r.epistemicStatus === "FICTIONAL",
    );
    const derivedDisclosure =
      EPISTEMIC_RANK[derivedLowest] < EPISTEMIC_RANK.ESTABLISHED;
    if (bundle.lowestEpistemicStatus !== derivedLowest) {
      ctx.addIssue({
        code: "custom",
        path: ["lowestEpistemicStatus"],
        message: `lowestEpistemicStatus must be ${derivedLowest} for the given references`,
      });
    }
    if (bundle.containsFictional !== derivedFictional) {
      ctx.addIssue({
        code: "custom",
        path: ["containsFictional"],
        message: `containsFictional must be ${derivedFictional} for the given references`,
      });
    }
    if (bundle.requiresDisclosure !== derivedDisclosure) {
      ctx.addIssue({
        code: "custom",
        path: ["requiresDisclosure"],
        message: `requiresDisclosure must be ${derivedDisclosure} for the given references`,
      });
    }
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

export const versionedEnvelopeSchema = (payload) =>
  z
    .object({
      schemaVersion: z.string().min(1),
      payload,
    })
    .superRefine((env, ctx) => {
      try {
        assertSupportedSchemaVersion(env.schemaVersion);
      } catch (e) {
        ctx.addIssue({
          code: "custom",
          message: `Unsupported schema version: ${env.schemaVersion}`,
        });
      }
    });

export function parseWith(
  schema,
  value,
  label,
) {
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
export const parseAgentStateEvent = (v) =>
  parseWith(agentStateEventSchema, v, "AgentStateEvent");
export const parsePerceptionEvent = (v) =>
  parseWith(perceptionEventSchema, v, "PerceptionEvent");
export const parseGestureEvent = (v) =>
  parseWith(gestureEventSchema, v, "GestureEvent");
export const parsePermissionSnapshot = (v) =>
  parseWith(permissionSnapshotSchema, v, "PermissionSnapshot");
export const parseInteractionEvent = (v) =>
  parseWith(interactionEventSchema, v, "InteractionEvent");
export const parseEvidenceReference = (v) =>
  parseWith(evidenceReferenceSchema, v, "EvidenceReference");
export const parseEvidenceBundle = (v) =>
  parseWith(evidenceBundleSchema, v, "EvidenceBundle");
export const parseEmbodiedActionRequest = (
  v,
) =>
  parseWith(embodiedActionRequestSchema, v, "EmbodiedActionRequest");
export const parseEmbodiedActionObservation = (
  v,
) =>
  parseWith(embodiedActionObservationSchema, v, "EmbodiedActionObservation");
export const parseSafetyGatewayDecision = (
  v,
) =>
  parseWith(safetyGatewayDecisionSchema, v, "SafetyGatewayDecision");
export const parseLabeledDatum = (
  valueSchema,
  v,
) =>
  parseWith(labeledDatumSchema(valueSchema), v, "LabeledDatum");

export { EIL_SCHEMA_VERSION } from "./schema-version";
;
export { z };
