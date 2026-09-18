/**
 * Canonical real-time telemetry stream client.
 *
 * Transport: raw WebSocket to the Nginx-terminated endpoint
 *   wss://api.feexsystems.codes/telemetry/v1/stream
 * in production, with a same-origin ws:// fallback in development.
 *
 * The server side of this contract is
 * `server/lib/services/telemetry-websocket.service.ts` (`TelemetryStreamFrame`).
 *
 * IMPORTANT: the parsing below is deliberately strict. Per the repository's
 * "Evidence, Not Claims" principle, malformed or unrecognized frames are
 * surfaced as unverified and never coerced into plausible-looking telemetry.
 */

export type WorldModelSyncStatus = 'SYNCHRONIZED' | 'SYNCING' | 'DEGRADED';

export type TelemetryEventType =
  | 'PROBE_COLLISION'
  | 'TACTILE_ENGAGE'
  | 'WORLD_MUTATION'
  | 'HEARTBEAT';

export interface TelemetryStreamMetrics {
  cpuPercent: number;
  memoryUsageMb: number;
  activeConnections: number;
  fpsTarget: number;
  laserGridFrequency: number;
  worldModelSyncStatus: WorldModelSyncStatus;
}

export interface TelemetryStreamEvent {
  type: TelemetryEventType;
  details?: Record<string, unknown>;
}

/** Wire format produced by the server. Mirrors `TelemetryStreamFrame`. */
export interface TelemetryStreamFrame {
  sequence: number;
  timestamp: string;
  source: string;
  metrics: TelemetryStreamMetrics;
  event?: TelemetryStreamEvent;
}

/** Frame resolved for consumption; `verified` is false for unvalidated input. */
export interface TelemetryStreamPayload {
  frame: TelemetryStreamFrame;
  /** False when the frame could not be fully validated against the contract. */
  verified: boolean;
  receivedAt: number;
}

export type TelemetryStreamStatus =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'closed';

export interface TelemetryStreamOptions {
  /** Explicit endpoint. Defaults to the env override, then same-origin. */
  url?: string;
  /** Called for every successfully parsed frame. */
  onFrame: (payload: TelemetryStreamPayload) => void;
  /** Called whenever the connection lifecycle state changes. */
  onStatus?: (status: TelemetryStreamStatus) => void;
  /** Called for transport errors and unparsable frames. */
  onError?: (error: Error) => void;
  /** Max backoff delay in ms. Defaults to 15000. */
  maxReconnectDelayMs?: number;
  /** Base backoff delay in ms. Defaults to 1000. */
  baseReconnectDelayMs?: number;
}

interface TelemetryEnv {
  VITE_TELEMETRY_WS_URL?: string;
}

function readEnv(): TelemetryEnv {
  if (typeof import.meta === 'undefined') return {};
  return ((import.meta as unknown as { env?: TelemetryEnv }).env ?? {}) as TelemetryEnv;
}

/**
 * Resolves the telemetry stream endpoint.
 *
 * Production targets the dedicated API host; development stays same-origin so
 * the Vite/Express dev server can serve the path directly. Any explicit
 * `VITE_TELEMETRY_WS_URL` override always wins.
 */
export function resolveTelemetryStreamUrl(override?: string): string {
  if (override) return override;

  const envUrl = readEnv().VITE_TELEMETRY_WS_URL;
  if (envUrl) return envUrl;

  if (typeof window === 'undefined') return '';

  const secure = window.location.protocol === 'https:';
  const scheme = secure ? 'wss' : 'ws';
  const host = import.meta.env?.PROD
    ? 'api.feexsystems.codes'
    : window.location.host;

  return `${scheme}://${host}/telemetry/v1/stream`;
}

const SYNC_STATUSES: ReadonlySet<string> = new Set([
  'SYNCHRONIZED',
  'SYNCING',
  'DEGRADED',
]);

const EVENT_TYPES: ReadonlySet<string> = new Set([
  'PROBE_COLLISION',
  'TACTILE_ENGAGE',
  'WORLD_MUTATION',
  'HEARTBEAT',
]);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseMetrics(raw: unknown): TelemetryStreamMetrics | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;

  if (!isFiniteNumber(m.cpuPercent)) return null;
  if (!isFiniteNumber(m.memoryUsageMb)) return null;
  if (!isFiniteNumber(m.activeConnections)) return null;
  if (!isFiniteNumber(m.fpsTarget)) return null;
  if (!isFiniteNumber(m.laserGridFrequency)) return null;
  if (typeof m.worldModelSyncStatus !== 'string') return null;
  if (!SYNC_STATUSES.has(m.worldModelSyncStatus)) return null;

  return {
    cpuPercent: m.cpuPercent,
    memoryUsageMb: m.memoryUsageMb,
    activeConnections: m.activeConnections,
    fpsTarget: m.fpsTarget,
    laserGridFrequency: m.laserGridFrequency,
    worldModelSyncStatus: m.worldModelSyncStatus as WorldModelSyncStatus,
  };
}

