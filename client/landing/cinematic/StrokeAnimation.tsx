import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface StrokeAnimationProps {
  variant?: "neural" | "circuit" | "cube" | "infinity";
  strokeColor?: string;
  strokeWidth?: number;
  duration?: number; // seconds
  autoPlay?: boolean;
  className?: string;
  width?: number;
  height?: number;
}

export function StrokeAnimation({
  variant = "neural",
  strokeColor = "#ffffff",
  strokeWidth = 2,
  duration = 3,
  autoPlay = true,
  className,
  width,
  height,
}: StrokeAnimationProps) {
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const paths = {
    neural: [
      "M 20 100 Q 80 20 150 100 T 280 100",
      "M 20 100 Q 80 180 150 100 T 280 100",
      "M 150 20 L 150 180",
      "M 50 50 L 250 150",
      "M 50 150 L 250 50",
    ],
    circuit: [
      "M 20 50 H 80 V 120 H 160 V 40 H 220 V 150 H 280",
      "M 40 150 H 120 V 80 H 200 V 160 H 260",
      "M 100 20 V 60 H 180 V 180",
    ],
    cube: [
      "M 150 30 L 250 85 L 250 195 L 150 250 L 50 195 L 50 85 Z",
      "M 150 30 L 150 140 L 250 195",
      "M 150 140 L 50 195",
      "M 150 140 L 250 85",
    ],
    infinity: [
      "M 80 100 C 80 60 120 60 150 100 C 180 140 220 140 220 100 C 220 60 180 60 150 100 C 120 140 80 140 80 100 Z",
    ],
  }[variant];

  return (
    <div
      ref={containerRef}
      className={cn("relative flex items-center justify-center select-none", className)}
    >
      <svg
        viewBox="0 0 300 200"
        className="w-full h-full max-w-sm overflow-visible drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]"
      >
        <defs>
          <linearGradient id={`stroke-grad-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#888888" />
            <stop offset="100%" stopColor="#444444" />
          </linearGradient>
          <filter id={`glow-${variant}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={`url(#stroke-grad-${variant})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#glow-${variant})`}
            className={cn(
              "transition-all duration-1000",
              inView || autoPlay
                ? "animate-[strokeDraw_3s_ease-in-out_infinite_alternate]"
                : "opacity-20"
            )}
            style={{
              strokeDasharray: 600,
              strokeDashoffset: inView || autoPlay ? 0 : 600,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${duration}s`,
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export default StrokeAnimation;
