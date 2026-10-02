import React from "react";
import { WarpStarfield } from "./WarpStarfield";
import { InteractionLinesBackground } from "./InteractionLinesBackground";
import { cn } from "@/lib/utils";

export interface AmbientLivingBackgroundProps {
  starCount?: number;
  speed?: number;
  showLines?: boolean;
  opacity?: number;
  fixed?: boolean;
  className?: string;
  linesOpacity?: number;
}

/**
 * AmbientLivingBackground
 * Canonical persistent cybernetic starfield + interaction lines background.
 * Uses performant HTML5 2D Canvas (zero WebGL context loss risk).
 */
export function AmbientLivingBackground({
  starCount = 500,
  speed = 0.28,
  showLines = true,
  opacity = 40,
  fixed = true,
  className,
  linesOpacity = 20,
}: AmbientLivingBackgroundProps) {
  return (
    <div
      className={cn(
        fixed ? "fixed inset-0" : "absolute inset-0",
        "z-0 pointer-events-none overflow-hidden select-none",
        className
      )}
      aria-hidden="true"
    >
      {/* 1. Warp Starfield Layer */}
      <div
        className="absolute inset-0"
        style={{ opacity: opacity / 100 }}
      >
        <WarpStarfield
          starCount={starCount}
          speed={speed}
          perspective={1.0}
          spread={1.2}
          streak={0.55}
          starColor="#FFFFFF"
          background="transparent"
          parallax={0.05}
        />
      </div>

      {/* 2. Interactive Vector Lines Layer */}
      {showLines && (
        <div
          className="absolute inset-0"
          style={{ opacity: linesOpacity / 100 }}
        >
          <InteractionLinesBackground />
        </div>
      )}
    </div>
  );
}
