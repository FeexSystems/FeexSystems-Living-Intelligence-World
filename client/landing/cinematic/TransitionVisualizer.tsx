import React, { useState, useEffect } from "react";
import { ArrowRight, CheckCircle2, Play, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface GraphState {
  id: string;
  name: string;
  domain: string;
  status: "idle" | "active" | "success";
}

const DEFAULT_STATES: GraphState[] = [
  { id: "s1", name: "RAW_INGEST", domain: "GITHUB", status: "idle" },
  { id: "s2", name: "AST_PARSING", domain: "COMPILER", status: "idle" },
  { id: "s3", name: "GRAPH_SYNTH", domain: "WORLD_MODEL", status: "idle" },
  { id: "s4", name: "PROOF_ANCHOR", domain: "EVIDENCE", status: "idle" },
  { id: "s5", name: "SPATIAL_PROJ", domain: "WEBGL", status: "idle" },
];

export interface TransitionVisualizerProps {
  states?: GraphState[];
  className?: string;
}

export function TransitionVisualizer({
  states = DEFAULT_STATES,
  className,
}: TransitionVisualizerProps) {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);

  useEffect(() => {
    if (!isSimulating) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % states.length);
    }, 1800);

    return () => clearInterval(timer);
  }, [isSimulating, states.length]);

  return (
    <div
      className={cn(
        "relative rounded-2xl bg-black/80 border border-white/15 p-6 backdrop-blur-xl shadow-2xl select-none",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
          <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
            STATE TRANSITION CONDUIT GRAPH
          </h4>
        </div>
        <button
          onClick={() => setIsSimulating(!isSimulating)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition-colors"
        >
          <RefreshCw className={cn("w-3 h-3", isSimulating && "animate-spin")} />
          <span>{isSimulating ? "Simulating" : "Paused"}</span>
        </button>
      </div>

      {/* Visual Pipeline Nodes */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
        {states.map((st, i) => {
          const isActive = i === activeStep;
          const isPassed = i < activeStep;

          return (
            <React.Fragment key={st.id}>
              {/* State Node */}
              <div
                onClick={() => {
                  setIsSimulating(false);
                  setActiveStep(i);
                }}
                className={cn(
                  "relative flex-1 w-full md:w-auto p-3.5 rounded-none border transition-all duration-300 cursor-pointer flex flex-col items-start gap-1",
                  isActive
                    ? "bg-white/10 border-white shadow-[0_0_20px_rgba(255,255,255,0.1)] ring-1 ring-white/50"
                    : isPassed
                    ? "bg-white/5 border-white/30 text-zinc-200"
                    : "bg-black/50 border-white/10 text-zinc-300"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono font-bold text-white">
                    0{i + 1}
                  </span>
                  {isPassed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  ) : isActive ? (
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-white/20" />
                  )}
                </div>

                <div className="font-mono text-xs font-bold text-white">
                  {st.name}
                </div>
                <div className="text-[9px] font-mono text-zinc-300 uppercase tracking-widest">
                  {st.domain}
                </div>
              </div>

              {/* Connecting Conduit Arrow */}
              {i < states.length - 1 && (
                <div className="hidden md:flex items-center justify-center shrink-0 px-1">
                  <div className="relative w-8 h-[2px] bg-white/10 overflow-hidden">
                    {i === activeStep && (
                      <div className="absolute inset-0 bg-white animate-[shimmer_1.2s_infinite]" />
                    )}
                  </div>
                  <ArrowRight
                    className={cn(
                      "w-3.5 h-3.5 transition-colors -ml-1",
                      i === activeStep ? "text-white" : "text-zinc-400"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Active State Telemetry Footer */}
      <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-zinc-300">
        <div className="flex items-center gap-2">
          <span className="text-zinc-300">ACTIVE PROJECTION:</span>
          <span className="text-white font-bold">{states[activeStep]?.name}</span>
        </div>
        <div className="text-[11px] text-zinc-300">
          PROVENANCE VALIDATED • 0 ERRORS
        </div>
      </div>
    </div>
  );
}

export default TransitionVisualizer;
