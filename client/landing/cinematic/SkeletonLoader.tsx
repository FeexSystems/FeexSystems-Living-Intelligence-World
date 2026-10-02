import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "card" | "text" | "avatar" | "stats" | "terminal" | "default";
  glow?: boolean;
  className?: string;
  lines?: number;
  count?: number;
}

export function SkeletonLoader({
  variant = "default",
  glow = true,
  className,
  lines = 3,
  count,
  ...props
}: SkeletonLoaderProps) {
  if (count && count > 1) {
    return (
      <div className={cn("grid gap-4", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonLoader key={i} variant={variant} glow={glow} lines={lines} {...props} />
        ))}
      </div>
    );
  }

  const shimmerClasses =
    "relative overflow-hidden bg-white/[0.04] border border-white/[0.08] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.08] before:to-transparent";

  if (variant === "card") {
    return (
      <div
        className={cn(
          "rounded-xl p-5 space-y-4",
          shimmerClasses,
          glow && "shadow-[0_0_15px_rgba(255,255,255,0.05)]",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/10" />
          <div className="w-16 h-4 rounded bg-white/10" />
        </div>
        <div className="space-y-2">
          <div className="w-3/4 h-5 rounded bg-white/15" />
          <div className="w-full h-3.5 rounded bg-white/10" />
          <div className="w-5/6 h-3.5 rounded bg-white/10" />
        </div>
        <div className="pt-2 flex items-center gap-2">
          <div className="w-14 h-4 rounded bg-white/20" />
          <div className="w-14 h-4 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  if (variant === "stats") {
    return (
      <div
        className={cn("rounded-lg p-4 space-y-2", shimmerClasses, className)}
        {...props}
      >
        <div className="w-20 h-3 rounded bg-white/10" />
        <div className="w-32 h-7 rounded bg-white/20" />
        <div className="w-16 h-2.5 rounded bg-white/20" />
      </div>
    );
  }

  if (variant === "terminal") {
    return (
      <div
        className={cn(
          "rounded-lg p-4 font-mono text-xs space-y-2.5 bg-black/80 border border-white/10",
          shimmerClasses,
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-1.5 pb-2 border-b border-white/10">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
          <div className="w-28 h-3 ml-2 rounded bg-white/10" />
        </div>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded bg-white/10"
            style={{ width: `${60 + ((i * 19) % 35)}%` }}
          />
        ))}
      </div>
    );
  }

  if (variant === "avatar") {
    return (
      <div
        className={cn("w-10 h-10 rounded-full", shimmerClasses, className)}
        {...props}
      />
    );
  }

  if (variant === "text") {
    return (
      <div className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn("h-3.5 rounded", shimmerClasses)}
            style={{ width: i === lines - 1 ? "60%" : "100%" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-md h-6 w-full", shimmerClasses, className)}
      {...props}
    />
  );
}

export default SkeletonLoader;
