import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface InteractionLinesBackgroundProps {
  lineCount?: number;
  lineColor?: string;
  glowColor?: string;
  influenceRadius?: number;
  elasticity?: number;
  className?: string;
}

export function InteractionLinesBackground({
  lineCount = 28,
  lineColor = "rgba(255, 255, 255, 0.08)",
  glowColor = "rgba(255, 255, 255, 0.35)",
  influenceRadius = 140,
  elasticity = 0.6,
  className,
}: InteractionLinesBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const isVisibleRef = useRef(true);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Viewport intersection observer to pause rendering when offscreen
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    let time = 0;

    const render = () => {
      if (!isVisibleRef.current) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      time += 0.015;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const spacing = width / (lineCount + 1);
      const mouse = mouseRef.current;

      for (let i = 1; i <= lineCount; i++) {
        const baseX = i * spacing;
        const segmentCount = 30;
        const stepY = height / segmentCount;

        ctx.beginPath();
        for (let j = 0; j <= segmentCount; j++) {
          const y = j * stepY;
          let x = baseX;

          // Natural ambient harmonic sine sway
          x += Math.sin(time + j * 0.15 + i * 0.4) * 3;

          // Magnetic mouse displacement
          if (mouse.active) {
            const dx = mouse.x - baseX;
            const dy = mouse.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < influenceRadius) {
              const force = (1 - dist / influenceRadius) * elasticity * 35;
              const angle = Math.atan2(dy, dx);
              x += Math.cos(angle) * force;
            }
          }

          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        // Distance from line to mouse to calculate dynamic glow
        const lineDist = mouse.active ? Math.abs(mouse.x - baseX) : 9999;
        if (lineDist < influenceRadius) {
          const glowAlpha = (1 - lineDist / influenceRadius) * 0.8;
          ctx.strokeStyle = glowColor.replace(/[\d\.]+\)$/, `${glowAlpha})`);
          ctx.lineWidth = 1.6;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 8;
        } else {
          ctx.strokeStyle = lineColor;
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
        }

        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [lineCount, lineColor, glowColor, influenceRadius, elasticity]);

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden pointer-events-none select-none z-0", className)}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}

export default InteractionLinesBackground;
