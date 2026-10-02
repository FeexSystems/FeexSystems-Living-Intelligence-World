import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface GlobePoint {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
}

export interface ParticleGlobe3DProps {
  pointCount?: number;
  radius?: number;
  particleColor?: string;
  glowColor?: string;
  autoRotateSpeed?: number;
  className?: string;
}

export function ParticleGlobe3D({
  pointCount = 380,
  radius = 160,
  particleColor = "#ffffff",
  glowColor = "rgba(255, 255, 255, 0.4)",
  autoRotateSpeed = 0.006,
  className,
}: ParticleGlobe3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const isVisibleRef = useRef(true);
  const pointsRef = useRef<GlobePoint[]>([]);

  // Rotation state
  const rotationRef = useRef<{ rotX: number; rotY: number; isDragging: boolean; lastX: number; lastY: number }>({
    rotX: 0.2,
    rotY: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
  });

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
      canvas.height = container.clientHeight;
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    // Generate fibonacci sphere points
    const points: GlobePoint[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
    for (let i = 0; i < pointCount; i++) {
      const y = 1 - (i / (pointCount - 1)) * 2; // y goes from 1 to -1
      const r = Math.sqrt(1 - y * y); // radius at y
      const theta = phi * i; // golden angle increment

      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;

      points.push({
        baseX: x * radius,
        baseY: y * radius,
        baseZ: z * radius,
        x: 0,
        y: 0,
        z: 0,
      });
    }
    pointsRef.current = points;

    // Mouse drag rotation listeners
    const handleMouseDown = (e: MouseEvent) => {
      rotationRef.current.isDragging = true;
      rotationRef.current.lastX = e.clientX;
      rotationRef.current.lastY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!rotationRef.current.isDragging) return;
      const dx = e.clientX - rotationRef.current.lastX;
      const dy = e.clientY - rotationRef.current.lastY;
      rotationRef.current.rotY += dx * 0.008;
      rotationRef.current.rotX += dy * 0.008;
      rotationRef.current.lastX = e.clientX;
      rotationRef.current.lastY = e.clientY;
    };

    const handleMouseUp = () => {
      rotationRef.current.isDragging = false;
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    const render = () => {
      if (!isVisibleRef.current) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const rot = rotationRef.current;
      if (!rot.isDragging) {
        rot.rotY += autoRotateSpeed;
      }

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const cosY = Math.cos(rot.rotY);
      const sinY = Math.sin(rot.rotY);
      const cosX = Math.cos(rot.rotX);
      const sinX = Math.sin(rot.rotX);

      // Rotate and project points
      const points = pointsRef.current;
      const projected = [];

      for (let i = 0; i < points.length; i++) {
        const pt = points[i];

        // Rotate around Y
        let x1 = pt.baseX * cosY - pt.baseZ * sinY;
        let z1 = pt.baseZ * cosY + pt.baseX * sinY;

        // Rotate around X
        let y2 = pt.baseY * cosX - z1 * sinX;
        let z2 = z1 * cosX + pt.baseY * sinX;

        // Perspective division
        const fov = 350;
        const scale = fov / (fov + z2);
        const projX = centerX + x1 * scale;
        const projY = centerY + y2 * scale;
        const depthAlpha = Math.max(0.15, (z2 + radius) / (radius * 2));

        projected.push({
          x: projX,
          y: projY,
          z: z2,
          scale,
          alpha: depthAlpha,
        });
      }

      // Sort by depth (back to front)
      projected.sort((a, b) => a.z - b.z);

      // Draw points
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, 2.2 * p.scale), 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = p.scale * 6;
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [pointCount, radius, particleColor, glowColor, autoRotateSpeed]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-[360px] flex items-center justify-center select-none overflow-hidden cursor-grab active:cursor-grabbing",
        className
      )}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}

export default ParticleGlobe3D;
