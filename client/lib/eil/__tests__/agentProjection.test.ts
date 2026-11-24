import { describe, expect, it } from "vitest";
import { planAgentTransitions } from "../agentProjection";
import { isValidAgentStateTransition, type AgentState } from "../../../../packages/feex-eil/contracts/agent-state";
import type { VoiceStatus } from "../../hooks/useSpeechNavigation";

function assertLegalPath(from: AgentState, steps: { to: AgentState }[]) {
  let state = from;
  for (const step of steps) {
    expect(isValidAgentStateTransition(state, step.to)).toBe(true);
    state = step.to;
  }
}

describe("planAgentTransitions", () => {
  it("boots OFFLINE → IDLE on any settled signal", () => {
    const steps = planAgentTransitions("OFFLINE", { speechStatus: "idle", isLoading: false });
    expect(steps).toEqual([{ to: "IDLE", source: "system", reason: "boot" }]);
  });

  it("maps real listening to LISTENING", () => {
    const steps = planAgentTransitions("IDLE", { speechStatus: "listening", isLoading: false });
    expect(steps).toEqual([{ to: "LISTENING", source: "voice" }]);
    assertLegalPath("IDLE", steps);
  });

  it("returns LISTENING to IDLE when speech settles", () => {
    const steps = planAgentTransitions("LISTENING", { speechStatus: "idle", isLoading: false });
    expect(steps).toEqual([{ to: "IDLE", source: "system", reason: "input-settled" }]);
  });

  it("routes a text query IDLE → PERCEIVING → THINKING", () => {
    const steps = planAgentTransitions("IDLE", { speechStatus: "idle", isLoading: true });
    expect(steps.map((s) => s.to)).toEqual(["PERCEIVING", "THINKING"]);
    assertLegalPath("IDLE", steps);
  });

  it("routes voice-in-flight LISTENING → THINKING on submit", () => {
    const steps = planAgentTransitions("LISTENING", { speechStatus: "idle", isLoading: true });
    expect(steps).toEqual([{ to: "THINKING", source: "cognition" }]);
  });

  it("completes THINKING → IDLE when loading finishes", () => {
    const steps = planAgentTransitions("THINKING", { speechStatus: "idle", isLoading: false });
    expect(steps).toEqual([{ to: "IDLE", source: "system", reason: "input-settled" }]);
  });

  it("maps denied/error speech to ERROR", () => {
    for (const status of ["denied", "error"] as VoiceStatus[]) {
      const steps = planAgentTransitions("IDLE", { speechStatus: status, isLoading: false });
      expect(steps[0]?.to).toBe("ERROR");
      assertLegalPath("IDLE", steps);
    }
  });

  it("recovers ERROR → IDLE before planning further", () => {
    const steps = planAgentTransitions("ERROR", { speechStatus: "idle", isLoading: false });
    expect(steps).toEqual([{ to: "IDLE", source: "system", reason: "error-recovery" }]);
  });

  it("typed query after microphone denial still reaches THINKING", () => {
    // Codex P2: ERROR must not strand a subsequent Navigator request.
    const steps = planAgentTransitions("ERROR", { speechStatus: "idle", isLoading: true });
    expect(steps.map((s) => s.to)).toEqual(["IDLE", "PERCEIVING", "THINKING"]);
    assertLegalPath("ERROR", steps);
  });

  it("treats transient 'processing' status as a settled signal", () => {
    const steps = planAgentTransitions("LISTENING", {
      speechStatus: "processing",
      isLoading: false,
    });
    expect(steps).toEqual([{ to: "IDLE", source: "system", reason: "input-settled" }]);
  });

  it("never plans evidence-required or unreachable states without session evidence", () => {
    const allStates: AgentState[] = [
      "IDLE", "LISTENING", "PERCEIVING", "THINKING", "RESPONDING",
      "SPEAKING", "EXECUTING", "ERROR", "OFFLINE",
    ];
    const statuses: VoiceStatus[] = ["idle", "listening", "processing", "unsupported", "denied", "error"];
    for (const state of allStates) {
      for (const speechStatus of statuses) {
        for (const isLoading of [false, true]) {
          const steps = planAgentTransitions(state, { speechStatus, isLoading });
          for (const step of steps) {
            expect(["RESPONDING", "EXECUTING", "SPEAKING"]).not.toContain(step.to);
          }
          assertLegalPath(state, steps);
        }
      }
    }
  });
});

