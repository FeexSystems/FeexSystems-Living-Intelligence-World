import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ShapeType = "sphere" | "torus" | "cube" | "cylinder";

interface MorphVertex {
  // Target coordinates for each shape
  sphere: [number, number, number];
  torus: [number, number, number];
  cube: [number, number, number];
  cylinder: [number, number, number];
  // Current interpolated coordinate
  current: [number, number, number];
}

export interface GlobeMorphProps {
  vertexCount?: number;
  initialShape?: ShapeType;
  className?: string;
  autoMorph?: boolean;
}

export function GlobeMorph({
  vertexCount = 420,
  initialShape = "sphere",
  className,
  autoMorph = true,
}: GlobeMorphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeShape, setActiveShape] = useState<ShapeType>(initialShape);
  const verticesRef = useRef<MorphVertex[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const isVisibleRef = useRef(true);

  // Initialize vertices for each geometry
  useEffect(() => {
    const vertices: MorphVertex[] = [];
    const R = 130;

    for (let i = 0; i < vertexCount; i++) {
      // 1. Sphere (Fibonacci lattice)
      const yS = 1 - (i / (vertexCount - 1)) * 2;
      const rS = Math.sqrt(1 - yS * yS);
      const thetaS = Math.PI * (3 - Math.sqrt(5)) * i;
      const spherePos: [number, number, number] = [
        Math.cos(thetaS) * rS * R,
        yS * R,
        Math.sin(thetaS) * rS * R,
      ];

      // 2. Torus
      const u = (i / vertexCount) * Math.PI * 2 * 6;
      const v = (i / vertexCount) * Math.PI * 2;
      const rTube = 45;
      const rRing = 95;
      const torusPos: [number, number, number] = [
        (rRing + rTube * Math.cos(u)) * Math.cos(v),
        rTube * Math.sin(u),
        (rRing + rTube * Math.cos(u)) * Math.sin(v),
      ];

      // 3. Cube
      const side = 110;
      const face = i % 6;
      const subU = ((Math.floor(i / 6) * 17) % 100) / 50 - 1;
      const subV = ((Math.floor(i / 6) * 31) % 100) / 50 - 1;
      let cubePos: [number, number, number] = [0, 0, 0];
      if (face === 0) cubePos = [side, subU * side, subV * side];
      else if (face === 1) cubePos = [-side, subU * side, subV * side];
      else if (face === 2) cubePos = [subU * side, side, subV * side];
      else if (face === 3) cubePos = [subU * side, -side, subV * side];
      else if (face === 4) cubePos = [subU * side, subV * side, side];
      else cubePos = [subU * side, subV * side, -side];

      // 4. Cylinder
      const hCyl = ((i / vertexCount) - 0.5) * 220;
      const angleCyl = (i / vertexCount) * Math.PI * 18;
      const rCyl = 90;
      const cylPos: [number, number, number] = [
        Math.cos(angleCyl) * rCyl,
        hCyl,
        Math.sin(angleCyl) * rCyl,
      ];

      vertices.push({
        sphere: spherePos,
        torus: torusPos,
        cube: cubePos,
        cylinder: cylPos,
        current: [...spherePos],
      });
    }

    verticesRef.current = vertices;
  }, [vertexCount]);

  // Auto morph sequence
  useEffect(() => {
    if (!autoMorph) return;
    const shapes: ShapeType[] = ["sphere", "torus", "cube", "cylinder"];
    const interval = setInterval(() => {
      setActiveShape((prev) => {
        const nextIdx = (shapes.indexOf(prev) + 1) % shapes.length;
        return shapes[nextIdx];
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [autoMorph]);

  // Render loop
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

    let angleY = 0;
    let angleX = 0.2;

    const render = () => {
      if (!isVisibleRef.current) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angleY += 0.008;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      const vertices = verticesRef.current;
      const targetKey = activeShape;

      const projected = [];

      for (let i = 0; i < vertices.length; i++) {
        const v = vertices[i];
        const target = v[targetKey];

        // Morph interpolation
        v.current[0] += (target[0] - v.current[0]) * 0.04;
        v.current[1] += (target[1] - v.current[1]) * 0.04;
        v.current[2] += (target[2] - v.current[2]) * 0.04;

        // 3D rotation
        let x1 = v.current[0] * cosY - v.current[2] * sinY;
        let z1 = v.current[2] * cosY + v.current[0] * sinY;

        let y2 = v.current[1] * cosX - z1 * sinX;
        let z2 = z1 * cosX + v.current[1] * sinX;

        const fov = 380;
        const scale = fov / (fov + z2);
        projected.push({
          x: centerX + x1 * scale,
          y: centerY + y2 * scale,
          z: z2,
          scale,
        });
      }

      projected.sort((a, b) => a.z - b.z);

      // Render points
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const alpha = Math.max(0.15, (p.z + 150) / 300);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, 2.4 * p.scale), 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = alpha;
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = p.scale * 6;
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeShape]);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-[380px] flex flex-col items-center justify-center select-none", className)}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Morph Shape Buttons */}
      <div className="absolute bottom-4 flex items-center gap-1.5 p-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
        {(["sphere", "torus", "cube", "cylinder"] as ShapeType[]).map((shape) => (
          <button
            key={shape}
            onClick={() => setActiveShape(shape)}
            className={cn(
              "px-3 py-1 rounded-none text-xs font-mono uppercase tracking-wider transition-all",
              activeShape === shape
                ? "bg-white text-black font-bold shadow-[0_0_10px_#ffffff]"
                : "text-gray-400 hover:text-white"
            )}
          >
            {shape}
          </button>
        ))}
      </div>
    </div>
  );
}

export default GlobeMorph;
