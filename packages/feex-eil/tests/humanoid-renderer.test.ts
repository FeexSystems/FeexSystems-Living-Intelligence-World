import { describe, expect, it } from "vitest";
import { Group, Object3D } from "three";
import {
  adaptAgentStateEvent,
  isNewerAgentStateEvent,
  mapAgentStateToHumanoid,
} from "../renderer/HumanoidStateAdapter";
import {
  DEFAULT_HUMANOID_RIG_MAP,
  resolveHumanoidRig,
} from "../renderer/HumanoidRig";
import type { AgentStateEvent } from "../contracts/agent-state";

const event = (
  state: AgentStateEvent["state"],
  previousState: AgentStateEvent["previousState"],
  evidenceRefs: string[] = [],
  timestamp = "2026-11-19T12:00:00.000Z",
  agentId = "test-agent",
): AgentStateEvent => ({
  eventId: "00000000-0000-4000-8000-000000000001",
  agentId,
  state,
  previousState,
  timestamp,
  source: "system",
  evidenceRefs,
});

describe("Humanoid state adapter", () => {
  it("maps every canonical agent state without inventing states", () => {
    const cases: Array<[AgentStateEvent["state"], AgentStateEvent["previousState"], string]> = [
      ["IDLE", "OFFLINE", "idle"],
      ["LISTENING", "IDLE", "listening"],
      ["PERCEIVING", "IDLE", "perceiving"],
      ["THINKING", "LISTENING", "thinking"],
      ["RESPONDING", "THINKING", "responding"],
      ["SPEAKING", "RESPONDING", "speaking"],
      ["EXECUTING", "THINKING", "executing"],
      ["ERROR", "IDLE", "error"],
      ["OFFLINE", "ERROR", "offline"],
    ];

    for (const [state, previous, motion] of cases) {
      const result = adaptAgentStateEvent(
        event(state, previous, state === "RESPONDING" || state === "EXECUTING" ? ["evidence-1"] : []),
      );
      expect(result.state).toBe(state);
      expect(result.motion).toBe(motion);
    }
  });

  it("validates direct mapper calls instead of trusting the TypeScript type", () => {
    expect(() => mapAgentStateToHumanoid(event("THINKING", "IDLE"))).toThrow(/Invalid agent state transition/);
    expect(() => mapAgentStateToHumanoid(event("RESPONDING", "THINKING"))).toThrow(/requires non-empty evidenceRefs/);
  });

  it("maps distinct state indicators, including offline and response", () => {
    expect(adaptAgentStateEvent(event("PERCEIVING", "IDLE")).indicator).toBe("perception");
    expect(adaptAgentStateEvent(event("RESPONDING", "THINKING", ["evidence-1"])).indicator).toBe("response");
    expect(adaptAgentStateEvent(event("ERROR", "IDLE")).indicator).toBe("error");
    expect(adaptAgentStateEvent(event("OFFLINE", "ERROR")).indicator).toBe("offline");
  });

  it("marks offline as static and idle as animated", () => {
    expect(mapAgentStateToHumanoid(event("OFFLINE", "ERROR")).animated).toBe(false);
    expect(mapAgentStateToHumanoid(event("IDLE", "OFFLINE")).animated).toBe(true);
  });

  it("rejects forged transitions before they can drive presentation", () => {
    expect(() => adaptAgentStateEvent(event("THINKING", "IDLE"))).toThrow(/Invalid agent state transition/);
  });

  it("rejects responding and executing without evidence references", () => {
    expect(() => adaptAgentStateEvent(event("RESPONDING", "THINKING"))).toThrow(/requires non-empty evidenceRefs/);
    expect(() => adaptAgentStateEvent(event("EXECUTING", "THINKING"))).toThrow(/requires non-empty evidenceRefs/);
  });

  it("rejects malformed event identifiers", () => {
    expect(() =>
      adaptAgentStateEvent({ ...event("LISTENING", "IDLE"), eventId: "not-a-uuid" }),
    ).toThrow(/contract validation failed/);
  });

  it("rejects older or equal-timestamp events for the same agent", () => {
    const current = event("THINKING", "LISTENING", [], "2026-11-19T12:00:02.000Z");
    const older = event("LISTENING", "IDLE", [], "2026-11-19T12:00:01.000Z");
    const sameTime = event("LISTENING", "IDLE", [], "2026-11-19T12:00:02.000Z");
    expect(isNewerAgentStateEvent(older, current)).toBe(false);
    expect(isNewerAgentStateEvent(sameTime, current)).toBe(false);
    expect(isNewerAgentStateEvent(event("RESPONDING", "THINKING", ["evidence-1"], "2026-11-19T12:00:03.000Z"), current)).toBe(true);
  });

  it("starts a fresh event stream when the agent identity changes", () => {
    const current = event("THINKING", "LISTENING", [], "2026-11-19T12:00:02.000Z", "agent-a");
    const nextAgent = event("IDLE", "OFFLINE", [], "2026-11-19T11:00:00.000Z", "agent-b");
    expect(isNewerAgentStateEvent(nextAgent, current)).toBe(true);
  });
});

describe("Humanoid rig resolver", () => {
  it("resolves configured nodes and leaves absent optional controls undefined", () => {
    const root = new Group();
    const head = new Object3D();
    head.name = "HeadNode";
    root.add(head);

    const rig = resolveHumanoidRig(root, { head: "HeadNode", leftArm: "MissingArm" });
    expect(rig.root).toBe(root);
    expect(rig.head).toBe(head);
    expect(rig.leftArm).toBeUndefined();
  });

  it("uses a configurable map instead of assuming model-specific bone names", () => {
    expect(DEFAULT_HUMANOID_RIG_MAP.head).toBe("Head");
    const root = new Group();
    const customHead = new Object3D();
    customHead.name = "Head_06";
    root.add(customHead);

    expect(resolveHumanoidRig(root, { head: "Head_06" }).head).toBe(customHead);
  });
});