describe("planAgentTransitions — Phase 5 HoloKai session projection", () => {
  const refs = ["FeexSystems/RepoA", "0123456789abcdef"];

  it("enters RESPONDING from THINKING only with real evidence refs", () => {
    const steps = planAgentTransitions("THINKING", {
      speechStatus: "idle",
      isLoading: false,
      evidenceRefs: refs,
    });
    expect(steps).toEqual([
      {
        to: "RESPONDING",
        source: "cognition",
        reason: "navigator-evidence",
        evidenceRefs: refs,
      },
    ]);
    assertLegalPath("THINKING", steps);
  });

  it("does not enter RESPONDING when evidence is absent or empty", () => {
    for (const evidenceRefs of [undefined, [], ["  "]]) {
      const steps = planAgentTransitions("THINKING", {
        speechStatus: "idle",
        isLoading: false,
        evidenceRefs,
      });
      expect(steps.map((s) => s.to)).toEqual(["IDLE"]);
    }
  });

  it("does not enter RESPONDING while the user is listening", () => {
    const steps = planAgentTransitions("THINKING", {
      speechStatus: "listening",
      isLoading: false,
      evidenceRefs: refs,
    });
    expect(steps.map((s) => s.to)).toEqual(["IDLE"]);
  });

  it("reaches SPEAKING from RESPONDING only on confirmed playback", () => {
    const steps = planAgentTransitions("RESPONDING", {
      speechStatus: "idle",
      isLoading: false,
      playbackConfirmed: true,
    });
    expect(steps).toEqual([
      { to: "SPEAKING", source: "voice", reason: "playback-confirmed" },
    ]);
    assertLegalPath("RESPONDING", steps);
  });

  it("plans THINKING → RESPONDING → SPEAKING atomically when playback is confirmed with evidence", () => {
    const steps = planAgentTransitions("THINKING", {
      speechStatus: "idle",
      isLoading: false,
      playbackConfirmed: true,
      evidenceRefs: refs,
    });
    expect(steps.map((s) => s.to)).toEqual(["RESPONDING", "SPEAKING"]);
    expect(steps[0].evidenceRefs).toEqual(refs);
    assertLegalPath("THINKING", steps);
  });

  it("never reaches SPEAKING without evidence, even with confirmed playback", () => {
    const steps = planAgentTransitions("THINKING", {
      speechStatus: "idle",
      isLoading: false,
      playbackConfirmed: true,
    });
    expect(steps.map((s) => s.to)).toEqual(["IDLE"]);
    assertLegalPath("THINKING", steps);
  });

  it("has no honest path to SPEAKING from IDLE even with confirmed playback", () => {
    const steps = planAgentTransitions("IDLE", {
      speechStatus: "idle",
      isLoading: false,
      playbackConfirmed: true,
      evidenceRefs: refs,
    });
    expect(steps).toEqual([]);
  });

  it("holds SPEAKING while playback is confirmed", () => {
    const steps = planAgentTransitions("SPEAKING", {
      speechStatus: "idle",
      isLoading: false,
      playbackConfirmed: true,
    });
    expect(steps).toEqual([]);
  });

  it("settles SPEAKING → IDLE when playback ends", () => {
    const steps = planAgentTransitions("SPEAKING", {
      speechStatus: "idle",
      isLoading: false,
      playbackConfirmed: false,
    });
    expect(steps).toEqual([
      { to: "IDLE", source: "system", reason: "playback-ended" },
    ]);
    assertLegalPath("SPEAKING", steps);
  });

  it("settles RESPONDING → IDLE when no playback was confirmed (muted/unsupported)", () => {
    const steps = planAgentTransitions("RESPONDING", {
      speechStatus: "idle",
      isLoading: false,
      playbackConfirmed: false,
    });
    expect(steps).toEqual([
      { to: "IDLE", source: "system", reason: "response-settled" },
    ]);
    assertLegalPath("RESPONDING", steps);
  });
});