function parseEvent(raw: unknown): TelemetryStreamEvent | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const e = raw as Record<string, unknown>;
  if (typeof e.type !== 'string' || !EVENT_TYPES.has(e.type)) return undefined;

  const details =
    e.details && typeof e.details === 'object'
      ? (e.details as Record<string, unknown>)
      : undefined;

  return { type: e.type as TelemetryEventType, details };
}

/**
 * Validates an untrusted wire frame.
 *
 * Returns the frame plus a `verified` flag. Structurally-invalid frames return
 * `null` so callers never display invented provenance. Frames that are valid
 * except for an optional/unknown `event.type` are returned as unverified rather
 * than dropped — the metrics are still real.
 */
export function parseTelemetryFrame(
  raw: string
): TelemetryStreamPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const f = parsed as Record<string, unknown>;

  const metrics = parseMetrics(f.metrics);
  if (!metrics) return null;
  if (!isFiniteNumber(f.sequence)) return null;
  if (typeof f.timestamp !== 'string') return null;
  if (typeof f.source !== 'string') return null;

  const event = parseEvent(f.event);
  const hasRawEvent = f.event !== undefined && f.event !== null;

  const frame: TelemetryStreamFrame = {
    sequence: f.sequence,
    timestamp: f.timestamp,
    source: f.source,
    metrics,
    ...(event ? { event } : {}),
  };

  return {
    frame,
    // An event present on the wire that we could not classify is recorded as
    // unverified rather than silently promoted to a known event type.
    verified: hasRawEvent ? event !== undefined : true,
    receivedAt: Date.now(),
  };
}

/**
 * Subscribes to the canonical telemetry stream.
 *
 * Returns an unsubscribe function. Connection failures retry with exponential
 * backoff. Safe to call in non-browser environments (jsdom/SSR): it reports a
 * closed status and returns a no-op unsubscribe instead of throwing.
 */
export function subscribeTelemetryStream(
  options: TelemetryStreamOptions
): () => void {
  const {
    onFrame,
    onStatus,
    onError,
    maxReconnectDelayMs = 15000,
    baseReconnectDelayMs = 1000,
  } = options;

  const url = resolveTelemetryStreamUrl(options.url);

  if (typeof window === 'undefined' || typeof WebSocket === 'undefined' || !url) {
    onStatus?.('closed');
    return () => {};
  }

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;
  let disposed = false;

  const setStatus = (status: TelemetryStreamStatus) => {
    if (!disposed) onStatus?.(status);
  };

  const scheduleReconnect = () => {
    if (disposed || reconnectTimer) return;
    attempt += 1;
    const delay = Math.min(
      maxReconnectDelayMs,
      baseReconnectDelayMs * Math.pow(2, attempt - 1)
    );
    setStatus('reconnecting');
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const connect = () => {
    if (disposed) return;

    setStatus(attempt === 0 ? 'connecting' : 'reconnecting');

    try {
      socket = new WebSocket(url);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      attempt = 0;
      setStatus('open');
    };

    socket.onmessage = (event: MessageEvent) => {
      const payload = parseTelemetryFrame(
        typeof event.data === 'string' ? event.data : String(event.data)
      );

      if (!payload) {
        onError?.(new Error('Discarded malformed telemetry frame'));
        return;
      }

      onFrame(payload);
    };

    socket.onerror = () => {
      // `onerror` carries no useful detail in the browser; the follow-up
      // `onclose` is what drives the reconnect path.
      onError?.(new Error('Telemetry stream transport error'));
    };

    socket.onclose = () => {
      socket = null;
      scheduleReconnect();
    };
  };

  connect();

  return () => {
    // Emit the terminal status BEFORE latching `disposed`, because setStatus
    // refuses to publish once disposed — ordering this the other way silently
    // swallowed the 'closed' notification.
    setStatus('closed');
    disposed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      try {
        socket.close();
      } catch {
        // Already closing/closed.
      }
      socket = null;
    }
  };
}

export default subscribeTelemetryStream;
