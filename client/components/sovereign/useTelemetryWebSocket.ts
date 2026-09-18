import { useEffect, useRef, useCallback } from "react";
import {
  subscribeTelemetryStream,
  resolveTelemetryStreamUrl,
} from "@/lib/services/telemetryStream";

/** Milliseconds to wait for the WebSocket stream before falling back to SSE. */
const WEBSOCKET_PROBE_TIMEOUT_MS = 3000;

/**
 * Single-flight connection to the canonical telemetry stream.
 *
 * Preference order:
 *   1. Raw WebSocket  wss://api.feexsystems.codes/telemetry/v1/stream
 *      (Nginx-terminated; frames are `TelemetryStreamFrame` from
 *      server/lib/services/telemetry-websocket.service.ts)
 *   2. Fallback to the SSE hook supplied by the caller
 *      (`useProductionServerTelemetry`, which itself carries a
 *      clearly-labeled procedural fallback).
 *
 * Resolves to `true` when the WebSocket won and is now owned; `false` means the
 * caller should keep its SSE/procedural source running. Both paths are torn
 * down on unmount, and a WebSocket that opens after the probe already timed out
 * is closed rather than left dangling.
 */
export function useTelemetryWebSocket(
  onFrame: (sequence: number) => void
): void {
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    // Non-browser (jsdom/SSR) or no resolvable endpoint: let the SSE path own it.
    if (typeof window === "undefined" || typeof WebSocket === "undefined") return;
    if (!resolveTelemetryStreamUrl()) return;

    let opened = false;
    let disposed = false;
    let unsubscribe: (() => void) | null = null;

    const probeTimer = setTimeout(() => {
      // Stream never came up in time; release it so the SSE fallback proceeds.
      if (!opened && !disposed) {
        unsubscribe?.();
        unsubscribe = null;
      }
    }, WEBSOCKET_PROBE_TIMEOUT_MS);

    unsubscribe = subscribeTelemetryStream({
      onFrame: (payload) => {
        if (disposed) return;
        onFrameRef.current(payload.frame.sequence);
      },
      onStatus: (status) => {
        if (status === "open") {
          opened = true;
          clearTimeout(probeTimer);
        }
      },
      onError: () => {
        // Transport errors are expected while the WS endpoint is unavailable;
        // silently defer to the SSE/procedural fallback.
      },
    });

    return () => {
      disposed = true;
      clearTimeout(probeTimer);
      unsubscribe?.();
      unsubscribe = null;
    };
  }, []);
}

export default useTelemetryWebSocket;
