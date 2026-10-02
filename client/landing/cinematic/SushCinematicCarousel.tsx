import React, { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CarouselItem {
  id: string;
  title: string;
  category: string;
  description: string;
  metric?: string;
  image?: string;
  tags?: string[];
  link?: string;
}

const DEFAULT_ITEMS: CarouselItem[] = [
  {
    id: "world-model",
    title: "Canonical World Model",
    category: "Topology Engine",
    description: "Multi-relational graph anchoring projects, repositories, and technologies in immutable evidence.",
    metric: "13 Nodes • 17 Edges",
    tags: ["Prisma", "PostgreSQL", "Graph Engine"],
  },
  {
    id: "evidence-fabric",
    title: "Cryptographic Evidence Ledger",
    category: "Provenance",
    description: "Every architectural assertion traceable to an exact git commit SHA, file path, and observation timestamp.",
    metric: "100% Verified",
    tags: ["SHA-256", "Audit Trail", "HMAC"],
  },
  {
    id: "omni-stage",
    title: "Agentic Omni-Command",
    category: "Multi-Agent System",
    description: "Autonomous agent execution stage streaming live multi-turn reasoning traces and tool invocations.",
    metric: "Sub-50ms SSE",
    tags: ["Streaming", "Agent Leasing", "Tool Calling"],
  },
  {
    id: "spatial-world",
    title: "3D Knowledge Galaxy",
    category: "Spatial UI",
    description: "Interactive WebGL environment visualizing engineering nodes, neural conduits, and domain clustering.",
    metric: "60 FPS WebGL",
    tags: ["Three.js", "Custom Shaders", "R3F"],
  },
  {
    id: "ai-navigator",
    title: "Grounded AI Navigator",
    category: "Retrieval",
    description: "Provider-neutral retrieval interface with direct cited references from synced project codebases.",
    metric: "Zero Hallucination",
    tags: ["Vector Search", "Grounded AI", "Context"],
  },
];

export interface SushCinematicCarouselProps {
  items?: CarouselItem[];
  className?: string;
}

export function SushCinematicCarousel({
  items = DEFAULT_ITEMS,
  className,
}: SushCinematicCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  const prev = () => {
    setActiveIndex((current) => (current === 0 ? items.length - 1 : current - 1));
  };

  const next = () => {
    setActiveIndex((current) => (current === items.length - 1 ? 0 : current + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    if (diff > 50) prev();
    if (diff < -50) next();
    touchStartXRef.current = null;
  };

  return (
    <div
      className={cn("relative w-full max-w-6xl mx-auto py-10 select-none overflow-hidden", className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 3D Depth Stage */}
      <div className="relative h-[380px] flex items-center justify-center [perspective:1200px]">
        {items.map((item, idx) => {
          const offset = idx - activeIndex;
          const isActive = offset === 0;

          // Compute 3D coverflow transform
          let translateX = offset * 280;
          let translateZ = -Math.abs(offset) * 160;
          let rotateY = offset * -22;
          let opacity = Math.max(0.1, 1 - Math.abs(offset) * 0.45);
          let zIndex = 20 - Math.abs(offset);

          // Wrap around logic for small sets
          if (Math.abs(offset) > 2) {
            opacity = 0;
            translateX = offset > 0 ? 600 : -600;
          }

          return (
            <div
              key={item.id}
              onClick={() => setActiveIndex(idx)}
              aria-hidden={!isActive}
              className={cn(
                "absolute w-[320px] sm:w-[380px] h-[340px] rounded-2xl p-6 transition-all duration-500 ease-out cursor-pointer flex flex-col justify-between border backdrop-blur-xl",
                isActive
                  ? "bg-gradient-to-b from-[#121520] to-[#090b12] border-white/30 shadow-[0_20px_50px_rgba(255,255,255,0.15)] ring-1 ring-white/20"
                  : "bg-[#0c0e17]/80 border-white/10 hover:border-white/20"
              )}
              style={{
                transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
                opacity,
                zIndex,
              }}
            >
              {/* Header */}
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className="text-zinc-100 font-semibold uppercase tracking-wider">
                    {item.category}
                  </span>
                  {item.metric && (
                    <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-zinc-100 font-mono text-[11px]">
                      {item.metric}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold font-mono text-white mb-2 leading-tight">
                  {item.title}
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3">
                  {item.description}
                </p>
              </div>

              {/* Tags & Action */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {item.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-[10px] font-mono rounded bg-white/10 text-zinc-200 border border-white/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div
                  className={cn(
                    "p-2 rounded-full border transition-colors",
                    isActive
                      ? "bg-white text-black border-white"
                      : "bg-white/10 text-zinc-200 border-white/20"
                  )}
                >
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Controls & Dots */}
      <div className="mt-6 flex items-center justify-center gap-6">
        <button
          onClick={prev}
          className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white transition-colors"
          aria-label="Previous card"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === activeIndex
                  ? "w-8 bg-white shadow-[0_0_8px_#ffffff]"
                  : "w-2 bg-white/20 hover:bg-white/40"
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white transition-colors"
          aria-label="Next card"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default SushCinematicCarousel;
