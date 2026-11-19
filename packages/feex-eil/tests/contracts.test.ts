import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  agentStateEventSchema,
  embodiedActionObservationSchema,
  embodiedActionRequestSchema,
  envelope,
  evidenceBundleSchema,
  evidenceReferenceSchema,
  gestureEventSchema,
  labeledDatumSchema,
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
  disclosureForBundle,
  buildEvidenceBundle,
  isPhysicalExecutionPermitted,
  isValidAgentStateTransition,
  DATA_SOURCE_LABELS,
  requiresOperatorAuthorization,
} from "../contracts";

const TS = "2026-11-18T12:00:00.000Z";

function validAgentEvent(overrides: Record<string, unknown> = {}) {
  return {
    eventId: "11111111-1111-4111-8111-111111111111",
    agentId: "holokai-01",
    previousState: "IDLE",
    state: "LISTENING",
    timestamp: TS,
    source: "voice",
    evidenceRefs: [],
    ...overrides,
  };
}

describe("AgentStateEvent contract", () => {
  it("accepts a valid transition", () => {
    expect(agentStateEventSchema.safeParse(validAgentEvent()).success).toBe(true);
  });

  it("rejects an invalid transition per VALID_TRANSITIONS", () => {
    const bad = validAgentEvent({ previousState: "IDLE", state: "EXECUTING" });
    expect(agentStateEventSchema.safeParse(bad).success).toBe(false);
    expect(() => parseAgentStateEvent(bad)).toThrow(/Invalid agent state transition/);
  });

  it("rejects RESPONDING/EXECUTING with empty evidenceRefs", () => {
    const bad = validAgentEvent({
      previousState: "THINKING",
      state: "RESPONDING",
      evidenceRefs: [],
    });
    expect(agentStateEventSchema.safeParse(bad).success).toBe(false);
    const good = validAgentEvent({
      previousState: "THINKING",
      state: "RESPONDING",
      evidenceRefs: ["66666666-6666-4666-8666-666666666666"],
    });
    expect(agentStateEventSchema.safeParse(good).success).toBe(true);
  });

  it("rejects non-UTC timestamps", () => {
    const bad = validAgentEvent({ timestamp: "2026-11-18T12:00:00+02:00" });
    expect(agentStateEventSchema.safeParse(bad).success).toBe(false);
  });

  it("isValidAgentStateTransition mirrors VALID_TRANSITIONS", () => {
    expect(isValidAgentStateTransition("IDLE", "LISTENING")).toBe(true);
    expect(isValidAgentStateTransition("IDLE", "THINKING")).toBe(false);
    expect(isValidAgentStateTransition("EXECUTING", "RESPONDING")).toBe(true);
    expect(isValidAgentStateTransition("ERROR", "OFFLINE")).toBe(true);
  });
});

