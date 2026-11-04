 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseTelemetryFrame,
  resolveTelemetryStreamUrl,
  subscribeTelemetryStream,


} from "../../lib/services/telemetryStream";

function validFrame(overrides = {}) {
  return {
    sequence: 1,
    timestamp: "2026-09-17T18:00:00.000Z",
    source: "FEEX_LIVING_TELEMETRY_ENGINE",
    metrics: {
      cpuPercent: 12.4,
      memoryUsageMb: 128,
      activeConnections: 1,
      fpsTarget: 60,
      laserGridFrequency: 440,
      worldModelSyncStatus: "SYNCHRONIZED",
    },
    event: { type: "HEARTBEAT", details: { message: "online" } },
    ...overrides,
  };
}

describe("parseTelemetryFrame (wire contract validation)", () => {
  it("accepts a fully valid server frame as verified", () => {
    const payload = parseTelemetryFrame(JSON.stringify(validFrame()));
    expect(payload).not.toBeNull();
    expect(payload.verified).toBe(true);
    expect(payload.frame.sequence).toBe(1);
    expect(payload.frame.metrics.worldModelSyncStatus).toBe("SYNCHRONIZED");
  });

  it("accepts a frame with no event as verified", () => {
    const frame = validFrame();
    delete (frame ).event;
    const payload = parseTelemetryFrame(JSON.stringify(frame));
    expect(payload.verified).toBe(true);
  });

  it("rejects frames that are not valid JSON", () => {
    expect(parseTelemetryFrame("{not-json")).toBeNull();
    expect(parseTelemetryFrame("")).toBeNull();
  });

  it("rejects non-object payloads", () => {
    expect(parseTelemetryFrame("null")).toBeNull();
    expect(parseTelemetryFrame('"a string"')).toBeNull();
    expect(parseTelemetryFrame("42")).toBeNull();
  });

  it("rejects frames missing required envelope fields", () => {
    const { sequence, ...noSequence } = validFrame();
    expect(parseTelemetryFrame(JSON.stringify({ ...noSequence, sequence: undefined }))).toBeNull();
    expect(sequence).toBe(1);

    expect(
      parseTelemetryFrame(JSON.stringify({ ...validFrame(), timestamp: 12345 }))
    ).toBeNull();
    expect(
      parseTelemetryFrame(JSON.stringify({ ...validFrame(), source: null }))
    ).toBeNull();
  });

  it("rejects frames with a malformed metrics block", () => {
    expect(parseTelemetryFrame(JSON.stringify({ ...validFrame(), metrics: null }))).toBeNull();

    expect(
      parseTelemetryFrame(
        JSON.stringify({ ...validFrame(), metrics: { cpuPercent: "high" } })
      )
    ).toBeNull();

    // Non-finite numbers must not slip through as plausible telemetry.
    expect(
      parseTelemetryFrame(
        JSON.stringify({
          ...validFrame(),
          metrics: { ...validFrame().metrics, laserGridFrequency: Number.NaN },
        })
      )
    ).toBeNull();
  });

  it("rejects an unrecognized worldModelSyncStatus rather than coercing it", () => {
    expect(
      parseTelemetryFrame(
        JSON.stringify({
          ...validFrame(),
          metrics: { ...validFrame().metrics, worldModelSyncStatus: "PROBABLY_FINE" },
        })
      )
    ).toBeNull();
  });

  it("marks frames with an unclassifiable event type as unverified but keeps real metrics", () => {
    const payload = parseTelemetryFrame(
      JSON.stringify({ ...validFrame(), event: { type: "TOTALLY_UNKNOWN_EVENT" } })
    );

    expect(payload).not.toBeNull();
    expect(payload.verified).toBe(false);
    // The metrics still came off the wire, so they are preserved.
    expect(payload.frame.metrics.cpuPercent).toBe(12.4);
    expect(payload.frame.event).toBeUndefined();
  });
});

describe("resolveTelemetryStreamUrl", () => {
  const originalProtocol = window.location.protocol;

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, protocol: originalProtocol },
      writable: true,
    });
  });

  it("honours an explicit override above everything else", () => {
    expect(resolveTelemetryStreamUrl("wss://custom.example/stream")).toBe(
      "wss://custom.example/stream"
    );
  });

  it("builds a wss:// same-origin URL in development", () => {
    const url = resolveTelemetryStreamUrl();
    expect(url).toMatch(/^wss?:\/\/.+\/telemetry\/v1\/stream$/);
  });

  it("upgrades to wss:// when the page is served over https", () => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, protocol: "https:" },
      writable: true,
    });
    expect(resolveTelemetryStreamUrl()).toMatch(/^wss:\/\//);
  });
});

