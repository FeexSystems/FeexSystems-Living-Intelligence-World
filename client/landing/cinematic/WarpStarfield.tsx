import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface WarpStarfieldProps {
  starCount?: number;
  speed?: number;
  perspective?: number;
  spread?: number;
  streak?: number;
  streakMinPx?: number;
  size?: number;
  sizeRandomness?: number;
  twinkle?: number;
  twinkleSpeed?: number;
  parallax?: number;
  smoothing?: number;
  background?: string;
  starColor?: string;
  starAlpha?: number;
  useDevicePixelRatio?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

interface Star {
  x: number;
  y: number;
  z: number;
  s: number;
  t: number;
}

export function WarpStarfield({
  starCount = 700,
  speed = 0.45,
  perspective = 0.9,
  spread = 1.1,
  streak = 0.75,
  streakMinPx = 2,
  size = 1,
  sizeRandomness = 0.35,
  twinkle = 0.15,
  twinkleSpeed = 2.2,
  parallax = 0.08,
  smoothing = 0.82,
  background = "transparent",
  starColor = "#FFFFFF",
  starAlpha = 0.85,
  useDevicePixelRatio = true,
  className,
  style,
}: WarpStarfieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const starsRef = useRef<Star[]>([]);
  const mouse01Ref = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const centerRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const sizeRef = useRef<{ w: number; h: number; dpr: number }>({ w: 0, h: 0, dpr: 1 });
  const lastTRef = useRef<number>(0);
  const lastSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const inViewRef = useRef<boolean>(true);
  const [hasPointer, setHasPointer] = useState<boolean>(false);

  // PRNG
  const seededRand = useMemo(() => {
    let seed = Math.floor(Math.random() * 1e9);
    return () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  }, []);

  const rebuildStars = (count: number, w: number, h: number) => {
    const next: Star[] = new Array(Math.max(1, Math.floor(count)));
    const ww = Math.max(1, w);
    const hh = Math.max(1, h);
    for (let i = 0; i < next.length; i++) {
      next[i] = {
        x: (seededRand() * 2 - 1) * ww * spread,
        y: (seededRand() * 2 - 1) * hh * spread,
        z: Math.max(1, seededRand() * ww),
        s: seededRand(),
        t: seededRand(),
      };
    }
    starsRef.current = next;
  };

  useEffect(() => {
    const { w, h } = sizeRef.current;
    rebuildStars(starCount, w || 800, h || 450);
  }, [starCount, spread, seededRand]);

  // Viewport intersection observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Resize handler
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setCanvasSize = () => {
      const rect = el.getBoundingClientRect();
      const dpr = useDevicePixelRatio ? Math.max(1, Math.min(2.5, window.devicePixelRatio || 1)) : 1;
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    setCanvasSize();

    let ro: ResizeObserver | null = null;
    if (typeof window.ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => setCanvasSize());
      ro.observe(el);
    } else {
      window.addEventListener("resize", setCanvasSize);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", setCanvasSize);
    };
  }, [useDevicePixelRatio]);

  // Pointer interactions
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = containerRef.current;
    if (!el) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0.5;
      const y = rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0.5;
      mouse01Ref.current = {
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
      };
    };

    const handlePointerEnter = () => setHasPointer(true);
    const handlePointerLeave = () => {
      mouse01Ref.current = { x: 0.5, y: 0.5 };
      setHasPointer(false);
    };

    el.addEventListener("pointermove", handlePointerMove, { passive: true });
    el.addEventListener("pointerenter", handlePointerEnter, { passive: true });
    el.addEventListener("pointerleave", handlePointerLeave, { passive: true });

    return () => {
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerenter", handlePointerEnter);
      el.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  // Animation draw loop
  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const stop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const draw = (t: number) => {
      if (!inViewRef.current) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const { w, h } = sizeRef.current;
      if (w <= 0 || h <= 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const ls = lastSizeRef.current;
      if (ls.w !== w || ls.h !== h) {
        lastSizeRef.current = { w, h };
        rebuildStars(starCount, w, h);
      }

      const lastT = lastTRef.current || t;
      lastTRef.current = t;
      const dtMs = Math.min(50, Math.max(0, t - lastT));
      const dt = dtMs / 1000;

      // Smooth center parallax
      const target = hasPointer ? mouse01Ref.current : { x: 0.5, y: 0.5 };
      const c = centerRef.current;
      const s = Math.max(0, Math.min(1, smoothing));
      c.x = c.x + (target.x - c.x) * (1 - s);
      c.y = c.y + (target.y - c.y) * (1 - s);
      centerRef.current = c;

      // Clear
      if (background === "transparent") {
        ctx.clearRect(0, 0, w, h);
      } else {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, w, h);
      }

      const baseCx = w * 0.5;
      const baseCy = h * 0.5;
      const pxShift = (c.x - 0.5) * parallax * w;
      const pyShift = (c.y - 0.5) * parallax * h;
      const cx = baseCx + pxShift;
      const cy = baseCy + pyShift;

      const dz = Math.max(0, speed) * 900 * dt;
      const stars = starsRef.current;
      ctx.strokeStyle = starColor;
      ctx.fillStyle = starColor;
      ctx.lineCap = "round";

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const z0 = star.z;
        const z1 = z0 - dz;

        // Respawn if passed the viewer
        if (z1 <= 1) {
          star.x = (seededRand() * 2 - 1) * w * spread;
          star.y = (seededRand() * 2 - 1) * h * spread;
          star.z = w;
          star.s = seededRand();
          star.t = seededRand();
          continue;
        }
        star.z = z1;

        // Perspective projection
        const x1 = (star.x / z1) * w + cx;
        const y1 = (star.y / z1) * h + cy;

        if (x1 < -w * 0.25 || x1 > w * 1.25 || y1 < -h * 0.25 || y1 > h * 1.25) {
          continue;
        }

        const x0 = (star.x / z0) * w + cx;
        const y0 = (star.y / z0) * h + cy;

        const dxp = x1 - x0;
        const dyp = y1 - y0;
        const dist = Math.hypot(dxp, dyp);
        const warpFactor = Math.max(0, streak);
        const minStreak = Math.max(0, streakMinPx);
        const maxStreak = Math.max(0, Math.min(w, h) * 0.12);
        const streakLen = Math.min(maxStreak, Math.max(minStreak, dist * (1 + warpFactor * 10)));
        const allowStreak = warpFactor > 0 && dist > 1e-4 && dist < Math.min(w, h) * 0.25;

        let ux = 0;
        let uy = 0;
        if (dist > 1e-4) {
          ux = dxp / dist;
          uy = dyp / dist;
        }
        const sx = x1 - ux * streakLen;
        const sy = y1 - uy * streakLen;
        const depth = 1 - z1 / Math.max(1, w);

        const tw = Math.max(0, Math.min(1, twinkle));
        const twSpeed = Math.max(0, twinkleSpeed);
        const twinkleFactor =
          tw > 0
            ? 1 - tw + tw * (0.5 + 0.5 * Math.sin(t * 0.001 * twSpeed + star.t * Math.PI * 2))
            : 1;

        const rBase = Math.max(0.25, size) * (0.35 + depth * 1.8);
        const r = rBase * (1 + (star.s * 2 - 1) * Math.max(0, sizeRandomness)) * twinkleFactor;
        const a = Math.max(0.02, Math.min(1, (0.15 + depth * 0.95) * twinkleFactor));

        ctx.globalAlpha = Math.max(0, Math.min(1, starAlpha)) * a;

        // Draw streak
        if (allowStreak) {
          ctx.lineWidth = Math.max(0.5, r);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }

        // Draw head
        ctx.globalAlpha = Math.max(0, Math.min(1, starAlpha)) * Math.min(1, a + 0.15);
        ctx.beginPath();
        ctx.arc(x1, y1, Math.max(0.6, r), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => stop();
  }, [
    background,
    hasPointer,
    parallax,
    perspective,
    size,
    sizeRandomness,
    speed,
    spread,
    starAlpha,
    starColor,
    streak,
    streakMinPx,
    smoothing,
    twinkle,
    twinkleSpeed,
    seededRand,
    starCount,
  ]);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden select-none", className)}
      style={{
        ...style,
        background: background === "transparent" ? undefined : background,
        touchAction: "none",
      }}
      aria-label="Warp-speed starfield background"
      role="img"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none"
      />
    </div>
  );
}

export default WarpStarfield;
