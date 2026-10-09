import "react";
import { Terminal, ShieldCheck, Activity, Cpu } from "lucide-react";

export function EmptyStage() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 md:p-12 text-center font-mono selection:bg-white selection:text-black">
      <div className="max-w-3xl flex flex-col items-center">
        {/* Uppercase Category Marker */}
        <div className="inline-flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 mb-6">
          <span className="size-1.5 rounded-full bg-white animate-pulse" />
          <span>//01 ORCHESTRATION STAGE · AWAITING DIRECTIVE</span>
        </div>

        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
          FeexSystems Living Omni Stage.
        </h1>

        {/* Subtitle */}
        <p className="mt-3 text-xs sm:text-sm text-white/60 max-w-xl leading-relaxed">
          Autonomous reasoning layer directly grounded in the authoritative World Model. Issue a command below to stream causal graphs, telemetry metrics, and verifiable evidence.
        </p>

        {/* 3 Technical Telemetry Cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
          <div className="rounded-[20px] border border-white/10 bg-[#121212] p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 mb-3">
              <span className="text-[10px] tracking-wider uppercase">//01 CAUSAL</span>
              <Cpu className="size-3.5 text-white/70" />
            </div>
            <div className="text-xs font-semibold text-white">Causal Graph Synthesis</div>
            <div className="mt-1 text-[11px] text-white/50 leading-normal">
              Map cross-repository dependencies and OpenAPI schemas in real-time.
            </div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-[#121212] p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 mb-3">
              <span className="text-[10px] tracking-wider uppercase">//02 TELEMETRY</span>
              <Activity className="size-3.5 text-white/70" />
            </div>
            <div className="text-xs font-semibold text-white">Platform Health Audit</div>
            <div className="mt-1 text-[11px] text-white/50 leading-normal">
              Query live PostgreSQL, Redis uptime, and sub-second ingestion streams.
            </div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-[#121212] p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 mb-3">
              <span className="text-[10px] tracking-wider uppercase">//03 PROVENANCE</span>
              <ShieldCheck className="size-3.5 text-white/70" />
            </div>
            <div className="text-xs font-semibold text-white">Evidence Fabric Ledger</div>
            <div className="mt-1 text-[11px] text-white/50 leading-normal">
              Anchor every claim to verified Git commit SHAs and repository paths.
            </div>
          </div>
        </div>

        {/* Live Status Bar */}
        <div className="mt-8 inline-flex items-center gap-3 text-[11px] text-white/50 border border-white/10 rounded-[10px] bg-white/[0.02] px-4 py-1.5">
          <span className="flex items-center gap-1.5 text-white/70">
            <Terminal className="size-3 text-white" />
            <span>STREAM READY</span>
          </span>
          <span>·</span>
          <span>2.4M EVENTS/SEC</span>
          <span>·</span>
          <span>0 FAILURES</span>
        </div>
      </div>
    </div>
  );
}
