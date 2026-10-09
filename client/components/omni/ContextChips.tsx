import "react";
import { X, Crosshair } from "lucide-react";
import { useOmniStore } from "@/stores/omniStore";

export function ContextChips() {
  const { context, setContext } = useOmniStore();
  const focused = context.focusedNodeIds ?? [];

  if (!focused.length && !context.previousIntent && !context.lastQuery) {
    return null;
  }

  return (
    <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-3xl mx-auto px-4 font-mono">
      {focused.map((id) => (
        <span
          key={id}
          className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-[10px] bg-white/10 border border-white/20 text-white"
        >
          <Crosshair size={10} className="text-white/70" />
          focus:{id.length > 24 ? id.slice(0, 24) + "…" : id}
          <button
            type="button"
            className="hover:text-white/70 ml-0.5"
            onClick={() =>
              setContext({
                focusedNodeIds: focused.filter((f) => f !== id),
              })
            }
            aria-label="Clear focus"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      {context.previousIntent && (
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-[10px] bg-[#121212] border border-white/10 text-white/60">
          intent:{context.previousIntent}
        </span>
      )}
      {focused.length > 0 && (
        <button
          type="button"
          className="text-[11px] font-mono px-2.5 py-1 rounded-[10px] bg-[#121212] border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors"
          onClick={() => setContext({ focusedNodeIds: [] })}
        >
          clear focus
        </button>
      )}
    </div>
  );
}
