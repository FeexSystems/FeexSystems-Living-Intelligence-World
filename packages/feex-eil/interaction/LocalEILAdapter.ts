/**
 * FEEX EIL — Local Ephemeral Adapter  (G5 Stage 1)
 *
 * Client-side adapter boundary for the approved first slice: consumes
 * actual local source events, validates them against the canonical EIL
 * contracts, and drives an ephemeral in-process AgentStateMachine +
 * EventBus. It is NOT the World Model, holds no canonical state, and
 * performs no network, storage, transport, tool, or actuation work.
 *
 * Invariants (G5 planning packet, Agent 05 §2.2 / Stage 1 acceptance):
 *   - Every inbound candidate crosses a runtime parser before use;
 *     malformed payloads are rejected, never trusted.
 *   - Rejections are fail-closed and classified; invalid payloads are
 *     not retried as if transient.
 *   - RESPONDING / EXECUTING cannot be entered without evidenceRefs —
 *     enforced here before the machine is invoked.
 *   - Interaction events older than the latest accepted event on the
 *     same channel are rejected as stale.
 *   - Unauthorized and duplicate events never reach subscribers (the
 *     EventBus enforces both; the adapter reports the classification).
 *   - Gesture interactions are constructed only through
 *     GESTURE_INTENT_MAP — impact level comes from the map (no HIGH
 *     mapping exists) and payloads carry only declared fields.
 *   - No EvidenceReference / EvidenceBundle is ever fabricated;
 *     evidence inputs are validated, not invented.
 *   - confidence is forwarded only when the source supplied it.
 */

import {
  isValidAgentStateTransition,
  transitionRequiresEvidence,
  type AgentState,
  type AgentStateEvent,
} from "../contracts/agent-state";
import {
  GESTURE_INTENT_MAP,
  REGISTERED_GESTURES,
  type InteractionChannel,
  type InteractionEvent,
} from "../contracts/interaction-event";
import type {
  GestureEvent,
  PerceptionEvent,
  PermissionSnapshot,
} from "../contracts/perception-event";
import type {
  EvidenceBundle,
  EvidenceReference,
} from "../contracts/evidence-reference";
import {
  parseEvidenceBundle,
  parseEvidenceReference,
  parseGestureEvent,
  parseInteractionEvent,
  parsePerceptionEvent,
  parsePermissionSnapshot,
} from "../contracts/validation";
import {
  AgentStateMachineImpl,
  type AgentStateSource,
} from "./agent-state-machine";
import { EventBus } from "./EventBus";

export type AdapterRejectionKind =
  | "invalid-payload"
  | "stale"
  | "duplicate"
  | "unauthorized"
  | "illegal-transition"
  | "evidence-required"
  | "handler-error";

export type AdapterResult<T> =
  | { ok: true; value: T }
  | { ok: false; kind: AdapterRejectionKind; message: string };

export interface LocalEILAdapterOptions {
  agentId: string;
  /** Injectable ID factory for deterministic tests. */
  createEventId?: () => string;
  /** Injectable clock for deterministic tests. Must return ISO 8601 UTC. */
  now?: () => string;
}

function reject(
  kind: AdapterRejectionKind,
  message: string,
): { ok: false; kind: AdapterRejectionKind; message: string } {
  return { ok: false, kind, message };
}

function accept<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

/**
 * Ephemeral, in-process EIL adapter. One instance per client session;
 * nothing survives the instance. Uses its own EventBus — never the
 * `globalEventBus` singleton — so instances cannot leak events into
 * each other or into unrelated consumers.
 */
export class LocalEILAdapter {
  private readonly machine: AgentStateMachineImpl;
  private readonly bus = new EventBus();
  /** Latest accepted InteractionEvent timestamp per channel. */
  private readonly lastAcceptedAt = new Map<InteractionChannel, number>();

  constructor(options: LocalEILAdapterOptions) {
    this.machine = new AgentStateMachineImpl({
      agentId: options.agentId,
      createEventId: options.createEventId,
      now: options.now,
    });
  }

  // ------------------------------------------------------------------
  // Agent state
  // ------------------------------------------------------------------

  currentState(): AgentState {
    return this.machine.currentState();
  }

  /** Read-only copy of the emitted AgentStateEvent history. */
  get stateEvents(): readonly AgentStateEvent[] {
    return this.machine.events;
  }

  subscribeState(handler: (event: AgentStateEvent) => void): () => void {
    return this.machine.subscribe(handler);
  }

