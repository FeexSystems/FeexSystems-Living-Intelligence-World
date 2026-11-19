/**
 * FEEX EIL — Interaction Event Bus  (Gate 2)
 *
 * Typed pub/sub for InteractionEvents across the interaction plane.
 * Enforces the authorization invariant at the bus boundary: an event the
 * pipeline has not authorized never reaches a handler, at any impact
 * level — a mislabeled LOW event cannot smuggle an unauthorized action.
 *
 * Boundary rules:
 *   - Events are validated against interactionEventSchema on emit;
 *     malformed runtime payloads are rejected, never trusted.
 *   - Each eventId is dispatched at most once (dedup for redelivery).
 *   - Dispatched events are deeply frozen — handlers and callers cannot
 *     mutate what other subscribers observe.
 *   - A throwing handler does not starve later handlers; errors are
 *     collected and rethrown after delivery completes.
 *   - Handlers that emit re-entrantly are queued: every subscriber sees
 *     the outer event before any nested event.
 */

import type {
  InteractionChannel,
  InteractionEvent,
} from "../contracts/interaction-event";
import { parseInteractionEvent } from "../contracts/validation";

type Handler<T> = (event: T) => void;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

export class EventBus {
  private listeners = new Map<
    string,
    Set<Handler<InteractionEvent>>
  >();

  /** eventIds already dispatched — redelivery is skipped, not repeated. */
  private readonly seen = new Set<string>();

  /** Events dropped by the authorization gate, for audit. */
  readonly blocked: InteractionEvent[] = [];

  /** eventIds skipped as duplicates, for audit. */
  readonly duplicates: string[] = [];

  private dispatching = false;
  private readonly queue: InteractionEvent[] = [];

  emit(event: InteractionEvent): void {
    // Runtime boundary: never trust an event because it was produced
    // in-process — deserialized or hand-built payloads must satisfy the
    // contract schema (including a real boolean `authorized`).
    const parsed = deepFreeze(parseInteractionEvent(event));

    if (this.seen.has(parsed.eventId)) {
      this.duplicates.push(parsed.eventId);
      return;
    }
    this.seen.add(parsed.eventId);

    if (!parsed.authorized) {
      this.blocked.push(parsed);
      console.warn(
        `[EventBus] BLOCKED unauthorized event "${parsed.intent}" ` +
          `(eventId: ${parsed.eventId}, impact: ${parsed.impactLevel})`,
      );
      return;
    }

    if (this.dispatching) {
      this.queue.push(parsed);
      return;
    }
    this.dispatching = true;
    const errors: unknown[] = [];
    try {
      this.deliver(parsed, errors);
      while (this.queue.length > 0) {
        this.deliver(this.queue.shift()!, errors);
      }
    } finally {
      this.dispatching = false;
    }
    if (errors.length > 0) {
      const detail = errors
        .map((e) => (e instanceof Error ? e.message : String(e)))
        .join("; ");
      throw new Error(
        `[EventBus] ${errors.length} handler(s) threw during dispatch: ${detail}`,
      );
    }
  }

  private deliver(event: InteractionEvent, errors: unknown[]): void {
    // Snapshot handlers: subscription changes mid-dispatch take effect on
    // the next event, not retroactively on this one.
    const handlers = [
      ...(this.listeners.get(event.channel) ?? []),
      ...(this.listeners.get("*") ?? []),
    ];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        errors.push(error);
      }
    }
  }

  on(
    channel: InteractionChannel | "*",
    handler: Handler<InteractionEvent>,
  ): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(handler);
    return () => {
      this.listeners.get(channel)?.delete(handler);
    };
  }

  once(
    channel: InteractionChannel | "*",
    handler: Handler<InteractionEvent>,
  ): void {
    const unsub = this.on(channel, (event) => {
      unsub();
      handler(event);
    });
  }
}

// Singleton for use within a single platform adapter.
export const globalEventBus = new EventBus();
