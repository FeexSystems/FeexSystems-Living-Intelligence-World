 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
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

 

































































function readEnv() {
  if (typeof import.meta === 'undefined') return {};
  return (_nullishCoalesce((import.meta ).env, () => ( {}))) ;
}

/**
 * Resolves the telemetry stream endpoint.
 *
 * Priority:
 *   1. Explicit override argument
 *   2. VITE_TELEMETRY_WS_URL env var
 *   3. Production: the dedicated API host (api.feexsystems.codes)
 *   4. Development: same-origin, so the Vite/Express dev server serves it
 *
 * NOTE: the production host is resolved from `import.meta.env.MODE`, NOT
 * `import.meta.env.PROD`. The previous `import.meta.env?.PROD` check was
 * statically folded to `false` at build time (the string
 * 'api.feexsystems.codes' was entirely absent from the emitted bundle), so the
 * client silently connected to the static Firebase Hosting origin instead. That
 * origin cannot upgrade a WebSocket — `/telemetry/**` has no rewrite rule in
 * firebase.json, so it falls through to the SPA catch-all and answers HTTP 200
 * where the browser expects a 101.
 */
export function resolveTelemetryStreamUrl(override) {
  if (override) return override;

  const envUrl = readEnv().VITE_TELEMETRY_WS_URL;
  if (envUrl) return envUrl;

  if (typeof window === 'undefined') return '';

  const secure = window.location.protocol === 'https:';
  const scheme = secure ? 'wss' : 'ws';

  // `import.meta.env.MODE` is a plain string literal and survives minification
  // reliably, unlike the boolean `.PROD` flag this used to rely on.
  const isProduction =
    typeof import.meta !== 'undefined' && _optionalChain([import.meta, 'access', _ => _.env, 'optionalAccess', _2 => _2.MODE]) === 'production';

  const host = isProduction ? 'api.feexsystems.codes' : window.location.host;

  return `${scheme}://${host}/telemetry/v1/stream`;
}

const SYNC_STATUSES = new Set([
  'SYNCHRONIZED',
  'SYNCING',
  'DEGRADED',
]);

const EVENT_TYPES = new Set([
  'PROBE_COLLISION',
  'TACTILE_ENGAGE',
  'WORLD_MUTATION',
  'HEARTBEAT',
]);

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseMetrics(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw ;

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
    worldModelSyncStatus: m.worldModelSyncStatus ,
  };
}

function parseEvent(raw) {
  if (!raw || typeof raw !== 'object') return undefined;
  const e = raw ;
  if (typeof e.type !== 'string' || !EVENT_TYPES.has(e.type)) return undefined;

  const details =
    e.details && typeof e.details === 'object'
      ? (e.details )
      : undefined;

  return { type: e.type , details };
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
  raw
) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e2) {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const f = parsed ;

  const metrics = parseMetrics(f.metrics);
  if (!metrics) return null;
  if (!isFiniteNumber(f.sequence)) return null;
  if (typeof f.timestamp !== 'string') return null;
  if (typeof f.source !== 'string') return null;

  const event = parseEvent(f.event);
  const hasRawEvent = f.event !== undefined && f.event !== null;

  const frame = {
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
  options
) {
  const {
    onFrame,
    onStatus,
    onError,
    maxReconnectDelayMs = 15000,
    baseReconnectDelayMs = 1000,
  } = options;

  const url = resolveTelemetryStreamUrl(options.url);

  if (typeof window === 'undefined' || typeof WebSocket === 'undefined' || !url) {
    _optionalChain([onStatus, 'optionalCall', _3 => _3('closed')]);
    return () => {};
  }

  let socket = null;
  let reconnectTimer = null;
  let attempt = 0;
  let disposed = false;

  // A host that answers a WebSocket upgrade with a plain HTTP response (for
  // example static hosting with no WebSocket support) will never succeed, no
  // matter how many times we retry. Retrying such an endpoint forever burns
  // bandwidth and floods the console. Retry transient failures as before, but
  // give up after this many consecutive failures and report 'closed' so the
  // consumer can fall back to its procedural feed.
  const MAX_CONSECUTIVE_FAILURES = 4;
  let consecutiveFailures = 0;

  const setStatus = (status) => {
    if (!disposed) _optionalChain([onStatus, 'optionalCall', _4 => _4(status)]);
  };

  const scheduleReconnect = () => {
    if (disposed || reconnectTimer) return;

    consecutiveFailures += 1;
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      _optionalChain([onError, 'optionalCall', _5 => _5(
        new Error(
          `Telemetry stream unreachable after ${consecutiveFailures} attempts — falling back to procedural feed`
        )
      )]);
      setStatus('closed');
      return;
    }

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
      _optionalChain([onError, 'optionalCall', _6 => _6(err instanceof Error ? err : new Error(String(err)))]);
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      attempt = 0;
      consecutiveFailures = 0;
      setStatus('open');
    };

    socket.onmessage = (event) => {
      const payload = parseTelemetryFrame(
        typeof event.data === 'string' ? event.data : String(event.data)
      );

      if (!payload) {
        _optionalChain([onError, 'optionalCall', _7 => _7(new Error('Discarded malformed telemetry frame'))]);
        return;
      }

      onFrame(payload);
    };

    socket.onerror = () => {
      // `onerror` carries no useful detail in the browser; the follow-up
      // `onclose` is what drives the reconnect path.
      _optionalChain([onError, 'optionalCall', _8 => _8(new Error('Telemetry stream transport error'))]);
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
      } catch (e3) {
        // Already closing/closed.
      }
      socket = null;
    }
  };
}

export default subscribeTelemetryStream;
