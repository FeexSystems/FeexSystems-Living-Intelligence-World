import { z } from "zod";
import { describe, expect, it } from "vitest";
import {
  agentStateEventSchema,
  embodiedActionObservationSchema,
  embodiedActionRequestSchema,
  envelope,
  evidenceBundleSchema,
  evidenceReferenceSchema,
  gestureEventSchema,
  interactionEventSchema,
  isSupportedSchemaVersion,
  parseAgentStateEvent,
  parseEmbodiedActionObservation,
  parseInteractionEvent,
  perceptionEventSchema,
  permissionSnapshotSchema,
  safetyGatewayDecisionSchema,
  versionedEnvelopeSchema,
  EIL_SCHEMA_VERSION,
} from "../contracts";
import { buildEvidenceBundle } from "../contracts/evidence-reference";
import {
  isPhysicalExecutionPermitted,
  isValidAgentStateTransition,
  requiresOperatorAuthorization,
} from "../contracts";

const TS = "2026-11-18T12:00:00.000Z";

function validAgentEvent(overrides: Record<string, unknown> = {}) {
  return {
    eventId: "evt-1",
    agentId: "holokai-01",
    previousState: "IDLE",
    state: "LISTENING",
    timestamp: TS,
    source: "voice",
    evidenceRefs: ["ev-1"],
    ...overrides,
  };
}

describe("AgentStateEvent contract", () => {
  it("accepts a valid transition", () => {
    expect(agentStateEventSchema.safeParse(validAgentEvent()).success).toBe(true);
  });

  it("rejects an invalid transition", () => {
    const bad = validAgentEvent({ previousState: "IDLE", state: "EXECUTING" });
    expect(agentStateEventSchema.safeParse(bad).success).toBe(false);
    expect(() => parseAgentStateEvent(bad)).toThrow(/Invalid agent state transition/);
  });

  it("rejects non-UTC timestamps", () => {
    const bad = validAgentEvent({ timestamp: "2026-11-18T12:00:00+02:00" });
    expect(agentStateEventSchema.safeParse(bad).success).toBe(false);
  });

  it("isValidAgentStateTransition mirrors the contract table", () => {
    expect(isValidAgentStateTransition("IDLE", "LISTENING")).toBe(true);
    expect(isValidAgentStateTransition("OFFLINE", "SPEAKING")).toBe(false);
    expect(isValidAgentStateTransition("ERROR", "OFFLINE")).toBe(true);
  });
});

describe("Perception contracts", () => {
  const base = {
    eventId: "pev-1",
    timestamp: TS,
    modality: "hand",
    confidence: 0.87,
    landmarks: [{ x: 0.1, y: 0.2, z: 0.3, visibility: 0.9 }],
    interactionAllowed: true,
  };

  it("accepts a valid perception event", () => {
    expect(perceptionEventSchema.safeParse(base).success).toBe(true);
  });

  it("rejects confidence outside [0,1]", () => {
    expect(perceptionEventSchema.safeParse({ ...base, confidence: 1.4 }).success).toBe(false);
  });

  it("rejects unknown modality", () => {
    expect(perceptionEventSchema.safeParse({ ...base, modality: "telepathy" }).success).toBe(false);
  });

  it("accepts a permission snapshot", () => {
    const snap = {
      camera: "GRANTED",
      microphone: "PROMPT",
      interactionAllowed: false,
      updatedAt: TS,
    };
    expect(permissionSnapshotSchema.safeParse(snap).success).toBe(true);
  });

  it("accepts a gesture event with debounce duration", () => {
    const g = {
      eventId: "gev-1",
      timestamp: TS,
      gesture: "OPEN_PALM",
      durationMs: 220,
      confidence: 0.91,
      interactionAllowed: true,
    };
    expect(gestureEventSchema.safeParse(g).success).toBe(true);
  });
});

describe("InteractionEvent contract", () => {
  it("rejects impact level mismatched with gesture mapping", () => {
    const bad = {
      eventId: "iev-1",
      timestamp: TS,
      gesture: "OPEN_PALM",
      impactLevel: "HIGH",
      accepted: true,
      evidenceRefs: [],
    };
    expect(() => parseInteractionEvent(bad)).toThrow(/does not match gesture mapping/);
  });

  it("accepts a correctly mapped gesture", () => {
    const ok = {
      eventId: "iev-2",
      timestamp: TS,
      gesture: "INDEX_POINT",
      impactLevel: "MEDIUM",
      accepted: true,
      evidenceRefs: ["ev-9"],
    };
    expect(interactionEventSchema.safeParse(ok).success).toBe(true);
  });
});

