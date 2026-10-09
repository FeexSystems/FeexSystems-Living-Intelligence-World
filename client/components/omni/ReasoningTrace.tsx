import "react";
import { ArrowRight, Loader2, Cpu } from "lucide-react";
import type { ReasoningStep } from "@shared/orchestration";

interface ReasoningTraceProps {
  steps: ReasoningStep[];
  isProcessing: boolean;
}

export function ReasoningTrace({ steps, isProcessing }: ReasoningTraceProps) {
  if (!steps.length) return null;

  return (
    <div className="absolute top-16 right-6 w-80 max-h-[70vh] overflow-y-auto pointer-events-none z-20 font-mono">
      <div className="rounded-[20px] bg-[#121212]/95 backdrop-blur-xl border border-white/15 p-3.5 shadow-2xl flex flex-col gap-2">
        <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50 px-1">
          <span className="flex items-center gap-1.5 text-white/80">
            <Cpu size={12} className="text-white" />
            <span>// REASONING TRACE</span>
          </span>
          {isProcessing ? (
            <span className="flex items-center gap-1 text-white">
              <span className="size-1.5 rounded-full bg-white animate-ping" />
              <span>STREAMING</span>
            </span>
          ) : (
            <span className="text-white/40">SYNTHESIZED</span>
          )}
        </div>

        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          return (
            <div
              key={step.id}
              className="bg-black/60 border border-white/10 rounded-[10px] p-2.5 text-xs text-white/80 flex items-start gap-2.5 animate-in fade-in slide-in-from-right-4 duration-300"
            >
              <div className="mt-0.5 text-white shrink-0">
                {isLast && isProcessing ? (
                  <Loader2 size={12} className="animate-spin text-white" />
                ) : (
                  <ArrowRight size={12} className="text-white/60" />
                )}
              </div>
              <span className="leading-snug text-white/90">{step.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
