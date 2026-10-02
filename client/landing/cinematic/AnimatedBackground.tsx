import React from "react";
import { cn } from "@/lib/utils";

export interface AnimatedBackgroundProps {
  theme?: "cyber" | "matrix" | "violet" | "aurora";
  intensity?: "low" | "medium" | "high";
  blurAmount?: "sm" | "md" | "lg";
  className?: string;
}

export function AnimatedBackground({
  theme = "cyber",
  intensity = "medium",
  blurAmount = "lg",
  className,
}: AnimatedBackgroundProps) {
  const themeColors = {
    cyber: {
      orb1: "bg-white/10",
      orb2: "bg-gray-400/5",
      orb3: "bg-white/5",
      orb4: "bg-gray-500/10",
    },
    matrix: {
      orb1: "bg-white/10",
      orb2: "bg-gray-400/5",
      orb3: "bg-white/5",
      orb4: "bg-gray-500/10",
    },
    violet: {
      orb1: "bg-white/10",
      orb2: "bg-gray-400/5",
      orb3: "bg-white/5",
      orb4: "bg-gray-500/10",
    },
    aurora: {
      orb1: "bg-white/10",
      orb2: "bg-gray-400/5",
      orb3: "bg-white/5",
      orb4: "bg-gray-500/10",
    },
  };

  const opacityClass = {
    low: "opacity-40",
    medium: "opacity-70",
    high: "opacity-100",
  }[intensity];

  const blurClass = {
    sm: "blur-2xl",
    md: "blur-3xl",
    lg: "blur-[100px]",
  }[blurAmount];

  const colors = themeColors[theme];

  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none select-none z-0",
        opacityClass,
        className
      )}
      aria-hidden="true"
    >
      {/* Orb 1 */}
      <div
        className={cn(
          "absolute -top-[20%] -left-[10%] w-[55vw] h-[55vw] rounded-full animate-[pulse_8s_ease-in-out_infinite]",
          colors.orb1,
          blurClass
        )}
      />

      {/* Orb 2 */}
      <div
        className={cn(
          "absolute top-[25%] -right-[15%] w-[50vw] h-[50vw] rounded-full animate-[pulse_10s_ease-in-out_infinite_2s]",
          colors.orb2,
          blurClass
        )}
      />

      {/* Orb 3 */}
      <div
        className={cn(
          "absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] rounded-full animate-[pulse_12s_ease-in-out_infinite_4s]",
          colors.orb3,
          blurClass
        )}
      />

      {/* Orb 4 (Center Ambient) */}
      <div
        className={cn(
          "absolute top-[40%] left-[30%] w-[40vw] h-[40vw] rounded-full animate-[pulse_9s_ease-in-out_infinite_1s]",
          colors.orb4,
          blurClass
        )}
      />

      {/* Cyber Grid Texture Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
    </div>
  );
}

export default AnimatedBackground;
