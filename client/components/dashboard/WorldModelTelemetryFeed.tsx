import React, { useState } from "react";
import { Activity, Radio, ShieldCheck, Terminal, Cpu } from "lucide-react";
import { useProductionServerTelemetry, type TelemetryPayload } from "@/components/sovereign/useProductionServerTelemetry";

export function WorldModelTelemetryFeed() {
  const [events, setEvents] = useState<TelemetryPayload[]>([]);
  const [currentFrame, setCurrentFrame] = useState<TelemetryPayload | null>(null);

  useProductionServerTelemetry((incoming) => {
    setCurrentFrame(incoming);
    setEvents((prev) => [incoming, ...prev.slice(0, 9)]);
  });

  return (
    <div className="relative p-5 rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00ff41] animate-pulse" />
          <span className="text-white font-semibold tracking-wider text-xs">
            WORLD MODEL // TELEMETRY STREAM
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 text-zinc-300">
            <Radio className="w-3 h-3 text-[#00ff41]" />
            <span>{currentFrame?.simulated ? "PROCEDURAL FEED" : "LIVE CANONICAL"}</span>
          </span>
        </div>
      </div>

      {/* Latest Telemetry Message */}
      <div className="mb-4 p-3 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Terminal className="w-4 h-4 text-[#00ff41] shrink-0" />
          <span className="text-zinc-200 truncate">
            {currentFrame?.msg || "Connecting to canonical telemetry stream..."}
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 font-mono shrink-0 ml-2">
          {currentFrame?.hexColor || "#00ff41"}
        </span>
      </div>

      {/* Recent Telemetry Event Ticker */}
      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
        {events.map((evt, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between py-1 px-2 rounded bg-white/[0.02] border border-white/[0.04] text-[11px] text-zinc-300"
          >
            <div className="flex items-center gap-2 truncate">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: evt.hexColor || "#00ff41" }}
              />
              <span className="truncate">{evt.msg}</span>
            </div>
            <span className="text-[10px] text-zinc-400 shrink-0 ml-2">
              SVR-{evt.serverIndex}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
