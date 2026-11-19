/**
 * FEEX EIL — Interaction Event Bus  (Gate 2)
 *
 * Typed pub/sub for InteractionEvents across the interaction plane.
 * Enforces the HIGH-impact authorization invariant at the bus boundary:
 * an unauthorized HIGH event is blocked before any handler sees it.
 */

import type {
  InteractionChannel,
  InteractionEvent,
} from "../contracts/interaction-event";

type Handler<T> = (event: T) => void;

export class EventBus {
  private listeners = new Map<
    string,
    Set<Handler<InteractionEvent>>
  >();

  /** Events dropped by the authorization gate, for audit. */
  readonly blocked: InteractionEvent[] = [];

  emit(event: InteractionEvent): void {
    // CONSTRAINT: HIGH_IMPACT events must not route if not authorized.
    if (event.impactLevel === "HIGH" && !event.authorized) {
      this.blocked.push(event);
      console.warn(
        `[EventBus] BLOCKED high-impact event "${event.intent}" ` +
          `(eventId: ${event.eventId}) — not authorized`,
      );
      return;
    }

    const key = event.channel;
    this.listeners.get(key)?.forEach((h) => h(event));
    this.listeners.get("*")?.forEach((h) => h(event));
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
