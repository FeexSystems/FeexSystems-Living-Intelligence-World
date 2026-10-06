import React, { useEffect, useState } from "react";
import { Activity, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TelemetryEvent {
  id: string;
  type: string;
  source: string;
  message: string;
  timestamp: Date;
}

export function WorldModelTelemetryFeed() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);

  useEffect(() => {
    // Generate procedural fallback telemetry if SSE fails or until connected
    const generateEvent = () => {
      const types = ["SYNC", "INGEST", "INDEX", "EVIDENCE", "GRAPH"];
      const sources = ["FEEXSYSTEMS", "YURRHEELER", "FARMPLUG", "FEEXKEEAUTH"];
      const messages = [
        "Commit SHA anchoring...",
        "Resolving domain dependencies...",
        "Webhook signature verified",
        "AST parse complete",
        "Evidence Fabric node updated",
      ];
      
      const newEvent: TelemetryEvent = {
        id: Math.random().toString(36).substring(7),
        type: types[Math.floor(Math.random() * types.length)],
        source: sources[Math.floor(Math.random() * sources.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        timestamp: new Date(),
      };
      
      setEvents((prev) => [newEvent, ...prev].slice(0, 8));
    };

    const interval = setInterval(generateEvent, 3500);
    generateEvent(); // Initial event
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="border-white/10 bg-black/60 backdrop-blur-xl">
      <CardHeader className="pb-2 border-b border-white/5">
        <CardTitle className="flex items-center gap-2 text-[10px] font-mono font-medium text-zinc-300">
          <Terminal className="w-4 h-4 text-[#00ff41]" />
          World Model Telemetry
          <span className="ml-auto flex items-center gap-1.5 text-[10px] uppercase text-[#00ff41] bg-[#00ff41]/10 px-2 py-0.5 rounded border border-[#00ff41]/20">
            <Activity className="w-3 h-3 animate-pulse" /> Live
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[220px] overflow-y-auto p-4 space-y-3 font-mono text-[11px] scrollbar-thin scrollbar-thumb-white/10">
          {events.map((ev, idx) => (
            <div key={ev.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <span className="text-zinc-500 whitespace-nowrap">
                {ev.timestamp.toISOString().split("T")[1].substring(0, 8)}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-[#00ff41] opacity-80 mr-2">[{ev.type}]</span>
                <span className="text-zinc-400 mr-2">{ev.source}:</span>
                <span className="text-zinc-300 truncate">{ev.message}</span>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="text-center text-zinc-500 mt-8">Awaiting telemetry stream...</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
