import { useCallback, useEffect, useRef, useState } from "react";
import { useProductionServerTelemetry, type TelemetryPayload } from "./useProductionServerTelemetry";

export interface SovereignTelemetryState {
  hudTerminalLog: string;
  isSimulated: boolean;
  activeServerIndex: number | null;
  hexCrawl: string;
}

interface SovereignTelemetryProps {
  onChange: (state: SovereignTelemetryState) => void;
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

  const handleTelemetry = useCallback((payload: TelemetryPayload) => {
    const next = {
      hudTerminalLog: payload.msg,
      isSimulated: payload.simulated,
      activeServerIndex: payload.serverIndex,
      hexCrawl: state.hexCrawl,
    };
    setState(next);
    onChange(next);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => {
      setState((current) => ({ ...current, activeServerIndex: null }));
      onChange({ ...next, activeServerIndex: null });
    }, 350);
  }, [onChange, state.hexCrawl]);

  useProductionServerTelemetry(handleTelemetry);

  useEffect(() => {
    const interval = setInterval(() => {
      const hex = Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, "0");
      setState((current) => ({ ...current, hexCrawl: `0x${hex}` }));
    }, 150);
    return () => {
      clearInterval(interval);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  return null;
}

export default SovereignTelemetry;
