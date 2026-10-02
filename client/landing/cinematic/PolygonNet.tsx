import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface NetNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  originalVx: number;
  originalVy: number;
}

export interface PolygonNetProps {
  nodeCount?: number;
  maxDistance?: number;
  nodeColor?: string;
  edgeColor?: string;
  mouseRepelRadius?: number;
  className?: string;
}

export function PolygonNet({
  nodeCount = 55,
  maxDistance = 120,
  nodeColor = "#ffffff",
  edgeColor = "rgba(255, 255, 255, 0.15)",
  mouseRepelRadius = 150,
  className,
}: PolygonNetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const isVisibleRef = useRef(true);
  const nodesRef = useRef<NetNode[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -1000,
    y: -1000,
    active: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Viewport observer
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    const initNodes = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      const nodes: NetNode[] = [];
      for (let i = 0; i < nodeCount; i++) {
        const vx = (Math.random() - 0.5) * 0.7;
        const vy = (Math.random() - 0.5) * 0.7;
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx,
          vy,
          originalVx: vx,
          originalVy: vy,
          radius: Math.random() * 1.8 + 1.2,
        });
      }
      nodesRef.current = nodes;
    };

    initNodes();
    window.addEventListener("resize", initNodes);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Ripple impulse
      nodesRef.current.forEach((node) => {
        const dx = node.x - clickX;
        const dy = node.y - clickY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200 && dist > 0) {
          const force = (1 - dist / 200) * 8;
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;
        }
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    canvas.addEventListener("click", handleClick);

    const render = () => {
      if (!isVisibleRef.current) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const nodes = nodesRef.current;
      const mouse = mouseRef.current;
      const width = canvas.width;
      const height = canvas.height;

      // Update positions
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Mouse repulsion
        if (mouse.active) {
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouseRepelRadius && dist > 0) {
            const force = (1 - dist / mouseRepelRadius) * 2;
            node.x += (dx / dist) * force;
            node.y += (dy / dist) * force;
          }
        }

        // Return slowly towards original velocities
        node.vx += (node.originalVx - node.vx) * 0.02;
        node.vy += (node.originalVy - node.vy) * 0.02;

        node.x += node.vx;
        node.y += node.vy;

        // Bounce on borders
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.shadowColor = nodeColor;
        ctx.shadowBlur = 4;
        ctx.fill();
      }

      // Draw interconnecting edges
      ctx.lineWidth = 0.8;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.4;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.stroke();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", initNodes);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("click", handleClick);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [nodeCount, maxDistance, nodeColor, edgeColor, mouseRepelRadius]);

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden pointer-events-auto select-none z-0", className)}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />
    </div>
  );
}

export default PolygonNet;
