import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ScrollSyncedTextProps {
  text: string;
  className?: string;
  highlightColor?: string;
  inactiveColor?: string;
}

export function ScrollSyncedText({
  text,
  className,
  highlightColor = "#ffffff",
  inactiveColor = "rgba(255, 255, 255, 0.18)",
}: ScrollSyncedTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const words = text.split(" ");

  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Start revealing when top is at 80% of window, fully revealed when bottom reaches 35%
      const start = windowHeight * 0.85;
      const end = windowHeight * 0.25;

      const totalDistance = start - end;
      const current = start - rect.top;
      const progress = Math.max(0, Math.min(1, current / totalDistance));

      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative font-mono text-2xl md:text-4xl lg:text-5xl font-bold leading-relaxed tracking-tight select-none my-12",
        className
      )}
    >
      {words.map((word, idx) => {
        const wordThreshold = idx / words.length;
        const isRevealed = scrollProgress >= wordThreshold;
        const proximity = Math.max(
          0,
          Math.min(1, (scrollProgress - wordThreshold) * words.length)
        );

        return (
          <span
            key={idx}
            className="inline-block mr-[0.3em] transition-colors duration-200"
            style={{
              color: isRevealed ? highlightColor : inactiveColor,
              textShadow:
                isRevealed && proximity > 0.8
                  ? `0 0 20px ${highlightColor}`
                  : "none",
              opacity: isRevealed ? 1 : 0.25,
              transform: isRevealed ? "translateY(0)" : "translateY(4px)",
              transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}

export default ScrollSyncedText;
