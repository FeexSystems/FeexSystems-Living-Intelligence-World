 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * G5 Stage 1 — LocalEILAdapter contract tests.
 *
 * Covers the Stage 1 acceptance criteria: invalid, stale, duplicate,
 * unauthorized, and evidence-deficient inputs fail closed; evidence-
 * required states cannot be entered without evidenceRefs; gesture
 * mapping cannot produce HIGH impact; no evidence is fabricated.
 */
import { describe, expect, it } from "vitest";
import { LocalEILAdapter } from "../interaction/LocalEILAdapter";


const NOW = "2026-11-22T12:00:00.000Z";
let counter = 0;
const nextId = () =>
  `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`;

function makeAdapter() {
  return new LocalEILAdapter({
    agentId: "holokai-test",
    createEventId: nextId,
    now: () => NOW,
  });
}

function validInteractionEvent(
  overrides = {},
) {
  return {
    eventId: nextId(),
    timestamp: NOW,
    channel: "voice",
    intent: "select.entity",
    impactLevel: "LOW",
    authorized: true,
    ...overrides,
  };
}

function validGestureEvent(gesture, overrides = {}) {
  return {
    eventId: nextId(),
    timestamp: NOW,
    gesture,
    confidence: 0.9,
    bimanual: false,
    sourceEventId: nextId(),
    interactionAllowed: true,
    durationMs: 120,
    ...overrides,
  };
}

