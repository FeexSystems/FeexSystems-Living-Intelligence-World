import { useCallback, useEffect, useRef, useState } from "react";
import { useProductionServerTelemetry, type TelemetryPayload } from "./useProductionServerTelemetry";
import { fetchWorldTelemetryEvents } from "@/lib/worldModelClient";

export interface SovereignTelemetryState {
  hudTerminalLog: string;
  isSimulated: boolean;
  activeServerIndex: number | null;
  hexCrawl: string;
}

interface SovereignTelemetryProps {
  onChange: (state: SovereignTelemetryState) => void;
}

/**
 * Render a canonical `world_model_events` snapshot row as a HUD line.
 *
 * These are REAL ledger records (the same table the SSE/WS stream tails), so
 * they are surfaced with `simulated: false` — never blended with the procedural
 * placeholder frames. Per "Evidence, Not Claims" the log line states the event
 * type and source verbatim and invents nothing beyond a compact time label.
 */
function preRollFromSnapshot(event: {
  eventType: string;
  source: string;
  createdAt: string;
}): TelemetryPayload {
  const time = (event.createdAt || "").substring(11, 19) || new Date().toISOString().substring(11, 19);
  return {
    msg: `» LEDGER REPLAY [${time}]: ${event.eventType} · ${event.source}`,
    serverIndex: 1,
    hexColor: "#00ffaa",
    timestamp: time,
    simulated: false,
  };
}

/** Owns the telemetry stream and explicitly preserves simulated frames as simulated. */
export function SovereignTelemetry({ onChange }: SovereignTelemetryProps) {
  const [state, setState] = useState<SovereignTelemetryState>({
    hudTerminalLog: "SYSTEM READY // Steer Drone with WASD / Touchpad",
    isSimulated: true,
    activeServerIndex: null,
    hexCrawl: "0xF211",
  });
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hexRef = useRef(state.hexCrawl);
  // Guards the one-shot snapshot replay so it never races/duplicates the live
  // stream or fires twice under React 18 StrictMode double-invoke.
  const preRollDoneRef = useRef(false);

  const handleTelemetry = useCallback((payload: TelemetryPayload) => {
    const next = {
      hudTerminalLog: payload.msg,
      isSimulated: payload.simulated,
      activeServerIndex: payload.serverIndex,
      hexCrawl: hexRef.current,
    };
    setState(next);
    onChange(next);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => {
      setState((current) => ({ ...current, activeServerIndex: null }));
      onChange({ ...next, activeServerIndex: null });
    }, 350);
  }, [onChange]);

  // Pre-roll: hydrate the HUD with the most recent canonical ledger event from
  // the SQL Connect snapshot BEFORE the live stream delivers its first frame, so
  // the terminal shows grounded history instead of only a procedural placeholder.
  // Best-effort: any failure (anonymous @auth USER query, SQL Connect off, REST
  // unreachable) is silent — the live stream + procedural fallback take over.
  useEffect(() => {
    if (preRollDoneRef.current) return;
    preRollDoneRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const events = await fetchWorldTelemetryEvents();
        if (cancelled || !events || events.length === 0) return;
        // Newest first (the query orders createdAt DESC); replay the latest.
        handleTelemetry(preRollFromSnapshot(events[0]));
      } catch {
        // Non-fatal: the canonical live stream / procedural fallback still run.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handleTelemetry]);

  useProductionServerTelemetry(handleTelemetry);

  useEffect(() => {
    const interval = setInterval(() => {
      const hex = Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, "0");
      hexRef.current = `0x${hex}`;
      setState((current) => ({ ...current, hexCrawl: hexRef.current }));
    }, 150);
    return () => {
      clearInterval(interval);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  return null;
}

export default SovereignTelemetry;
