/**
 * FEEX EIL — Agent State Machine  (Gate 2)
 *
 * Event-sourced state machine over the canonical AgentState contract.
 * Every transition emits a validated AgentStateEvent to subscribers.
 * The machine never invents states: it only applies transitions declared in
 * VALID_TRANSITIONS, and it throws on illegal transitions rather than
 * silently degrading.
 *
 * Rules enforced here (briefing §4 / acceptance §13):
 *   - Invalid transitions throw.
 *   - RESPONDING / EXECUTING require non-empty evidenceRefs.
 *   - confidence is omitted unless explicitly supplied — never defaulted.
 *   - EXECUTING reflects actual task execution events only.
 */

import {
  isValidAgentStateTransition,
  VALID_TRANSITIONS,
  transitionRequiresEvidence,
  type AgentState,
  type AgentStateEvent,
  type AgentStateMachine,
} from "../contracts/agent-state";
import { parseAgentStateEvent } from "../contracts/validation";

export type AgentStateSource = AgentStateEvent["source"];

export interface AgentStateMachineOptions {
  agentId: string;
  /** Initial state. Defaults to OFFLINE — agents boot unavailable, not IDLE. */
  initialState?: AgentState;
  /** Injectable ID factory for deterministic tests. */
  createEventId?: () => string;
  /** Injectable clock for deterministic tests. Must return ISO 8601 UTC. */
  now?: () => string;
}

export class AgentStateMachineImpl implements AgentStateMachine {
  private state: AgentState;
  private readonly agentId: string;
  private readonly createEventId: () => string;
  private readonly now: () => string;
  private readonly history: AgentStateEvent[] = [];
  private readonly handlers = new Set<(event: AgentStateEvent) => void>();

  constructor(options: AgentStateMachineOptions) {
    const initial = options.initialState ?? "OFFLINE";
    this.agentId = options.agentId;
    this.state = initial;
    this.createEventId = options.createEventId ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date().toISOString());
  }

  /** Interface method — current state. */
  currentState(): AgentState {
    return this.state;
  }

  /** Property accessor for callers that prefer `.currentState`. */
  get stateValue(): AgentState {
    return this.state;
  }

  /** Read-only audit trail of emitted events. */
  get events(): readonly AgentStateEvent[] {
    return this.history;
  }

  /**
   * Attempt a transition. Throws on illegal transitions and on
   * evidence-required states entered without evidenceRefs.
   */
  transition(
    to: AgentState,
    source: AgentStateSource,
    meta: Partial<
      Pick<
        AgentStateEvent,
        "evidenceRefs" | "correlationId" | "confidence" | "debug" | "reason"
      >
    > = {},
  ): AgentStateEvent {
    const from = this.state;

    if (!isValidAgentStateTransition(from, to)) {
      throw new Error(
        `Invalid AgentState transition: ${from} → ${to}. Allowed: ${VALID_TRANSITIONS[from].join(", ")}`,
      );
    }

    const evidenceRefs = meta.evidenceRefs ?? [];
    if (transitionRequiresEvidence(to) && evidenceRefs.length === 0) {
      throw new Error(
        `AgentState ${to} requires non-empty evidenceRefs. ` +
          `Provide at least one evidence ID.`,
      );
    }

    const event: AgentStateEvent = {
      eventId: this.createEventId(),
      agentId: this.agentId,
      state: to,
      previousState: from,
      timestamp: this.now(),
      source,
      evidenceRefs,
      ...(meta.correlationId !== undefined && {
        correlationId: meta.correlationId,
      }),
      // CONSTRAINT: confidence omitted unless explicitly supplied.
      ...(meta.confidence !== undefined && { confidence: meta.confidence }),
      ...(meta.reason !== undefined && { reason: meta.reason }),
      ...(meta.debug !== undefined && { debug: meta.debug }),
    };

    // Boundary validation: the emitted event must satisfy the contract
    // schema before it reaches subscribers or history.
    const validated = parseAgentStateEvent(event);

    this.state = to;
    this.history.push(validated);
    for (const handler of this.handlers) {
      handler(validated);
    }
    return validated;
  }

  /** Subscribe to transition events. Returns an unsubscribe function. */
  subscribe(handler: (event: AgentStateEvent) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /** Rehydrate from a persisted event log. Rejects invalid sequences. */
  static fromEvents(
    agentId: string,
    events: readonly AgentStateEvent[],
    options?: Omit<AgentStateMachineOptions, "agentId" | "initialState">,
  ): AgentStateMachineImpl {
    const machine = new AgentStateMachineImpl({
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
      const applied = machine.transition(event.state, event.source, {
        evidenceRefs: event.evidenceRefs,
        correlationId: event.correlationId,
        confidence: event.confidence,
        reason: event.reason,
        debug: event.debug,
      });
      if (
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

export { AgentStateMachineImpl as AgentStateMachine };
