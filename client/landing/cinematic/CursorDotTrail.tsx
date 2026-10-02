import React, { useEffect, useRef } from "react";

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}

export interface CursorDotTrailProps {
  dotColor?: string;
  trailColor?: string;
  maxPoints?: number;
  dotSize?: number;
  sparkle?: boolean;
}

export function CursorDotTrail({
  dotColor,
  trailColor = "#ffffff",
  maxPoints = 24,
  dotSize = 3,
  sparkle = true,
}: CursorDotTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const mouseRef = useRef<{ x: number; y: number; prevX: number; prevY: number; active: boolean }>({
    x: -100,
    y: -100,
    prevX: -100,
    prevY: -100,
    active: false,
  });
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Check for reduced motion or touch device
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches || "ontouchstart" in window || navigator.maxTouchPoints > 0) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const mouse = mouseRef.current;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;

      const dx = mouse.x - mouse.prevX;
      const dy = mouse.y - mouse.prevY;
      const speed = Math.sqrt(dx * dx + dy * dy);

      // Add points to trail
      if (pointsRef.current.length < maxPoints) {
        pointsRef.current.push({
          x: mouse.x,
          y: mouse.y,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          alpha: 0.9,
          size: Math.min(dotSize + speed * 0.08, dotSize * 2.5),
          color: sparkle && Math.random() > 0.6 ? "#888888" : trailColor,
        });
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const points = pointsRef.current;
      for (let i = points.length - 1; i >= 0; i--) {
        const pt = points[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha *= 0.91; // smooth fade decay
        pt.size *= 0.95;

        if (pt.alpha < 0.02 || pt.size < 0.4) {
          points.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.alpha;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = pt.size * 3;
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [trailColor, maxPoints, dotSize, sparkle]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50 mix-blend-screen"
      aria-hidden="true"
    />
  );
}

export default CursorDotTrail;