describe("Perception contracts", () => {
  const base = {
    eventId: "22222222-2222-4222-8222-222222222222",
    timestamp: TS,
    modality: "hand",
    confidence: 0.87,
    landmarks: [{ x: 0.1, y: 0.2, z: 0.3, visibility: 0.9 }],
    interactionAllowed: true,
    deviceId: "cam-01",
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

  it("accepts audio-modality fields", () => {
    const audio = {
      ...base,
      modality: "audio",
      dominantFrequency: 440,
      amplitude: 0.5,
    };
    expect(perceptionEventSchema.safeParse(audio).success).toBe(true);
  });

  it("accepts a permission snapshot incl. ERROR state", () => {
    const snap = {
      camera: "GRANTED",
      microphone: "ERROR",
      interactionAllowed: false,
      updatedAt: TS,
    };
    expect(permissionSnapshotSchema.safeParse(snap).success).toBe(true);
  });

  it("accepts a gesture event with bimanual + source linkage", () => {
    const g = {
      eventId: "33333333-3333-4333-8333-333333333333",
      timestamp: TS,
      gesture: "open_palm",
      confidence: 0.91,
      bimanual: false,
      sourceEventId: "22222222-2222-4222-8222-222222222222",
      interactionAllowed: true,
      durationMs: 220,
    };
    expect(gestureEventSchema.safeParse(g).success).toBe(true);
  });
});

describe("InteractionEvent contract", () => {
  it("accepts a well-formed channel/intent event", () => {
    const ok = {
      eventId: "44444444-4444-4444-8444-444444444444",
      timestamp: TS,
      channel: "gesture",
      intent: "select.entity",
      impactLevel: "MEDIUM",
      authorized: true,
      payload: { entityId: "world:3wm" },
    };
    expect(interactionEventSchema.safeParse(ok).success).toBe(true);
  });

  it("rejects unknown channels and empty intents", () => {
    const bad = {
      eventId: "55555555-5555-4555-8555-555555555555",
      timestamp: TS,
      channel: "psychic",
      intent: "",
      impactLevel: "LOW",
      authorized: true,
    };
    expect(interactionEventSchema.safeParse(bad).success).toBe(false);
  });
});

describe("Evidence contracts", () => {
  it("accepts a valid evidence reference", () => {
    const ref = {
      evidenceId: "66666666-6666-4666-8666-666666666666",
      entityId: "world:feexsystems",
      source: "internal:world-model",
      epistemicStatus: "ESTABLISHED",
      verifiedAt: TS,
      commitSha: "abc123",
      citation: "PLANETARY_ECOSYSTEMS registry",
    };
    expect(evidenceReferenceSchema.safeParse(ref).success).toBe(true);
  });

  it("computes lowest epistemic status and disclosure", () => {
    const refs = [
      {
        evidenceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        entityId: "e",
        source: "s",
        epistemicStatus: "ESTABLISHED" as const,
        verifiedAt: TS,
        citation: "registry entry",
      },
      {
        evidenceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        entityId: "e",
        source: "s",
        epistemicStatus: "SPECULATIVE" as const,
      },
    ];
    const bundle = buildEvidenceBundle("corr-1", refs);
    expect(bundle.correlationId).toBe("corr-1");
    expect(bundle.lowestEpistemicStatus).toBe("SPECULATIVE");
    expect(bundle.requiresDisclosure).toBe(true);
    expect(evidenceBundleSchema.safeParse(bundle).success).toBe(true);
  });

  it("rejects a bundle whose derived flags contradict its references", () => {
    const refs = [
      {
        evidenceId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        entityId: "e",
        source: "s",
        epistemicStatus: "FICTIONAL" as const,
      },
    ];
    const spoofed = {
      correlationId: "corr-x",
      references: refs,
      lowestEpistemicStatus: "ESTABLISHED",
      containsFictional: false,
      requiresDisclosure: false,
    };
    expect(evidenceBundleSchema.safeParse(spoofed).success).toBe(false);
    // disclosureForBundle must still fail closed on the unvalidated bundle.
    expect(disclosureForBundle(spoofed as never).level).toBe("REQUIRED");
  });

  it("requires provenance for factual epistemic statuses", () => {
    const noProvenance = {
      evidenceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      entityId: "e",
      source: "s",
      epistemicStatus: "ESTABLISHED",
    };
    expect(evidenceReferenceSchema.safeParse(noProvenance).success).toBe(false);
    const withProvenance = {
      ...noProvenance,
      verifiedAt: TS,
      url: "https://example.com/evidence",
    };
    expect(evidenceReferenceSchema.safeParse(withProvenance).success).toBe(true);
    // FICTIONAL/SPECULATIVE are exempt from the provenance requirement.
    expect(
      evidenceReferenceSchema.safeParse({
        ...noProvenance,
        epistemicStatus: "FICTIONAL",
      }).success,
    ).toBe(true);
  });

  it("rejects non-UUID evidence and event identifiers", () => {
    expect(
      evidenceReferenceSchema.safeParse({
        evidenceId: "not-a-uuid",
        entityId: "e",
        source: "s",
        epistemicStatus: "FICTIONAL",
      }).success,
    ).toBe(false);
    expect(
      interactionEventSchema.safeParse({
        eventId: "evt-123",
        timestamp: TS,
        channel: "gesture",
        intent: "select.entity",
        impactLevel: "LOW",
        authorized: true,
      }).success,
    ).toBe(false);
  });

  it("disclosureForBundle: FICTIONAL → REQUIRED, SPECULATIVE → PROMINENT, ESTABLISHED → NONE", () => {
    const fictional = buildEvidenceBundle("c", [
      { evidenceId: "f", entityId: "e", source: "s", epistemicStatus: "FICTIONAL" },
    ]);
    expect(disclosureForBundle(fictional).level).toBe("REQUIRED");

    const speculative = buildEvidenceBundle("c", [
      { evidenceId: "s", entityId: "e", source: "s", epistemicStatus: "SPECULATIVE" },
    ]);
    expect(disclosureForBundle(speculative).level).toBe("PROMINENT");

    const established = buildEvidenceBundle("c", [
      { evidenceId: "e", entityId: "e", source: "s", epistemicStatus: "ESTABLISHED" },
    ]);
    expect(disclosureForBundle(established).level).toBe("NONE");

    const tradition = buildEvidenceBundle("c", [
      { evidenceId: "t", entityId: "e", source: "s", epistemicStatus: "TRADITION" },
    ]);
    expect(disclosureForBundle(tradition).level).toBe("SUBTLE");
  });
});

describe("Embodied action contracts", () => {
  const request = {
    requestId: "77777777-7777-4777-8777-777777777777",
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
      observationId: "88888888-8888-4888-8888-888888888888",
      requestId: "77777777-7777-4777-8777-777777777777",
      timestamp: TS,
      outcome: "REJECTED_BY_SAFETY",
    };
    expect(embodiedActionObservationSchema.safeParse(badObs).success).toBe(false);
    const okObs = { ...badObs, reasonCode: "HUMAN_PRESENCE_REQUIRED" };
    expect(parseEmbodiedActionObservation(okObs).outcome).toBe("REJECTED_BY_SAFETY");
  });

  it("never permits physical execution without full authorization and safety allow", () => {
    const decision = {
      decisionId: "99999999-9999-4999-8999-999999999999",
      requestId: "77777777-7777-4777-8777-777777777777",
      timestamp: TS,
      allowSimulation: true,
      allowPhysical: true,
      reasons: [],
    };
    expect(safetyGatewayDecisionSchema.safeParse(decision).success).toBe(true);
    // HIGH-impact physical commands are never auto-permitted.
    expect(
      isPhysicalExecutionPermitted({ ...request, maxImpactLevel: "HIGH" }, decision),
    ).toBe(false);
    expect(
      isPhysicalExecutionPermitted(
        { ...request, maxImpactLevel: "HIGH" },
        { ...decision, allowPhysical: false },
      ),
    ).toBe(false);
    expect(
      isPhysicalExecutionPermitted({ ...request, authorization: "REQUESTED" }, decision),
    ).toBe(false);
    // A safety decision issued for a different request never applies.
    expect(
      isPhysicalExecutionPermitted(request, {
        ...decision,
        requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ).toBe(false);
    expect(isPhysicalExecutionPermitted(request, decision)).toBe(true);
    expect(requiresOperatorAuthorization(request)).toBe(true);
  });
});

describe("LabeledDatum / DataSourceLabel", () => {
  it("covers all six provenance labels", () => {
    expect([...DATA_SOURCE_LABELS].sort()).toEqual(
      ["CACHED", "ERROR", "FALLBACK", "LIVE", "SIMULATED", "UNAVAILABLE"].sort(),
    );
  });

  it("accepts a labeled datum and rejects unlabeled or unknown labels", () => {
    const schema = labeledDatumSchema(z.number());
    expect(
      schema.safeParse({ value: 42, sourceLabel: "LIVE", fetchedAt: TS }).success,
    ).toBe(true);
    expect(schema.safeParse({ value: 42, sourceLabel: "GUESS" }).success).toBe(false);
    expect(schema.safeParse({ value: 42 }).success).toBe(false);
  });
});

describe("Schema versioning", () => {
  it("accepts the current major version and rejects newer majors", () => {
    expect(isSupportedSchemaVersion(EIL_SCHEMA_VERSION)).toBe(true);
    expect(isSupportedSchemaVersion("0.9.0")).toBe(true);
    expect(isSupportedSchemaVersion("2.0.0")).toBe(false);
    expect(isSupportedSchemaVersion("not-a-version")).toBe(false);
    // Malformed versions must not pass on a lucky major-segment parse.
    expect(isSupportedSchemaVersion("1")).toBe(false);
    expect(isSupportedSchemaVersion("-1.0.0")).toBe(false);
    expect(isSupportedSchemaVersion("1.not-a-version")).toBe(false);
    expect(isSupportedSchemaVersion("1.0")).toBe(false);
  });

  it("envelope stamps the current schema version", () => {
    const env = envelope({ hello: "world" });
    expect(env.schemaVersion).toBe(EIL_SCHEMA_VERSION);
    expect(
      versionedEnvelopeSchema(z.object({ hello: z.string() })).safeParse(env).success,
    ).toBe(true);
  });
});
