import "react";
import { AlertTriangle } from "lucide-react";

export function ErrorStage({ message }: { message?: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center font-mono selection:bg-white selection:text-black">
      <div className="max-w-md w-full rounded-[20px] border border-white/10 bg-[#121212] p-8 shadow-2xl flex flex-col items-center">
        <div className="inline-flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 mb-5">
          <span className="size-1.5 rounded-full bg-white animate-pulse" />
          <span>// ERROR DIRECTIVE · PIPELINE NOTICE</span>
        </div>
        <div className="p-3.5 rounded-[10px] bg-white/5 border border-white/10 text-white mb-4">
          <AlertTriangle className="size-6 text-white" />
        </div>
        <h2 className="text-base font-bold text-white tracking-tight">Omni-Command Stage Exception</h2>
        <p className="mt-2.5 text-xs text-white/60 leading-relaxed font-mono">
          {message || "An exception occurred while querying or streaming from the authoritative World Model."}
        </p>
      </div>
    </div>
  );
}
