/**
 * FEEX Embodied Intelligence Layer — Agent State Machine
 *
 * Event-sourced state machine over the canonical AgentState contract.
 * Every transition emits a validated AgentStateEvent. The machine never
 * invents states: it only applies transitions declared in
 * VALID_AGENT_STATE_TRANSITIONS. Subsystems must feed it real events —
 * a model response is not proof of tool execution, and a submitted tool
 * request is not proof of success.
 */

import {
  AGENT_STATES,
  isValidAgentStateTransition,
  type AgentState,
  type AgentStateEvent,
} from "../contracts/agent-state";
import { parseAgentStateEvent } from "../contracts/validation";

export type AgentStateSource = AgentStateEvent["source"];

export interface StateMachineOptions {
  agentId: string;
  /** Initial state. Defaults to OFFLINE — agents boot unavailable, not IDLE. */
  initialState?: AgentState;
  /** Injectable ID factory for deterministic tests. */
  createEventId?: () => string;
  /** Injectable clock for deterministic tests. Must return ISO 8601 UTC. */
  now?: () => string;
}

export class AgentStateMachine {
  private state: AgentState;
  private readonly agentId: string;
  private readonly createEventId: () => string;
  private readonly now: () => string;
  private readonly history: AgentStateEvent[] = [];

  constructor(options: StateMachineOptions) {
    const initial = options.initialState ?? "OFFLINE";
    if (!(AGENT_STATES as readonly string[]).includes(initial)) {
      throw new Error(`Unknown initial agent state: ${initial}`);
    }
    this.agentId = options.agentId;
    this.state = initial;
    this.createEventId =
      options.createEventId ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date().toISOString());
  }

  get currentState(): AgentState {
    return this.state;
  }

  get events(): readonly AgentStateEvent[] {
    return this.history;
  }

  /**
   * Attempt a transition. Returns the emitted event, or null when the
   * transition is not in the canonical table (rejected, not thrown, so
   * callers can degrade gracefully — inspect `events` for the audit trail).
   */
  transition(
    to: AgentState,
    options: {
      source: AgentStateSource;
      evidenceRefs?: string[];
      correlationId?: string;
      reason?: string;
    },
  ): AgentStateEvent | null {
    if (!isValidAgentStateTransition(this.state, to)) {
      return null;
    }
    if (to === this.state) {
      return null;
    }

    const previous = this.state;
    const event: AgentStateEvent = {
      eventId: this.createEventId(),
      agentId: this.agentId,
      previousState: previous,
      state: to,
      timestamp: this.now(),
      source: options.source,
      correlationId: options.correlationId,
      evidenceRefs: options.evidenceRefs ?? [],
      reason: options.reason,
    };

    // Boundary validation: the emitted event must satisfy the contract
    // schema before it enters history or reaches subscribers.
    const validated = parseAgentStateEvent(event);

    this.state = to;
    this.history.push(validated);
    return validated;
  }

  /** Rehydrate from a persisted event log. Rejects invalid sequences. */
  static fromEvents(
    agentId: string,
    events: readonly AgentStateEvent[],
    options?: Omit<StateMachineOptions, "agentId" | "initialState">,
  ): AgentStateMachine {
    const machine = new AgentStateMachine({
      ...options,
      agentId,
      initialState: events.length > 0 ? events[0]!.previousState : "OFFLINE",
    });
    for (const raw of events) {
      const event = parseAgentStateEvent(raw);
      if (event.agentId !== agentId) {
        throw new Error(
          `Event agentId ${event.agentId} does not match machine agentId ${agentId}`,
        );
      }
      const applied = machine.transition(event.state, {
        source: event.source,
        evidenceRefs: event.evidenceRefs,
        correlationId: event.correlationId,
        reason: event.reason,
      });
      if (
        !applied ||
        applied.previousState !== event.previousState ||
        applied.state !== event.state
      ) {
        throw new Error(
          `Event log sequence invalid at ${event.eventId}: ` +
            `${event.previousState} → ${event.state} not reachable`,
        );
      }
      // Preserve original event identity/timestamp in history.
      machine.history[machine.history.length - 1] = event;
    }
    return machine;
  }
}
