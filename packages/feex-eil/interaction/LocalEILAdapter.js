 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
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


} from "../contracts/agent-state";
import {
  GESTURE_INTENT_MAP,
  REGISTERED_GESTURES,


} from "../contracts/interaction-event";









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

} from "./agent-state-machine";
import { EventBus } from "./EventBus";

 

























/**
 * Clock-skew policy: an InteractionEvent timestamped more than this far
 * ahead of the adapter clock is rejected. Without a bound, one far-
 * future event would permanently advance the per-channel staleness
 * baseline and silence all legitimate later events on that channel.
 * Five minutes tolerates normal client clock drift without opening a
 * meaningful replay window (events still must be authorized and
 * contract-valid; staleness is an ordering guard, not a security gate).
 */
export const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;









function reject(
  kind,
  message,
) {
  return { ok: false, kind, message };
}

function accept(value) {
  return { ok: true, value };
}

/**
 * Ephemeral, in-process EIL adapter. One instance per client session;
 * nothing survives the instance. Uses its own EventBus — never the
 * `globalEventBus` singleton — so instances cannot leak events into
 * each other or into unrelated consumers.
 */
export class LocalEILAdapter {
  
    __init() {this.bus = new EventBus()}
  
  /** Latest accepted InteractionEvent timestamp per channel. */
    __init2() {this.lastAcceptedAt = new Map()}

  constructor(options) {;LocalEILAdapter.prototype.__init.call(this);LocalEILAdapter.prototype.__init2.call(this);
    this.now = _nullishCoalesce(options.now, () => ( (() => new Date().toISOString())));
    this.machine = new AgentStateMachineImpl({
      agentId: options.agentId,
      createEventId: options.createEventId,
      now: this.now,
    });
  }

  // ------------------------------------------------------------------
  // Agent state
  // ------------------------------------------------------------------

  currentState() {
    return this.machine.currentState();
  }

  /** Read-only copy of the emitted AgentStateEvent history. */
  get stateEvents() {
    return this.machine.events;
  }

  subscribeState(handler) {
    return this.machine.subscribe(handler);
  }

  /**
   * Request an agent state transition. Illegal transitions and
   * evidence-deficient entries are rejected before the machine runs;
   * machine-level failures are reported, not thrown.
   */
  transition(
    to,
    source,
    meta








 = {},
  ) {
    const from = this.machine.currentState();
    if (!isValidAgentStateTransition(from, to)) {
      return reject(
        "illegal-transition",
        `Invalid AgentState transition: ${from} → ${to}`,
      );
    }
    if (transitionRequiresEvidence(to) && (_nullishCoalesce(meta.evidenceRefs, () => ( []))).length === 0) {
      return reject(
        "evidence-required",
        `AgentState ${to} requires non-empty evidenceRefs`,
      );
    }
    // Capture the history boundary BEFORE invoking the machine: a
    // subscriber may trigger a nested transition during dispatch, which
    // commits additional events. The event committed by THIS invocation
    // is the first entry appended after this index — later entries
    // belong to nested transitions and must not be inspected.
    const historyBefore = this.machine.events.length;
    try {
      return accept(this.machine.transition(to, source, meta));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Event-sourced semantics: the machine commits state + history
      // BEFORE notifying subscribers, then rethrows aggregated
      // subscriber errors. A throw here can therefore mean the
      // transition committed and only notification failed. Identify
      // the specific event this call committed — currentState() and
      // the history tail may already reflect a nested transition —
      // and report it as ok with notificationError. Reporting failure
      // would invite a retry that double-transitions.
      const committed = this.machine.events[historyBefore];
      if (
        this.machine.events.length > historyBefore &&
        _optionalChain([committed, 'optionalAccess', _ => _.state]) === to &&
        committed.previousState === from
      ) {
        return {
          ok: true,
          value: committed,
          notificationError: message,
        };
      }
      return reject("invalid-payload", message);
    }
  }