  /**
   * Request an agent state transition. Illegal transitions and
   * evidence-deficient entries are rejected before the machine runs;
   * machine-level failures are reported, not thrown.
   */
  transition(
    to: AgentState,
    source: AgentStateSource,
    meta: Partial<
      Pick<
        AgentStateEvent,
        | "evidenceRefs"
        | "correlationId"
        | "confidence"
        | "debug"
        | "reason"
      >
    > = {},
  ): AdapterResult<AgentStateEvent> {
    const from = this.machine.currentState();
    if (!isValidAgentStateTransition(from, to)) {
      return reject(
        "illegal-transition",
        `Invalid AgentState transition: ${from} → ${to}`,
      );
    }
    if (transitionRequiresEvidence(to) && (meta.evidenceRefs ?? []).length === 0) {
      return reject(
        "evidence-required",
        `AgentState ${to} requires non-empty evidenceRefs`,
      );
    }
    try {
      return accept(this.machine.transition(to, source, meta));
    } catch (error) {
      return reject(
        "invalid-payload",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // ------------------------------------------------------------------
  // Interaction events
  // ------------------------------------------------------------------

  /** Subscribe to routed InteractionEvents on a channel or "*". */
  onInteraction(
    channel: InteractionChannel | "*",
    handler: (event: InteractionEvent) => void,
  ): () => void {
    return this.bus.on(channel, handler);
  }

  /** Audit view: unauthorized events the bus blocked. */
  get blockedEvents(): readonly InteractionEvent[] {
    return this.bus.blocked;
  }

  /** Audit view: duplicate eventIds the bus skipped. */
  get duplicateEventIds(): readonly string[] {
    return this.bus.duplicates;
  }

  /**
   * Ingest an untrusted InteractionEvent candidate. The payload is
   * parsed at the boundary; stale, duplicate, and unauthorized events
   * fail closed and are classified for diagnostics.
   */
  ingestInteractionEvent(candidate: unknown): AdapterResult<InteractionEvent> {
    let event: InteractionEvent;
    try {
      event = parseInteractionEvent(candidate);
    } catch (error) {
      return reject(
        "invalid-payload",
        error instanceof Error ? error.message : String(error),
      );
    }

    const stale = this.checkStale(event);
    if (stale) return stale;

    try {
      this.bus.emit(event);
    } catch (error) {
      return reject(
        "handler-error",
        error instanceof Error ? error.message : String(error),
      );
    }

    if (this.bus.duplicates.includes(event.eventId)) {
      return reject("duplicate", `Duplicate eventId: ${event.eventId}`);
    }
    if (this.bus.blocked.some((b) => b.eventId === event.eventId)) {
      return reject(
        "unauthorized",
        `Unauthorized ${event.channel} event "${event.intent}" blocked`,
      );
    }

    this.lastAcceptedAt.set(event.channel, Date.parse(event.timestamp));
    return accept(event);
  }

  /**
   * Map a classified GestureEvent to an InteractionEvent via
   * GESTURE_INTENT_MAP. The intent and impact level come only from the
   * map — no HIGH impact is constructible here — and the payload
   * carries only declared gesture fields. `authorized` is the gesture's
   * inherited `interactionAllowed`, never assumed.
   */
  gestureToInteraction(candidate: unknown): AdapterResult<InteractionEvent> {
    let gesture: GestureEvent;
    try {
      gesture = parseGestureEvent(candidate);
    } catch (error) {
      return reject(
        "invalid-payload",
        error instanceof Error ? error.message : String(error),
      );
    }

    const mapping = GESTURE_INTENT_MAP[gesture.gesture as keyof typeof GESTURE_INTENT_MAP];
    if (
      !mapping ||
      !(REGISTERED_GESTURES as readonly string[]).includes(gesture.gesture)
    ) {
      return reject(
        "invalid-payload",
        `Unregistered gesture: ${gesture.gesture}`,
      );
    }

    const event: InteractionEvent = {
      eventId: gesture.eventId,
      timestamp: gesture.timestamp,
      channel: "gesture",
      intent: mapping.intent,
      impactLevel: mapping.impactLevel,
      authorized: gesture.interactionAllowed,
      sourceEventId: gesture.sourceEventId,
      ...(gesture.correlationId !== undefined && {
        correlationId: gesture.correlationId,
      }),
      payload: {
        gesture: gesture.gesture,
        confidence: gesture.confidence,
        bimanual: gesture.bimanual,
        durationMs: gesture.durationMs,
      },
    };

    return this.ingestInteractionEvent(event);
  }

  // ------------------------------------------------------------------
  // Validation-only boundaries — parse and return; never fabricate.
  // ------------------------------------------------------------------

  validatePerceptionEvent(candidate: unknown): AdapterResult<PerceptionEvent> {
    return this.parseBoundary(parsePerceptionEvent, candidate, "PerceptionEvent");
  }

  validatePermissionSnapshot(
    candidate: unknown,
  ): AdapterResult<PermissionSnapshot> {
    return this.parseBoundary(parsePermissionSnapshot, candidate, "PermissionSnapshot");
  }

  validateEvidenceReference(
    candidate: unknown,
  ): AdapterResult<EvidenceReference> {
    return this.parseBoundary(parseEvidenceReference, candidate, "EvidenceReference");
  }

  validateEvidenceBundle(candidate: unknown): AdapterResult<EvidenceBundle> {
    return this.parseBoundary(parseEvidenceBundle, candidate, "EvidenceBundle");
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private checkStale(event: InteractionEvent): AdapterResult<InteractionEvent> | null {
    const last = this.lastAcceptedAt.get(event.channel);
    if (last === undefined) return null;
    const ts = Date.parse(event.timestamp);
    if (Number.isNaN(ts)) {
      return reject("invalid-payload", `Unparseable timestamp: ${event.timestamp}`);
    }
    if (ts < last) {
      return reject(
        "stale",
        `Stale ${event.channel} event: ${event.timestamp} precedes ${new Date(last).toISOString()}`,
      );
    }
    return null;
  }

  private parseBoundary<T>(
    parser: (value: unknown) => T,
    candidate: unknown,
    label: string,
  ): AdapterResult<T> {
    try {
      return accept(parser(candidate));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return reject("invalid-payload", `${label}: ${message}`);
    }
  }
}
