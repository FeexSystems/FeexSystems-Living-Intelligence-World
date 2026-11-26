import { describe, it, expect } from "vitest";
import {
  HUMANOID_PRESENTATION_STATES,
  resolveEvidenceStatus,
  resolvePresentationState,
  isHumanoidPresentationState,

} from "../renderer/presentation-state";
import { AGENT_STATES, } from "../contracts/agent-state";

describe("HUMANOID_PRESENTATION_STATES", () => {
  it("contains exactly the 9 canonical states", () => {
    expect(HUMANOID_PRESENTATION_STATES).toHaveLength(9);
    expect(new Set(HUMANOID_PRESENTATION_STATES).size).toBe(9);
  });
});

describe("resolveEvidenceStatus", () => {
  it("passes through VERIFIED and SIMULATED", () => {
    expect(resolveEvidenceStatus("VERIFIED")).toBe("VERIFIED");
    expect(resolveEvidenceStatus("SIMULATED")).toBe("SIMULATED");
  });

  it("fails closed to UNAVAILABLE for missing or invalid values", () => {
    for (const v of [undefined, null, "", "LIVE", "VERIFIED ", 0, {}]) {
      expect(resolveEvidenceStatus(v)).toBe("UNAVAILABLE");
    }
  });
});

describe("resolvePresentationState — agent-driven mapping", () => {
  const cases = [
    ["IDLE", "IDLE"],
    ["LISTENING", "LISTENING"],
    ["PERCEIVING", "PERCEIVING"],
    ["THINKING", "THINKING"],
    ["RESPONDING", "THINKING"], // no response-generation pose; SPEAKING needs confirmed playback
    ["SPEAKING", "SPEAKING"],
    ["EXECUTING", "GESTURING"],
    ["ERROR", "UNAVAILABLE"],
    ["OFFLINE", "UNAVAILABLE"],
  ];

  it.each(cases)("%s → %s", (agent, expected) => {
    expect(resolvePresentationState(agent)).toBe(expected);
  });

  it("covers every AgentState", () => {
    for (const s of AGENT_STATES) {
      expect(isHumanoidPresentationState(resolvePresentationState(s))).toBe(true);
    }
  });
});

describe("resolvePresentationState — intents", () => {
  it("IDLE + aware intent → AWARE", () => {
    expect(resolvePresentationState("IDLE", { kind: "aware" })).toBe("AWARE");
  });

  it("IDLE + inspecting intent with systemId → INSPECTING", () => {
    expect(
      resolvePresentationState("IDLE", { kind: "inspecting", systemId: "sys-1" }),
    ).toBe("INSPECTING");
  });

  it("inspecting without systemId fails safe to IDLE", () => {
    expect(
      resolvePresentationState("IDLE", { kind: "inspecting", systemId: "" }),
    ).toBe("IDLE");
  });

  it("agent-driven states override ambient intents", () => {
    const intent = { kind: "aware" };
    expect(resolvePresentationState("SPEAKING", intent)).toBe("SPEAKING");
    expect(resolvePresentationState("THINKING", intent)).toBe("THINKING");
    expect(resolvePresentationState("LISTENING", intent)).toBe("LISTENING");
  });

  it("ERROR/OFFLINE override every intent — fail closed", () => {
    for (const intent of [
      { kind: "aware" },
      { kind: "gesturing" },
      { kind: "inspecting", systemId: "x" },
    ] ) {
      expect(resolvePresentationState("ERROR", intent)).toBe("UNAVAILABLE");
      expect(resolvePresentationState("OFFLINE", intent)).toBe("UNAVAILABLE");
    }
  });

  it("null/undefined agent state → UNAVAILABLE", () => {
    expect(resolvePresentationState(null)).toBe("UNAVAILABLE");
    expect(resolvePresentationState(undefined)).toBe("UNAVAILABLE");
  });
});

describe("isHumanoidPresentationState", () => {
  it("accepts all 9 states, rejects others", () => {
    for (const s of HUMANOID_PRESENTATION_STATES) {
      expect(isHumanoidPresentationState(s)).toBe(true);
    }
    for (const bad of ["LIVE", "idle", "", 42, null, {}]) {
      expect(isHumanoidPresentationState(bad)).toBe(false);
    }
  });
});