describe("subscribeTelemetryStream (transport lifecycle)", () => {
  let sockets;

  class MockWebSocket {
    static __initStatic() {this.OPEN = 1}
    
    __init() {this.onopen = null}
    __init2() {this.onmessage = null}
    __init3() {this.onerror = null}
    __init4() {this.onclose = null}
    __init5() {this.close = vi.fn()}
    constructor(url) {;MockWebSocket.prototype.__init.call(this);MockWebSocket.prototype.__init2.call(this);MockWebSocket.prototype.__init3.call(this);MockWebSocket.prototype.__init4.call(this);MockWebSocket.prototype.__init5.call(this);
      this.url = url;
      sockets.push(this);
    }
  } MockWebSocket.__initStatic();

  beforeEach(() => {
    sockets = [];
    // `window.WebSocket` is read-only under this jsdom setup, so stub the global
    // rather than assigning to the property directly.
    vi.stubGlobal("WebSocket", MockWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("reports connecting then open, and forwards verified frames", () => {
    const statuses = [];
    const frames = [];

    subscribeTelemetryStream({
      url: "wss://api.example/telemetry/v1/stream",
      onStatus: (s) => statuses.push(s),
      onFrame: (p) => frames.push(p.frame.sequence),
    });

    expect(sockets).toHaveLength(1);
    expect(statuses).toContain("connecting");

    _optionalChain([sockets, 'access', _ => _[0], 'access', _2 => _2.onopen, 'optionalCall', _3 => _3()]);
    expect(statuses).toContain("open");

    _optionalChain([sockets, 'access', _4 => _4[0], 'access', _5 => _5.onmessage, 'optionalCall', _6 => _6({ data: JSON.stringify(validFrame({ sequence: 7 })) })]);
    expect(frames).toEqual([7]);
  });

  it("drops malformed frames and reports them instead of emitting", () => {
    const frames = [];
    const errors = [];

    subscribeTelemetryStream({
      url: "wss://api.example/telemetry/v1/stream",
      onFrame: (p) => frames.push(p.frame.sequence),
      onError: (e) => errors.push(e),
    });

    _optionalChain([sockets, 'access', _7 => _7[0], 'access', _8 => _8.onopen, 'optionalCall', _9 => _9()]);
    _optionalChain([sockets, 'access', _10 => _10[0], 'access', _11 => _11.onmessage, 'optionalCall', _12 => _12({ data: "garbage" })]);

    expect(frames).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/malformed/i);
  });

  it("reconnects with backoff after an unexpected close", () => {
    vi.useFakeTimers();

    subscribeTelemetryStream({
      url: "wss://api.example/telemetry/v1/stream",
      baseReconnectDelayMs: 1000,
      onFrame: () => {},
    });

    expect(sockets).toHaveLength(1);
    _optionalChain([sockets, 'access', _13 => _13[0], 'access', _14 => _14.onclose, 'optionalCall', _15 => _15()]);

    // First retry is scheduled, not immediate.
    expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(2);
  });

  it("detaches handlers and closes the socket on unsubscribe", () => {
    const statuses = [];

    const unsubscribe = subscribeTelemetryStream({
      url: "wss://api.example/telemetry/v1/stream",
      onStatus: (s) => statuses.push(s),
      onFrame: () => {},
    });

    const socket = sockets[0];
    unsubscribe();

    expect(socket.close).toHaveBeenCalled();
    expect(socket.onmessage).toBeNull();
    expect(socket.onclose).toBeNull();
    expect(statuses).toContain("closed");
  });

  it("does not reconnect after unsubscribe even if a close event fires late", () => {
    vi.useFakeTimers();

    const unsubscribe = subscribeTelemetryStream({
      url: "wss://api.example/telemetry/v1/stream",
      baseReconnectDelayMs: 1000,
      onFrame: () => {},
    });

    const socket = sockets[0];
    unsubscribe();

    // A late close from the network must not resurrect the stream.
    _optionalChain([socket, 'access', _16 => _16.onclose, 'optionalCall', _17 => _17()]);
    vi.advanceTimersByTime(5000);

    expect(sockets).toHaveLength(1);
  });
});
