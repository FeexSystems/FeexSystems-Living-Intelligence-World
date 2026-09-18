import React from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MotionControls {
  /** True when the user paused playback via the accessible control. */
  userPaused: boolean;
  /** Accessible pause/play toggle badge. */
  toggle: React.ReactNode;
}

export const DEFAULT_CONTROLS_LABEL = "Background motion";

export interface MotionToggleProps {
  paused: boolean;
  label?: string;
  onToggle: () => void;
  className?: string;
}

export function MotionToggle({
  paused,
  label = DEFAULT_CONTROLS_LABEL,
  onToggle,
  className,
}: MotionToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={paused ? `Play ${label}` : `Pause ${label}`}
      aria-pressed={paused}
      className={cn(
        "absolute bottom-4 right-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-xs text-white/90 backdrop-blur-md transition-all hover:bg-black/90 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40",
        className
      )}
    >
      {paused ? (
        <Play className="size-3.5 fill-white text-white" />
      ) : (
        <Pause className="size-3.5 fill-white text-white" />
      )}
      <span className="font-mono text-[11px] uppercase tracking-wider text-white/80">
        {paused ? "Play" : "Pause"}
      </span>
    </button>
  );
}