describe("LocalEILAdapter — agent state", () => {
  it("boots OFFLINE and applies legal transitions", () => {
    const a = makeAdapter();
    expect(a.currentState()).toBe("OFFLINE");
    const r = a.transition("IDLE", "system");
    expect(r.ok).toBe(true);
    expect(a.currentState()).toBe("IDLE");
  });

  it("rejects illegal transitions without mutating state", () => {
    const a = makeAdapter();
    const r = a.transition("RESPONDING", "cognition", { evidenceRefs: ["ev-1"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("illegal-transition");
    expect(a.currentState()).toBe("OFFLINE");
  });

  it.each(["RESPONDING", "EXECUTING"] )(
    "rejects %s without evidenceRefs",
    (state) => {
      const a = makeAdapter();
      a.transition("IDLE", "system");
      // Walk a legal path to the evidence-requiring state.
      const path = {
        RESPONDING: ["LISTENING", "THINKING"],
        EXECUTING: ["LISTENING", "THINKING"],
      };
      for (const step of path[state]) {
        const r = a.transition(step , "system");
        expect(r.ok).toBe(true);
      }
      const denied = a.transition(state, "system");
      expect(denied.ok).toBe(false);
      if (!denied.ok) expect(denied.kind).toBe("evidence-required");
      expect(a.currentState()).not.toBe(state);
    },
  );

  it("admits RESPONDING/EXECUTING when evidenceRefs are supplied", () => {
    const a = makeAdapter();
    a.transition("IDLE", "system");
    a.transition("LISTENING", "voice");
    a.transition("THINKING", "cognition");
    const r = a.transition("RESPONDING", "cognition", {
      evidenceRefs: ["ev-real-1"],
    });
    expect(r.ok).toBe(true);
    const exec = a.transition("EXECUTING", "system", {
      evidenceRefs: ["ev-real-1"],
    });
    expect(exec.ok).toBe(true);
    expect(a.currentState()).toBe("EXECUTING");
  });

  it("emits validated, frozen AgentStateEvents to subscribers", () => {
    const a = makeAdapter();
    const seen = [];
    a.subscribeState((e) => {
      seen.push(e.state);
      expect(Object.isFrozen(e)).toBe(true);
    });
    a.transition("IDLE", "system");
    a.transition("LISTENING", "voice");
    expect(seen).toEqual(["IDLE", "LISTENING"]);
    expect(a.stateEvents).toHaveLength(2);
  });

  it("K-01: reports committed transition when a subscriber throws", () => {
    const a = makeAdapter();
    a.subscribeState((e) => {
      if (e.state === "LISTENING") throw new Error("subscriber boom");
    });
    const r = a.transition("IDLE", "system");
    expect(r.ok).toBe(true);
    const committed = a.transition("LISTENING", "voice");
    // The transition committed; notification failure is surfaced, not
    // misreported as a rejected transition.
    expect(committed.ok).toBe(true);
    if (committed.ok) {
      expect(committed.value.state).toBe("LISTENING");
      expect(committed.notificationError).toContain("subscriber boom");
    }
    expect(a.currentState()).toBe("LISTENING");
    expect(_optionalChain([a, 'access', _ => _.stateEvents, 'access', _2 => _2.at, 'call', _3 => _3(-1), 'optionalAccess', _4 => _4.state])).toBe("LISTENING");
  });

  it("K-01 reentrant: nested transition during notification does not corrupt commit detection", () => {
    const a = makeAdapter();
    let threw = false;
    a.subscribeState((e) => {
      if (e.state === "IDLE" && !threw) {
        threw = true;
        // Nested transition commits LISTENING while the outer IDLE
        // event is still being delivered.
        const nested = a.transition("LISTENING", "voice");
        expect(nested.ok).toBe(true);
        throw new Error("outer subscriber boom");
      }
    });
    const r = a.transition("IDLE", "system");
    // Outer IDLE committed; the nested LISTENING also committed. The
    // adapter must report the OUTER event, not misclassify as failure
    // just because currentState() is now LISTENING.
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.state).toBe("IDLE");
      expect(r.value.previousState).toBe("OFFLINE");
      expect(r.notificationError).toContain("outer subscriber boom");
    }
    expect(a.currentState()).toBe("LISTENING");
    expect(a.stateEvents.map((e) => e.state)).toEqual(["IDLE", "LISTENING"]);
  });
});

describe("LocalEILAdapter — interaction ingest", () => {
  it("routes a valid authorized event to subscribers", () => {
    const a = makeAdapter();
    const received = [];
    a.onInteraction("voice", (e) => received.push(e));
    const r = a.ingestInteractionEvent(validInteractionEvent());
    expect(r.ok).toBe(true);
    expect(received).toHaveLength(1);
  });

  it("rejects malformed payloads as invalid-payload", () => {
    const a = makeAdapter();
    const r = a.ingestInteractionEvent({ eventId: "not-a-uuid" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("invalid-payload");
  });

  it("blocks unauthorized events and classifies them", () => {
    const a = makeAdapter();
    const received = [];
    a.onInteraction("*", (e) => received.push(e));
    const r = a.ingestInteractionEvent(
      validInteractionEvent({ authorized: false, impactLevel: "HIGH" }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("unauthorized");
    expect(received).toHaveLength(0);
    expect(a.blockedEvents).toHaveLength(1);
  });

  it("deduplicates redelivered eventIds", () => {
    const a = makeAdapter();
    const event = validInteractionEvent();
    expect(a.ingestInteractionEvent(event).ok).toBe(true);
    const second = a.ingestInteractionEvent(event);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.kind).toBe("duplicate");
    expect(a.duplicateEventIds).toContain(event.eventId);
  });

  it("rejects stale events older than the last accepted on the channel", () => {
    const a = makeAdapter();
    expect(
      a.ingestInteractionEvent(
        validInteractionEvent({ timestamp: "2026-11-22T12:00:10.000Z" }),
      ).ok,
    ).toBe(true);
    const stale = a.ingestInteractionEvent(
      validInteractionEvent({ timestamp: "2026-11-22T12:00:05.000Z" }),
    );
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.kind).toBe("stale");
  });

  it("does not apply staleness across different channels", () => {
    const a = makeAdapter();
    expect(
      a.ingestInteractionEvent(
        validInteractionEvent({ channel: "voice", timestamp: "2026-11-22T12:00:10.000Z" }),
      ).ok,
    ).toBe(true);
    // gesture channel has no prior timestamp — an earlier absolute time is fine
    const r = a.ingestInteractionEvent(
      validInteractionEvent({ channel: "gesture", timestamp: "2026-11-22T12:00:01.000Z" }),
    );
    expect(r.ok).toBe(true);
  });

  it("K-02: handler failure marks event seen — retry is duplicate, not redelivery", () => {
    const a = makeAdapter();
    const received = [];
    a.onInteraction("voice", () => {
      throw new Error("handler boom");
    });
    a.onInteraction("voice", (e) => received.push(e.eventId));
    const event = validInteractionEvent();
    const first = a.ingestInteractionEvent(event);
    expect(first.ok).toBe(false);
    if (!first.ok) expect(first.kind).toBe("handler-error");
    // Bus attempted every handler before throwing: the non-throwing
    // subscriber still observed the event exactly once.
    expect(received).toEqual([event.eventId]);
    // Re-ingesting the same eventId is a duplicate — no implicit retry.
    const retry = a.ingestInteractionEvent(event);
    expect(retry.ok).toBe(false);
    if (!retry.ok) expect(retry.kind).toBe("duplicate");
    expect(received).toEqual([event.eventId]);
  });

  it("K-03: rejects timestamps beyond the future-skew allowance", () => {
    const a = makeAdapter();
    const farFuture = a.ingestInteractionEvent(
      validInteractionEvent({ timestamp: "2027-01-01T00:00:00.000Z" }),
    );
    expect(farFuture.ok).toBe(false);
    if (!farFuture.ok) expect(farFuture.kind).toBe("future-timestamp");
    // Within the 5-minute skew allowance the same event is accepted.
    const withinSkew = a.ingestInteractionEvent(
      validInteractionEvent({ timestamp: "2026-11-22T12:04:00.000Z" }),
    );
    expect(withinSkew.ok).toBe(true);
    // And a legitimate later event is not silenced by the rejected one.
    const later = a.ingestInteractionEvent(
      validInteractionEvent({ timestamp: "2026-11-22T12:05:00.000Z" }),
    );
    expect(later.ok).toBe(true);
  });

  it("K-03 follow-up: unparseable adapter clock fails closed", () => {
    const a = new LocalEILAdapter({
      agentId: "holokai-test",
      createEventId: nextId,
      now: () => "not-a-timestamp",
    });
    const r = a.ingestInteractionEvent(validInteractionEvent());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("clock-error");
  });
});

describe("LocalEILAdapter — gesture mapping", () => {
  it.each([
    ["open_palm", "interaction.activate", "LOW"],
    ["closed_fist", "interaction.pause", "LOW"],
    ["index_point", "select.entity", "MEDIUM"],
    ["two_finger", "navigate.interface", "LOW"],
    ["palm_rotation", "rotate.scene", "LOW"],
    ["both_hands_open", "expand.spatial-interface", "MEDIUM"],
  ] )("maps %s → %s (%s)", (gesture, intent, impact) => {
    const a = makeAdapter();
    const r = a.gestureToInteraction(validGestureEvent(gesture));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.intent).toBe(intent);
      expect(r.value.impactLevel).toBe(impact);
      expect(r.value.channel).toBe("gesture");
    }
  });

  it("cannot produce HIGH impact for any registered gesture", () => {
    const a = makeAdapter();
    for (const gesture of [
      "open_palm",
      "closed_fist",
      "index_point",
      "two_finger",
      "palm_rotation",
      "both_hands_open",
    ]) {
      const r = a.gestureToInteraction(validGestureEvent(gesture));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.impactLevel).not.toBe("HIGH");
    }
  });

  it("rejects unregistered gestures", () => {
    const a = makeAdapter();
    const r = a.gestureToInteraction(validGestureEvent("SHOOT_LASERS"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("invalid-payload");
  });

  it("marks gesture events unauthorized when interaction is not allowed", () => {
    const a = makeAdapter();
    const received = [];
    a.onInteraction("gesture", (e) => received.push(e));
    const r = a.gestureToInteraction(
      validGestureEvent("index_point", { interactionAllowed: false }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("unauthorized");
    expect(received).toHaveLength(0);
  });

  it("emits only declared payload fields — no arbitrary keys", () => {
    const a = makeAdapter();
    const r = a.gestureToInteraction(validGestureEvent("open_palm"));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(_nullishCoalesce(r.value.payload, () => ( {}))).sort()).toEqual([
        "bimanual",
        "confidence",
        "durationMs",
        "gesture",
      ]);
    }
  });
});

describe("LocalEILAdapter — validation-only boundaries", () => {
  it("validates a PermissionSnapshot without assuming permission", () => {
    const a = makeAdapter();
    const ok = a.validatePermissionSnapshot({
      camera: "GRANTED",
      microphone: "DENIED",
      interactionAllowed: false,
      updatedAt: NOW,
    });
    expect(ok.ok).toBe(true);
    const bad = a.validatePermissionSnapshot({ camera: "GRANTED" });
    expect(bad.ok).toBe(false);
  });

  it("rejects evidence references without provenance for ESTABLISHED", () => {
    const a = makeAdapter();
    const r = a.validateEvidenceReference({
      evidenceId: nextId(),
      entityId: "repo-1",
      source: "github",
      epistemicStatus: "ESTABLISHED",
      verifiedAt: NOW,
      // no url/commitSha/filePath/citation
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("invalid-payload");
  });

  it("parses a valid empty bundle with correct derived fields", () => {
    const a = makeAdapter();
    // lowestStatus([]) === "SPECULATIVE" → requiresDisclosure must be
    // true; containsFictional false. The adapter validates, never
    // invents references.
    const r = a.validateEvidenceBundle({
      correlationId: "c1",
      references: [],
      lowestEpistemicStatus: "SPECULATIVE",
      containsFictional: false,
      requiresDisclosure: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.references).toHaveLength(0);
      expect(r.value.lowestEpistemicStatus).toBe("SPECULATIVE");
      expect(r.value.containsFictional).toBe(false);
      expect(r.value.requiresDisclosure).toBe(true);
    }
  });

  it("rejects a bundle whose derived flags contradict its references", () => {
    const a = makeAdapter();
    // FICTIONAL reference present but containsFictional: false —
    // disclosure spoofing must fail closed.
    const r = a.validateEvidenceBundle({
      correlationId: "c2",
      references: [
        {
          evidenceId: nextId(),
          entityId: "entity-1",
          source: "synthetic",
          epistemicStatus: "FICTIONAL",
        },
      ],
      lowestEpistemicStatus: "FICTIONAL",
      containsFictional: false,
      requiresDisclosure: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("invalid-payload");
  });
});
