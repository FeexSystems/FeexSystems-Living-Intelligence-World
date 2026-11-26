 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }























import { parseInteractionEvent } from "../contracts/validation";



function deepFreeze(value) {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) {
      deepFreeze((value )[key]);
    }
    Object.freeze(value);
  }
  return value;
}

export class EventBus {constructor() { EventBus.prototype.__init.call(this);EventBus.prototype.__init2.call(this);EventBus.prototype.__init3.call(this);EventBus.prototype.__init4.call(this);EventBus.prototype.__init5.call(this);EventBus.prototype.__init6.call(this); }
   __init() {this.listeners = new Map


()}

  /** eventIds already dispatched — redelivery is skipped, not repeated. */
    __init2() {this.seen = new Set()}

  /** Events dropped by the authorization gate, for audit. */
   __init3() {this.blocked = []}

  /** eventIds skipped as duplicates, for audit. */
   __init4() {this.duplicates = []}

   __init5() {this.dispatching = false}
    __init6() {this.queue = []}

  emit(event) {
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
    const errors = [];
    try {
      this.deliver(parsed, errors);
      while (this.queue.length > 0) {
        this.deliver(this.queue.shift(), errors);
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

   deliver(event, errors) {
    // Snapshot handlers: subscription changes mid-dispatch take effect on
    // the next event, not retroactively on this one.
    const handlers = [
      ...(_nullishCoalesce(this.listeners.get(event.channel), () => ( []))),
      ...(_nullishCoalesce(this.listeners.get("*"), () => ( []))),
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
    channel,
    handler,
  ) {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel).add(handler);
    return () => {
      _optionalChain([this, 'access', _ => _.listeners, 'access', _2 => _2.get, 'call', _3 => _3(channel), 'optionalAccess', _4 => _4.delete, 'call', _5 => _5(handler)]);
    };
  }

  once(
    channel,
    handler,
  ) {
    const unsub = this.on(channel, (event) => {
      unsub();
      handler(event);
    });
  }
}

// Singleton for use within a single platform adapter.
export const globalEventBus = new EventBus();