  // ------------------------------------------------------------------
  // Interaction events
  // ------------------------------------------------------------------

  /** Subscribe to routed InteractionEvents on a channel or "*". */
  onInteraction(
    channel,
    handler,
  ) {
    return this.bus.on(channel, handler);
  }

  /** Audit view: unauthorized events the bus blocked. */
  get blockedEvents() {
    return this.bus.blocked;
  }

  /** Audit view: duplicate eventIds the bus skipped. */
  get duplicateEventIds() {
    return this.bus.duplicates;
  }

  /**
   * Ingest an untrusted InteractionEvent candidate. The payload is
   * parsed at the boundary; stale, duplicate, and unauthorized events
   * fail closed and are classified for diagnostics.
   *
   * Delivery semantics (EventBus contract, made explicit):
   *   - The eventId is recorded as seen BEFORE dispatch. A handler
   *     failure does not un-see it: re-ingesting the same event is
   *     classified `duplicate`, never re-delivered. Redelivery requires
   *     a new eventId — there is no implicit retry.
   *   - On handler failure the bus attempts every matching handler,
   *     collects errors, and throws after delivery completes. The
   *     adapter reports `handler-error`; subscribers that succeeded
   *     did receive the event, so callers must not assume zero delivery.
   */
  ingestInteractionEvent(candidate) {
    let event;
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
  gestureToInteraction(candidate) {
    let gesture;
    try {
      gesture = parseGestureEvent(candidate);
    } catch (error) {
      return reject(
        "invalid-payload",
        error instanceof Error ? error.message : String(error),
      );
    }

    const mapping = GESTURE_INTENT_MAP[gesture.gesture ];
    if (
      !mapping ||
      !(REGISTERED_GESTURES ).includes(gesture.gesture)
    ) {
      return reject(
        "invalid-payload",
        `Unregistered gesture: ${gesture.gesture}`,
      );
    }

    const event = {
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

  validatePerceptionEvent(candidate) {
    return this.parseBoundary(parsePerceptionEvent, candidate, "PerceptionEvent");
  }

  validatePermissionSnapshot(
    candidate,
  ) {
    return this.parseBoundary(parsePermissionSnapshot, candidate, "PermissionSnapshot");
  }

  validateEvidenceReference(
    candidate,
  ) {
    return this.parseBoundary(parseEvidenceReference, candidate, "EvidenceReference");
  }

  validateEvidenceBundle(candidate) {
    return this.parseBoundary(parseEvidenceBundle, candidate, "EvidenceBundle");
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

   checkStale(event) {
    const ts = Date.parse(event.timestamp);
    if (Number.isNaN(ts)) {
      return reject("invalid-payload", `Unparseable timestamp: ${event.timestamp}`);
    }
    const nowMs = Date.parse(this.now());
    if (Number.isNaN(nowMs)) {
      // Fail closed: an unparseable adapter clock makes every
      // timestamp guard meaningless — reject rather than bypass.
      return reject(
        "clock-error",
        "Adapter clock did not produce a parseable ISO timestamp; " +
          "timestamp guards cannot be evaluated",
      );
    }
    if (ts > nowMs + MAX_FUTURE_SKEW_MS) {
      return reject(
        "future-timestamp",
        `Future ${event.channel} event rejected: ${event.timestamp} exceeds ` +
          `adapter clock + ${MAX_FUTURE_SKEW_MS}ms skew allowance`,
      );
    }
    const last = this.lastAcceptedAt.get(event.channel);
    if (last === undefined) return null;
    if (ts < last) {
      return reject(
        "stale",
        `Stale ${event.channel} event: ${event.timestamp} precedes ${new Date(last).toISOString()}`,
      );
    }
    return null;
  }

   parseBoundary(
    parser,
    candidate,
    label,
  ) {
    try {
      return accept(parser(candidate));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return reject("invalid-payload", `${label}: ${message}`);
    }
  }
}
