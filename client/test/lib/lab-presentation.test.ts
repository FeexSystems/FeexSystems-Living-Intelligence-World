import { describe, it, expect } from "vitest";
import {
  resolveLabPresentation,
  clipLikelyMissing,
  PRESENTATION_TO_CLIP,
  SYNTHETIC_GL_B_CLIPS,
} from "@/lib/lab/lab-presentation";
import {
  resolvePresentationState,
  HUMANOID_PRESENTATION_STATES,
} from "../../../packages/feex-eil/renderer/presentation-state";
import type { AgentState } from "../../../packages/feex-eil/contracts/agent-state";

const AGENT_STATES: AgentState[] = [
  "IDLE", "LISTENING", "PERCEIVING", "THINKING", "RESPONDING",
  "SPEAKING", "EXECUTING", "ERROR", "OFFLINE",
];

describe("lab-presentation resolver", () => {
  it("covers every presentation state with a contract clip", () => {
    for (const s of HUMANOID_PRESENTATION_STATES) {
      expect(PRESENTATION_TO_CLIP[s]).toBeTruthy();
    }
  });

  it("is fail-closed: ERROR and OFFLINE always resolve UNAVAILABLE", () => {
    for (const s of ["ERROR", "OFFLINE"] as AgentState[]) {
      const r = resolveLabPresentation({ agentState: s, intent: { kind: "aware" } });
      expect(r.presentation).toBe("UNAVAILABLE");
      expect(r.clip).toBe("Unavailable");
    }
  });

  it("no agent state → UNAVAILABLE with diagnostic", () => {
    const r = resolveLabPresentation({ intent: { kind: "aware" } });
    expect(r.presentation).toBe("UNAVAILABLE");
    expect(r.clip).toBe("Unavailable");
    expect(r.diagnostic).toContain("NO_AGENT_STATE");
  });

  it("agent-driven states beat intents (voice/cognition precedence)", () => {
    const r = resolveLabPresentation({
      agentState: "SPEAKING",
      intent: { kind: "aware" },
    });
    expect(r.presentation).toBe("SPEAKING");
    expect(r.clip).toBe("Speak");
  });

  it("IDLE + aware intent → AWARE → Aware clip", () => {
    const r = resolveLabPresentation({
      agentState: "IDLE",
      intent: { kind: "aware" },
    });
    expect(r.presentation).toBe("AWARE");
    expect(r.clip).toBe("Aware");
  });

  it("EXECUTING maps through GESTURING → Explain clip (restricted)", () => {
    const r = resolveLabPresentation({ agentState: "EXECUTING" });
    expect(r.presentation).toBe("GESTURING");
    expect(r.clip).toBe("Explain");
  });

  it("inspecting intent requires systemId", () => {
    const r = resolveLabPresentation({
      agentState: "IDLE",
      intent: { kind: "inspecting", systemId: "" },
    });
    expect(r.presentation).toBe("IDLE");
    expect(r.clip).toBe("Idle");
  });

  it("every AgentState resolves without throwing", () => {
    for (const s of AGENT_STATES) {
      const r = resolveLabPresentation({ agentState: s });
      expect(r.clip).toBeTruthy();
    }
  });

  it("presentation resolution matches upstream contract exactly", () => {
    for (const s of AGENT_STATES) {
      expect(resolveLabPresentation({ agentState: s }).presentation)
        .toBe(resolvePresentationState(s));
    }
  });
});

describe("clipLikelyMissing", () => {
  it("flags contract clips absent from the synthetic GLB", () => {
    expect(clipLikelyMissing("Think", SYNTHETIC_GL_B_CLIPS)).toBe(true);
    expect(clipLikelyMissing("Idle", SYNTHETIC_GL_B_CLIPS)).toBe(false);
    expect(clipLikelyMissing("Aware", SYNTHETIC_GL_B_CLIPS)).toBe(false);
  });
});
