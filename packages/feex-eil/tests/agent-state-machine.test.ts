import { describe, expect, it } from "vitest";
import { AgentStateMachine } from "../interaction/agent-state-machine";
import type { AgentStateEvent } from "../contracts/agent-state";

let counter = 0;
const ids = () => `evt-${++counter}`;
const clock = () => "2026-11-18T12:00:00.000Z";

function makeMachine(initialState: ConstructorParameters<typeof AgentStateMachine>[0]["initialState"] = "OFFLINE") {
  return new AgentStateMachine({
    agentId: "holokai-01",
    initialState,
    createEventId: ids,
    now: clock,
  });
}

describe("AgentStateMachine", () => {
  it("boots OFFLINE by default and cannot jump to SPEAKING", () => {
    const m = makeMachine();
    expect(m.currentState).toBe("OFFLINE");
    expect(m.transition("SPEAKING", { source: "voice" })).toBeNull();
    expect(m.currentState).toBe("OFFLINE");
    expect(m.events).toHaveLength(0);
  });

  it("walks a valid conversational path and emits validated events", () => {
    const m = makeMachine("IDLE");
    const path = [
      ["LISTENING", "voice"],
      ["THINKING", "cognition"],
      ["RESPONDING", "cognition"],
      ["SPEAKING", "voice"],
      ["IDLE", "system"],
    ] as const;
    for (const [to, source] of path) {
      const ev = m.transition(to, { source, evidenceRefs: ["ev-x"] });
      expect(ev).not.toBeNull();
      expect(ev!.state).toBe(to);
      expect(ev!.evidenceRefs).toEqual(["ev-x"]);
    }
    expect(m.currentState).toBe("IDLE");
    expect(m.events).toHaveLength(5);
    // Every event is a legal transition per the contract table.
    for (const e of m.events) {
      expect(e.previousState).not.toBe(e.state);
    }
  });

  it("rejects self-transitions and illegal jumps without emitting", () => {
    const m = makeMachine("LISTENING");
    expect(m.transition("LISTENING", { source: "system" })).toBeNull();
    expect(m.transition("EXECUTING", { source: "robotics" })).toBeNull();
    expect(m.events).toHaveLength(0);
  });

  it("supports ERROR and OFFLINE recovery paths", () => {
    const m = makeMachine("THINKING");
    expect(m.transition("ERROR", { source: "cognition", reason: "provider timeout" })?.state).toBe("ERROR");
    expect(m.transition("OFFLINE", { source: "system" })?.state).toBe("OFFLINE");
    expect(m.transition("IDLE", { source: "system" })?.state).toBe("IDLE");
    expect(m.transition("RESPONDING", { source: "cognition" })).toBeNull();
  });

  it("round-trips through fromEvents and rejects forged logs", () => {
    const m = makeMachine("IDLE");
    m.transition("LISTENING", { source: "voice", correlationId: "c-1" });
    m.transition("THINKING", { source: "cognition" });
    const log = [...m.events];

    const restored = AgentStateMachine.fromEvents("holokai-01", log, {
      createEventId: ids,
      now: clock,
    });
    expect(restored.currentState).toBe("THINKING");
    expect(restored.events.map((e) => e.eventId)).toEqual(log.map((e) => e.eventId));

    // Forged: skip a state — IDLE → THINKING is legal? No: previousState is
    // recorded in the event, and fromEvents replays transitions from current.
    const forged: AgentStateEvent[] = [
      { ...log[0]!, state: "EXECUTING" },
    ];
    expect(() =>
      AgentStateMachine.fromEvents("holokai-01", forged, { createEventId: ids, now: clock }),
    ).toThrow();
  });

  it("rejects events belonging to a different agent", () => {
    const m = makeMachine("IDLE");
    m.transition("LISTENING", { source: "voice" });
    const foreign = m.events.map((e) => ({ ...e, agentId: "other-agent" }));
    expect(() =>
      AgentStateMachine.fromEvents("holokai-01", foreign, { createEventId: ids, now: clock }),
    ).toThrow(/agentId/);
  });
});
