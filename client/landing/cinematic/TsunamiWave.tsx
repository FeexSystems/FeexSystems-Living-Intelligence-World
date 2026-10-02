import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface TsunamiWaveProps {
  waveCount?: number;
  height?: number; // canvas height in px
  primaryColor?: string;
  secondaryColor?: string;
  speed?: number;
  className?: string;
}

export function TsunamiWave({
  waveCount = 3,
  height = 180,
  primaryColor = "rgba(255, 255, 255, 0.2)",
  secondaryColor = "rgba(255, 255, 255, 0.1)",
  speed = 0.02,
  className,
}: TsunamiWaveProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    const handleResize = () => {
      canvas.width = container.clientWidth;
      canvas.height = height;
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    let step = 0;

    const waves = [
      { amplitude: 35, wavelength: 0.008, speedMult: 1.0, color: primaryColor },
      { amplitude: 25, wavelength: 0.012, speedMult: 1.4, color: secondaryColor },
      { amplitude: 18, wavelength: 0.016, speedMult: 0.7, color: "rgba(255, 255, 255, 0.05)" },
    ].slice(0, waveCount);

    const render = () => {
      if (!isVisibleRef.current) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      step += speed;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const baseLine = h * 0.55;

      waves.forEach((wave) => {
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(0, baseLine);

        for (let x = 0; x <= w; x += 3) {
          const y =
            baseLine +
            Math.sin(x * wave.wavelength + step * wave.speedMult) * wave.amplitude +
            Math.cos(x * (wave.wavelength * 0.5) + step * 0.8) * (wave.amplitude * 0.3);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, baseLine - wave.amplitude, 0, h);
        grad.addColorStop(0, wave.color);
        grad.addColorStop(1, "transparent");

        ctx.fillStyle = grad;
        ctx.fill();
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [waveCount, height, primaryColor, secondaryColor, speed]);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full overflow-hidden pointer-events-none select-none", className)}
      style={{ height: `${height}px` }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}

export default TsunamiWave;
