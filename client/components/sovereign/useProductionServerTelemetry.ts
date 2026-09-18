import { useEffect, useRef } from "react";
import {
  subscribeTelemetryStream,
  type TelemetryStreamPayload,
  type TelemetryStreamStatus,
} from "../../lib/services/telemetryStream";

export interface TelemetryPayload {
  msg: string;
  serverIndex: number;
  hexColor: string;
  timestamp?: string;
  /** True when the frame originates from the procedural fallback, NOT the canonical ledger. */
  simulated: boolean;
}

/**
 * Clearly-labeled SIMULATED frames used only when the canonical stream is
 * unreachable. Per the "Evidence, Not Claims" principle these never imitate
 * ledger output: no invented commit SHAs, no invented provenance claims.
 */
const PROCEDURAL_EVENTS: TelemetryPayload[] = [
  {
    msg: "» SIM FEED: Procedural placeholder — canonical ledger stream connecting…",
    serverIndex: 0,
    hexColor: "#00f0ff",
    simulated: true,
  },
  {
    msg: "» SIM FEED: Placeholder cadence — connect the canonical stream for real events",
    serverIndex: 1,
    hexColor: "#00ffaa",
    simulated: true,
  },
  {
    msg: "» SIM FEED: Simulated UI probe frame — not ledger data",
    serverIndex: 2,
    hexColor: "#facc15",
    simulated: true,
  },
];

export function useProductionServerTelemetry(
  onIncomingEvent: (payload: TelemetryPayload) => void
) {
  const onIncomingEventRef = useRef(onIncomingEvent);
  onIncomingEventRef.current = onIncomingEvent;

  useEffect(() => {
    let proceduralFallbackInterval: NodeJS.Timeout | null = null;
    let isCanonicalStreamConnected = false;

    // Start procedural generator if the canonical stream is unavailable
    const startProceduralFallback = () => {
      if (proceduralFallbackInterval) return;
      let currentIndex = 0;
      proceduralFallbackInterval = setInterval(() => {
        if (isCanonicalStreamConnected) return;
        const nextEvent = PROCEDURAL_EVENTS[currentIndex % PROCEDURAL_EVENTS.length];
        currentIndex++;
        onIncomingEventRef.current({
          ...nextEvent,
          timestamp: new Date().toISOString().substring(11, 19),
        });
      }, 3200);
    };

    const stopProceduralFallback = () => {
      if (proceduralFallbackInterval) {
        clearInterval(proceduralFallbackInterval);
        proceduralFallbackInterval = null;
      }
    };

    // Immediately trigger the first procedural frame for instant tactile feedback
    onIncomingEventRef.current({
      ...PROCEDURAL_EVENTS[0],
      timestamp: new Date().toISOString().substring(11, 19),
    });
    startProceduralFallback();

    // Subscribe to the canonical Nginx-terminated WebSocket stream /telemetry/v1/stream
    const unsubscribeWs = subscribeTelemetryStream({
      onStatus: (status: TelemetryStreamStatus) => {
        if (status === "open") {
          isCanonicalStreamConnected = true;
          stopProceduralFallback();
          console.log(
            "📡 [FeexSystems Engine]: Canonical WebSocket telemetry stream connected."
          );
        } else if (status === "closed" || status === "reconnecting") {
          isCanonicalStreamConnected = false;
          startProceduralFallback();
        }
      },
      onFrame: (payload: TelemetryStreamPayload) => {
        const { frame, verified } = payload;
        let serverIndex = frame.sequence % 3;
        let hexColor = "#00f0ff";
        let eventMsg = `» TELEMETRY [#${frame.sequence}]: CPU ${frame.metrics.cpuPercent}% | RAM ${frame.metrics.memoryUsageMb}MB | GRID ${frame.metrics.laserGridFrequency}Hz`;

        if (frame.event) {
          if (frame.event.type === "PROBE_COLLISION") {
            serverIndex = 0;
            hexColor = "#ff0055";
            eventMsg = `» LIVE COLLISION: Probe sensor impact registered on Node 01`;
          } else if (frame.event.type === "WORLD_MUTATION") {
            serverIndex = 1;
            hexColor = "#00ffaa";
            eventMsg = `» WORLD MUTATION: Evidence Fabric notarization confirmed`;
          } else if (frame.event.type === "TACTILE_ENGAGE") {
            serverIndex = 2;
            hexColor = "#facc15";
            eventMsg = `» TACTILE OVERRIDE: Sovereign probe manual vector active`;
          } else if (frame.event.type === "HEARTBEAT") {
            eventMsg = `» REALTIME TELEMETRY: Grounded stream online (Sync: ${frame.metrics.worldModelSyncStatus})`;
          }
        }

        onIncomingEventRef.current({
          msg: eventMsg,
          serverIndex,
          hexColor,
          timestamp: frame.timestamp ? frame.timestamp.substring(11, 19) : new Date().toISOString().substring(11, 19),
          simulated: !verified,
        });
      },
      onError: (err: Error) => {
        console.warn("⚠️ [FeexSystems Telemetry]: WebSocket transport advisory:", err.message);
      },
    });

    return () => {
      unsubscribeWs();
      stopProceduralFallback();
    };
  }, []);
}

export default useProductionServerTelemetry;
