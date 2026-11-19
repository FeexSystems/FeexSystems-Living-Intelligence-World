import { describe, expect, it, vi } from "vitest";
import { AgentStateMachineImpl } from "../interaction/agent-state-machine";
import { EventBus } from "../interaction/EventBus";
import type { AgentStateEvent } from "../contracts/agent-state";
import type { InteractionEvent } from "../contracts/interaction-event";

let counter = 0;
// Contract requires UUID event IDs — generate deterministic-but-valid v4s.
const ids = () =>
  `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`;
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

  it("rejects replay logs claiming a transient initial state", () => {
    // A forged/truncated prefix asserting THINKING → RESPONDING must not
    // be adoptable as a legitimate starting point.
    const forged: AgentStateEvent[] = [
      {
        eventId: crypto.randomUUID(),
        agentId: "holokai-01",
        previousState: "THINKING",
        state: "RESPONDING",
        timestamp: "2026-11-18T12:00:00.000Z",
        source: "cognition",
        evidenceRefs: ["ev-1"],
      },
    ];
    expect(() =>
      AgentStateMachineImpl.fromEvents("holokai-01", forged, {
        createEventId: ids,
        now: clock,
      }),
    ).toThrow(/quiescent starting state/);
  });

  it("rejects replay logs with duplicate eventIds", () => {
    const m = makeMachine("IDLE");
    m.transition("LISTENING", "voice");
    m.transition("THINKING", "cognition", { evidenceRefs: ["ev-1"] });
    const log = [...m.events];
    const dup = [...log, { ...log[0]! }];
    expect(() =>
      AgentStateMachineImpl.fromEvents("holokai-01", dup, {
        createEventId: ids,
        now: clock,
      }),
    ).toThrow(/duplicate eventId/);
  });

  it("freezes emitted events and returns a history copy", () => {
    const m = makeMachine("IDLE");
    const ev = m.transition("LISTENING", "voice");
    expect(Object.isFrozen(ev)).toBe(true);
    expect(Object.isFrozen(ev.evidenceRefs)).toBe(true);
    const snapshot = m.events;
    expect(snapshot).not.toBe(m.events); // defensive copy per read
    expect(() => {
      (ev as { state: string }).state = "EXECUTING";
    }).toThrow();
  });

  it("notifies every subscriber even when one throws", () => {
    const m = makeMachine("IDLE");
    const second = vi.fn();
    m.subscribe(() => {
      throw new Error("subscriber boom");
    });
    m.subscribe(second);
    expect(() => m.transition("LISTENING", "voice")).toThrow(
      /subscriber\(s\) threw/,
    );
    expect(second).toHaveBeenCalledTimes(1);
    // Transition still committed — the error is in notification, not state.
    expect(m.currentState()).toBe("LISTENING");
  });

  it("queues re-entrant transitions so subscribers see emission order", () => {
    const m = makeMachine("IDLE");
    const seenA: string[] = [];
    const seenB: string[] = [];
    m.subscribe((e) => {
      seenA.push(`${e.previousState}→${e.state}`);
      if (e.state === "LISTENING") {
        m.transition("THINKING", "cognition", { evidenceRefs: ["ev-1"] });
      }
    });
    m.subscribe((e) => seenB.push(`${e.previousState}→${e.state}`));
    m.transition("LISTENING", "voice");
    expect(seenA).toEqual(["IDLE→LISTENING", "LISTENING→THINKING"]);
    expect(seenB).toEqual(["IDLE→LISTENING", "LISTENING→THINKING"]);
    expect(m.currentState()).toBe("THINKING");
  });
});

describe("EventBus", () => {
  const mkEvent = (over: Partial<InteractionEvent>): InteractionEvent => ({
    eventId: crypto.randomUUID(),
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

  it("rejects malformed runtime events instead of trusting types", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on("*", handler);
    // `authorized` as a truthy non-boolean must not pass the gate.
    expect(() =>
      bus.emit(mkEvent({ authorized: "yes" as never })),
    ).toThrow(/contract validation failed/);
    expect(() =>
      bus.emit(mkEvent({ eventId: "not-a-uuid" })),
    ).toThrow(/contract validation failed/);
    expect(handler).not.toHaveBeenCalled();
  });

  it("blocks unauthorized events at every impact level", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on("*", handler);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    bus.emit(mkEvent({ impactLevel: "LOW", authorized: false }));
    bus.emit(mkEvent({ impactLevel: "MEDIUM", authorized: false }));
    expect(handler).not.toHaveBeenCalled();
    expect(bus.blocked).toHaveLength(2);
    vi.restoreAllMocks();
  });

  it("deduplicates redelivered eventIds", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on("*", handler);
    const event = mkEvent({ eventId: crypto.randomUUID() });
    bus.emit(event);
    bus.emit(event);
    bus.emit({ ...event });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(bus.duplicates).toHaveLength(2);
  });

  it("freezes dispatched events against handler mutation", () => {
    const bus = new EventBus();
    let observed: InteractionEvent | undefined;
    bus.on("*", (e) => {
      observed = e;
      expect(Object.isFrozen(e)).toBe(true);
      expect(Object.isFrozen(e.payload)).toBe(true);
    });
    bus.emit(mkEvent({ payload: { nested: { value: 1 } } }));
    expect(observed).toBeDefined();
    expect(() => {
      (observed as unknown as { intent: string }).intent = "hacked";
    }).toThrow();
  });

  it("isolates handler errors and still notifies every subscriber", () => {
    const bus = new EventBus();
    const second = vi.fn();
    bus.on("*", () => {
      throw new Error("handler boom");
    });
    bus.on("*", second);
    expect(() => bus.emit(mkEvent({}))).toThrow(/handler\(s\) threw/);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("queues re-entrant emits so subscribers see outer before inner", () => {
    const bus = new EventBus();
    const seenA: string[] = [];
    const seenB: string[] = [];
    bus.on("*", (e) => {
      seenA.push(e.intent);
      if (e.intent === "select.entity") {
        bus.emit(
          mkEvent({
            intent: "navigate.world",
            channel: "system",
          }),
        );
      }
    });
    bus.on("*", (e) => seenB.push(e.intent));
    bus.emit(mkEvent({ intent: "select.entity" }));
    // Without queueing, B would observe the nested event before the outer one.
    expect(seenA).toEqual(["select.entity", "navigate.world"]);
    expect(seenB).toEqual(["select.entity", "navigate.world"]);
  });
});
