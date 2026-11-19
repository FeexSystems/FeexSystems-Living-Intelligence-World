import { describe, expect, it, vi } from "vitest";
import { AgentStateMachineImpl } from "../interaction/agent-state-machine";
import { EventBus } from "../interaction/EventBus";
import type { AgentStateEvent } from "../contracts/agent-state";
import type { InteractionEvent } from "../contracts/interaction-event";

let counter = 0;
const ids = () => `evt-${++counter}`;
const clock = () => "2026-11-18T12:00:00.000Z";

function makeMachine(
  initialState?: ConstructorParameters<typeof AgentStateMachineImpl>[0]["initialState"],
) {
  return new AgentStateMachineImpl({
    agentId: "holokai-01",
    initialState,
    createEventId: ids,
    now: clock,
  });
}

describe("AgentStateMachineImpl", () => {
  it("boots OFFLINE by default and throws on illegal jumps", () => {
    const m = makeMachine();
    expect(m.currentState()).toBe("OFFLINE");
    expect(() => m.transition("SPEAKING", "voice")).toThrow(/Invalid AgentState transition/);
    expect(m.currentState()).toBe("OFFLINE");
    expect(m.events).toHaveLength(0);
  });

  it("walks valid paths per VALID_TRANSITIONS and notifies subscribers", () => {
    const m = makeMachine("IDLE");
    const seen: string[] = [];
    const unsub = m.subscribe((e) => seen.push(e.state));

    m.transition("LISTENING", "voice");
    m.transition("THINKING", "cognition", { evidenceRefs: ["ev-1"] });
    m.transition("RESPONDING", "cognition", { evidenceRefs: ["ev-1"] });
    m.transition("SPEAKING", "voice");
    m.transition("IDLE", "system");

    expect(m.currentState()).toBe("IDLE");
    expect(m.events).toHaveLength(5);
    expect(seen).toEqual(["LISTENING", "THINKING", "RESPONDING", "SPEAKING", "IDLE"]);
    unsub();
    m.transition("PERCEIVING", "perception");
    expect(seen).toHaveLength(5); // unsubscribed — no new notifications
  });

  it("blocks RESPONDING and EXECUTING without evidenceRefs", () => {
    const m = makeMachine("THINKING");
    expect(() => m.transition("RESPONDING", "cognition")).toThrow(/evidenceRefs/);
    expect(() => m.transition("EXECUTING", "robotics")).toThrow(/evidenceRefs/);
    // With evidence it succeeds.
    const ev = m.transition("EXECUTING", "robotics", { evidenceRefs: ["ev-robot-1"] });
    expect(ev.state).toBe("EXECUTING");
  });

  it("never defaults confidence — omits unless supplied", () => {
    const m = makeMachine("IDLE");
    const ev = m.transition("LISTENING", "voice");
    expect("confidence" in ev).toBe(false);
    const ev2 = m.transition("THINKING", "cognition", {
      evidenceRefs: ["ev"],
      confidence: 0.8,
    });
    expect(ev2.confidence).toBe(0.8);
  });

  it("supports ERROR → OFFLINE → IDLE recovery", () => {
    const m = makeMachine("SPEAKING");
    m.transition("ERROR", "cognition", { reason: "provider timeout" });
    m.transition("OFFLINE", "system");
    m.transition("IDLE", "system");
    expect(m.currentState()).toBe("IDLE");
    // IDLE cannot go straight to THINKING per VALID_TRANSITIONS.
    expect(() => m.transition("THINKING", "cognition")).toThrow();
  });

  it("round-trips through fromEvents and rejects forged logs", () => {
    const m = makeMachine("IDLE");
    m.transition("LISTENING", "voice", { correlationId: "c-1" });
    m.transition("THINKING", "cognition", { evidenceRefs: ["ev-1"] });
    const log = [...m.events];

    const restored = AgentStateMachineImpl.fromEvents("holokai-01", log, {
      createEventId: ids,
      now: clock,
    });
    expect(restored.currentState()).toBe("THINKING");
    expect(restored.events.map((e) => e.eventId)).toEqual(log.map((e) => e.eventId));

    // Forged: IDLE → EXECUTING is not a legal transition.
    const forged: AgentStateEvent[] = [{ ...log[0]!, state: "EXECUTING" }];
    expect(() =>
      AgentStateMachineImpl.fromEvents("holokai-01", forged, {
        createEventId: ids,
        now: clock,
      }),
    ).toThrow();
  });

  it("rejects events belonging to a different agent", () => {
    const m = makeMachine("IDLE");
    m.transition("LISTENING", "voice");
    const foreign = m.events.map((e) => ({ ...e, agentId: "other-agent" }));
    expect(() =>
      AgentStateMachineImpl.fromEvents("holokai-01", foreign, {
        createEventId: ids,
        now: clock,
      }),
    ).toThrow(/agentId/);
  });
});

describe("EventBus", () => {
  const mkEvent = (over: Partial<InteractionEvent>): InteractionEvent => ({
    eventId: "i-1",
    timestamp: "2026-11-18T12:00:00.000Z",
    channel: "gesture",
    intent: "select.entity",
    impactLevel: "MEDIUM",
    authorized: true,
    ...over,
  });

  it("routes events to channel handlers and wildcard", () => {
    const bus = new EventBus();
    const gesture: string[] = [];
    const all: string[] = [];
    bus.on("gesture", (e) => gesture.push(e.intent));
    bus.on("*", (e) => all.push(e.intent));
    bus.emit(mkEvent({ intent: "select.entity" }));
    bus.emit(mkEvent({ channel: "voice", intent: "query.world" }));
    expect(gesture).toEqual(["select.entity"]);
    expect(all).toEqual(["select.entity", "query.world"]);
  });

  it("blocks HIGH-impact events when authorized=false", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on("*", handler);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    bus.emit(mkEvent({ impactLevel: "HIGH", authorized: false, intent: "robot.move" }));
    expect(handler).not.toHaveBeenCalled();
    expect(bus.blocked).toHaveLength(1);

    bus.emit(mkEvent({ impactLevel: "HIGH", authorized: true, intent: "robot.move" }));
    expect(handler).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("unsubscribe stops delivery", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsub = bus.on("system", handler);
    unsub();
    bus.emit(mkEvent({ channel: "system" }));
    expect(handler).not.toHaveBeenCalled();
  });
});