describe("Evidence contracts", () => {
  it("accepts a valid evidence reference", () => {
    const ref = {
      evidenceId: "ev-1",
      entityId: "world:feexsystems",
      source: "github:FeexSystems/world-model",
      epistemicStatus: "ESTABLISHED",
      verifiedAt: TS,
      commitSha: "abc123",
    };
    expect(evidenceReferenceSchema.safeParse(ref).success).toBe(true);
  });

  it("computes lowest epistemic status and disclosure", () => {
    const refs = [
      { evidenceId: "a", entityId: "e", source: "s", epistemicStatus: "ESTABLISHED" as const },
      { evidenceId: "b", entityId: "e", source: "s", epistemicStatus: "SPECULATIVE" as const },
    ];
    const bundle = buildEvidenceBundle("bundle-1", refs);
    expect(bundle.lowestEpistemicStatus).toBe("SPECULATIVE");
    expect(bundle.requiresDisclosure).toBe(true);
    expect(evidenceBundleSchema.safeParse(bundle).success).toBe(true);
  });

  it("marks fictional content as requiring disclosure", () => {
    const refs = [
      { evidenceId: "f", entityId: "e", source: "s", epistemicStatus: "FICTIONAL" as const },
    ];
    const bundle = buildEvidenceBundle("bundle-2", refs);
    expect(bundle.containsFictional).toBe(true);
    expect(bundle.requiresDisclosure).toBe(true);
  });
});

describe("Embodied action contracts", () => {
  const request = {
    requestId: "req-1",
    timestamp: TS,
    agentId: "holokai-01",
    category: "PHYSICAL_COMMAND",
    payload: { joint: "arm", angle: 0.5 },
    maxImpactLevel: "MEDIUM",
    evidenceRefs: [],
    authorization: "AUTHORIZED",
  };

  it("accepts a valid action request", () => {
    expect(embodiedActionRequestSchema.safeParse(request).success).toBe(true);
  });

  it("requires reasonCode for non-ACCEPTED observations", () => {
    const badObs = {
      observationId: "obs-1",
      requestId: "req-1",
      timestamp: TS,
      outcome: "REJECTED_BY_SAFETY",
    };
    expect(embodiedActionObservationSchema.safeParse(badObs).success).toBe(false);
    const okObs = { ...badObs, reasonCode: "HUMAN_PRESENCE_REQUIRED" };
    expect(parseEmbodiedActionObservation(okObs).outcome).toBe("REJECTED_BY_SAFETY");
  });

  it("never permits physical execution without full authorization and safety allow", () => {
    const decision = {
      decisionId: "dec-1",
      requestId: "req-1",
      timestamp: TS,
      allowSimulation: true,
      allowPhysical: true,
      reasons: [],
    };
    expect(safetyGatewayDecisionSchema.safeParse(decision).success).toBe(true);
    // HIGH impact is never physically permitted even when authorized.
    expect(
      isPhysicalExecutionPermitted({ ...request, maxImpactLevel: "HIGH" }, decision),
    ).toBe(false);
    expect(
      isPhysicalExecutionPermitted(
        { ...request, authorization: "REQUESTED" },
        decision,
      ),
    ).toBe(false);
    expect(isPhysicalExecutionPermitted(request, decision)).toBe(true);
    expect(requiresOperatorAuthorization(request)).toBe(true);
  });
});

describe("Schema versioning", () => {
  it("accepts the current major version and rejects newer majors", () => {
    expect(isSupportedSchemaVersion(EIL_SCHEMA_VERSION)).toBe(true);
    expect(isSupportedSchemaVersion("0.9.0")).toBe(true);
    expect(isSupportedSchemaVersion("2.0.0")).toBe(false);
    expect(isSupportedSchemaVersion("not-a-version")).toBe(false);
  });

  it("envelope stamps the current schema version", () => {
    const env = envelope({ hello: "world" });
    expect(env.schemaVersion).toBe(EIL_SCHEMA_VERSION);
    expect(versionedEnvelopeSchema(z.object({ hello: z.string() })).safeParse(env).success).toBe(true);
  });
});

