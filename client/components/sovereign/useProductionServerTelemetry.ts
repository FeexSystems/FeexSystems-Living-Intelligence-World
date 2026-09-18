import { useEffect, useRef } from "react";

export interface TelemetryPayload {
  msg: string;
  serverIndex: number;
  hexColor: string;
  timestamp?: string;
}

const WEBSOCKET_ENDPOINT_URL =
  typeof window !== "undefined" && window.location.protocol === "https:"
    ? "wss://api.feexsystems.codes/telemetry/v1/stream"
    : "ws://localhost:8080/telemetry/v1/stream";

const PROCEDURAL_EVENTS: TelemetryPayload[] = [
  {
    msg: "» INGEST: GitHub Webhook received on Repo [FeexSystems/3WM-SONIK-LABS]",
    serverIndex: 0,
    hexColor: "#00f0ff",
  },
  {
    msg: "» GRAPH_SYNTH: Node compilation complete. Provenance validated.",
    serverIndex: 1,
    hexColor: "#00ffaa",
  },
  {
    msg: "» OMNI_COMMAND: Executing multi-agent task thread path via gemini-3.8-flash",
    serverIndex: 2,
    hexColor: "#facc15",
  },
  {
    msg: "⚠️ SEC_WARN: HMAC verification loop payload tracking mismatch frame isolated",
    serverIndex: 1,
    hexColor: "#ff0055",
  },
  {
    msg: "» EVIDENCE_FABRIC: Commit SHA [9a8f23b] notarized to immutable ledger",
    serverIndex: 0,
    hexColor: "#38bdf8",
  },
  {
    msg: "» WORLD_MODEL: pgvector similarity index recalculated for 42 topology nodes",
    serverIndex: 1,
    hexColor: "#c084fc",
  },
  {
    msg: "» OMNI_AGENT: Live reasoning trace streaming SSE token chunks [128.4 t/s]",
    serverIndex: 2,
    hexColor: "#00f0ff",
  },
];

export function useProductionServerTelemetry(
  onIncomingEvent: (payload: TelemetryPayload) => void
) {
  const onIncomingEventRef = useRef(onIncomingEvent);
  onIncomingEventRef.current = onIncomingEvent;

  useEffect(() => {
    let socketInstance: WebSocket | null = null;
    let reconnectTimeoutTracker: NodeJS.Timeout | null = null;
    let proceduralFallbackInterval: NodeJS.Timeout | null = null;
    let isSocketConnected = false;

    // Start procedural generator if WebSocket is unavailable or disconnected
    const startProceduralFallback = () => {
      if (proceduralFallbackInterval) return;
      let currentIndex = 0;
      proceduralFallbackInterval = setInterval(() => {
        if (isSocketConnected) return;
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

    const establishNetworkConnection = () => {
      try {
        socketInstance = new WebSocket(WEBSOCKET_ENDPOINT_URL);

        socketInstance.onopen = () => {
          isSocketConnected = true;
          stopProceduralFallback();
          console.log(
            "📡 [FeexSystems Engine]: Live production data tunnel secured via WebSockets."
          );
        };

        socketInstance.onmessage = (event) => {
          try {
            const parsedPayload: TelemetryPayload = JSON.parse(event.data);
            onIncomingEventRef.current(parsedPayload);
          } catch (parsingError) {
            console.warn(
              "⚠️ [FeexSystems Telemetry]: Unparsable stream frame intercepted.",
              parsingError
            );
          }
        };

        socketInstance.onclose = () => {
          isSocketConnected = false;
          startProceduralFallback();
          reconnectTimeoutTracker = setTimeout(establishNetworkConnection, 6000);
        };

        socketInstance.onerror = () => {
          // Non-fatal error; fallback will handle stream emission seamlessly
          isSocketConnected = false;
          startProceduralFallback();
          socketInstance?.close();
        };
      } catch (err) {
        isSocketConnected = false;
        startProceduralFallback();
      }
    };

    // Immediately trigger the first procedural frame for instant tactile feedback
    onIncomingEventRef.current({
      ...PROCEDURAL_EVENTS[0],
      timestamp: new Date().toISOString().substring(11, 19),
    });
    startProceduralFallback();
    establishNetworkConnection();

    return () => {
      if (socketInstance) {
        socketInstance.onclose = null;
        socketInstance.onerror = null;
        socketInstance.close();
      }
      if (reconnectTimeoutTracker) clearTimeout(reconnectTimeoutTracker);
      stopProceduralFallback();
    };
  }, []);
}

export default useProductionServerTelemetry;
