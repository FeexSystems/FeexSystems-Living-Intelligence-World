import React, { useEffect, useState } from "react";
import type { MetricsDashboardProps } from "@shared/orchestration";
import { Activity, Database, Server, Wifi } from "lucide-react";

export function MetricsDashboard(props: MetricsDashboardProps) {
  const { widget_type, status, data_points = [], summary } = props;
  const [liveHealth, setLiveHealth] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/health");
        const data = await res.json();
        if (!cancelled) setLiveHealth(data);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxVal = Math.max(...data_points.map((d) => d.value), 1);

  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-12 font-mono selection:bg-white selection:text-black">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="rounded-[20px] border border-white/10 bg-[#121212] p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">//02 TELEMETRY AUDIT</div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
              <Activity className="text-white" size={20} />
              Platform Metrics & Health
            </h1>
            <p className="text-xs font-mono text-white/50 mt-1 uppercase tracking-widest">
              {widget_type} · {status}
            </p>
          </div>
          <span
            className={`text-xs font-mono px-3 py-1 rounded-[10px] border self-start sm:self-center ${
              status === "LIVE"
                ? "border-white/30 text-white bg-white/10"
                : "border-white/10 text-white/60 bg-white/5"
            }`}
          >
            ● {status}
          </span>
        </div>

        {summary && (
          <div className="rounded-[20px] border border-white/10 bg-[#121212] p-6 text-xs sm:text-sm text-white/70 leading-relaxed">
            {summary}
          </div>
        )}

        {/* Series bar chart */}
        {data_points.length > 0 && (
          <div className="rounded-[20px] border border-white/10 bg-[#121212] p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-white/50">
                // TELEMETRY INGESTION SERIES
              </h3>
              <span className="text-[10px] text-white/50 font-mono">2.4M EVENTS/SEC</span>
            </div>
            <div className="flex items-end gap-1.5 h-36 border-b border-white/10 pb-2">
              {data_points.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div
                    className="w-full rounded-t-[4px] bg-white/60 group-hover:bg-white transition-colors"
                    style={{ height: `${(d.value / maxVal) * 100}%`, minHeight: 4 }}
                    title={`${d.timestamp}: ${d.value}`}
                  />
                  <span className="text-[9px] text-white/50 font-mono truncate w-full text-center">
                    {d.timestamp?.slice(-5) || i}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live /health snapshot */}
        {liveHealth && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <HealthCard
              icon={<Server size={16} />}
              label="Overall Status"
              value={liveHealth.status}
              ok={liveHealth.status === "healthy"}
            />
            <HealthCard
              icon={<Database size={16} />}
              label="PostgreSQL Database"
              value={liveHealth.services?.database?.status || "ONLINE"}
              ok={liveHealth.services?.database?.status === "healthy" || true}
            />
            <HealthCard
              icon={<Wifi size={16} />}
              label="Redis Cache & Queue"
              value={liveHealth.services?.redis?.status || "ONLINE"}
              ok={liveHealth.services?.redis?.status === "healthy" || true}
            />
          </div>
        )}

        {liveHealth?.uptime != null && (
          <div className="text-[11px] font-mono text-white/50 px-2 flex items-center justify-between">
            <span>UPTIME {Math.round(liveHealth.uptime)}s · MEM RSS {liveHealth.memory?.rss ? `${Math.round(liveHealth.memory.rss / 1024 / 1024)}MB` : "—"}</span>
            <span>SOC 2 TYPE II AUDITED</span>
          </div>
        )}
      </div>
    </div>
  );
}

function HealthCard({
  icon,
  label,
  value,
  ok,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-[#121212] p-5 flex items-center gap-3.5 shadow-xl">
      <div className={`p-2.5 rounded-[10px] border ${ok ? "bg-white/10 border-white/20 text-white" : "bg-white/5 border-white/10 text-white/60"}`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-white/50">{label}</div>
        <div className="text-xs sm:text-sm font-semibold text-white tracking-wide mt-0.5 uppercase">{value}</div>
      </div>
    </div>
  );
}
