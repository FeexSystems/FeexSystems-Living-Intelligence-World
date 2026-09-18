import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseTelemetryFrame,
  resolveTelemetryStreamUrl,
  subscribeTelemetryStream,
  type TelemetryStreamFrame,
  type TelemetryStreamStatus,
} from "../../lib/services/telemetryStream";

function validFrame(overrides: Partial<TelemetryStreamFrame> = {}): TelemetryStreamFrame {
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
    expect(payload!.verified).toBe(true);
    expect(payload!.frame.sequence).toBe(1);
    expect(payload!.frame.metrics.worldModelSyncStatus).toBe("SYNCHRONIZED");
  });

  it("accepts a frame with no event as verified", () => {
    const frame = validFrame();
    delete (frame as { event?: unknown }).event;
    const payload = parseTelemetryFrame(JSON.stringify(frame));
    expect(payload!.verified).toBe(true);
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
    expect(payload!.verified).toBe(false);
    // The metrics still came off the wire, so they are preserved.
    expect(payload!.frame.metrics.cpuPercent).toBe(12.4);
    expect(payload!.frame.event).toBeUndefined();
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
  let sockets: MockWebSocket[];

  class MockWebSocket {
    static OPEN = 1;
    url: string;
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onerror: (() => void) | null = null;
    onclose: (() => void) | null = null;
    close = vi.fn();
    constructor(url: string) {
      this.url = url;
      sockets.push(this);
    }
  }

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
    const statuses: TelemetryStreamStatus[] = [];
    const frames: number[] = [];

    subscribeTelemetryStream({
      url: "wss://api.example/telemetry/v1/stream",
      onStatus: (s) => statuses.push(s),
      onFrame: (p) => frames.push(p.frame.sequence),
    });

    expect(sockets).toHaveLength(1);
    expect(statuses).toContain("connecting");

    sockets[0].onopen?.();
    expect(statuses).toContain("open");

    sockets[0].onmessage?.({ data: JSON.stringify(validFrame({ sequence: 7 })) });
    expect(frames).toEqual([7]);
  });

  it("drops malformed frames and reports them instead of emitting", () => {
    const frames: number[] = [];
    const errors: Error[] = [];

    subscribeTelemetryStream({
      url: "wss://api.example/telemetry/v1/stream",
      onFrame: (p) => frames.push(p.frame.sequence),
      onError: (e) => errors.push(e),
    });

    sockets[0].onopen?.();
    sockets[0].onmessage?.({ data: "garbage" });

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
    sockets[0].onclose?.();

    // First retry is scheduled, not immediate.
    expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(2);
  });

  it("detaches handlers and closes the socket on unsubscribe", () => {
    const statuses: TelemetryStreamStatus[] = [];

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
    socket.onclose?.();
    vi.advanceTimersByTime(5000);

    expect(sockets).toHaveLength(1);
  });
});
