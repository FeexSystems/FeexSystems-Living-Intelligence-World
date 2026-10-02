import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ScrollZoomRevealProps {
  children: React.ReactNode;
  className?: string;
  initialScale?: number;
  initialRotateX?: number;
}

export function ScrollZoomReveal({
  children,
  className,
  initialScale = 0.88,
  initialRotateX = 12,
}: ScrollZoomRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate progress based on distance to viewport center
      const elementCenter = rect.top + rect.height / 2;
      const windowCenter = windowHeight / 2;
      const distanceFromCenter = Math.abs(elementCenter - windowCenter);

      const maxDistance = windowHeight * 0.7;
      const normalized = Math.max(0, 1 - distanceFromCenter / maxDistance);
      setProgress(normalized);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const currentScale = initialScale + (1 - initialScale) * progress;
  const currentRotate = initialRotateX * (1 - progress);
  const currentOpacity = 0.5 + progress * 0.5;
  const currentRadius = 32 - progress * 16;

  return (
    <div
      ref={containerRef}
      className={cn("w-full transition-transform duration-100 ease-out [perspective:1000px]", className)}
      style={{
        transform: `scale(${currentScale}) rotateX(${currentRotate}deg)`,
        opacity: currentOpacity,
        borderRadius: `${currentRadius}px`,
        transformOrigin: "center center",
      }}
    >
      {children}
    </div>
  );
}

export default ScrollZoomReveal;
