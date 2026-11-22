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

  it("never plans evidence-required or unreachable states", () => {
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
