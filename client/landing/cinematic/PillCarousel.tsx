import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PillItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

const DEFAULT_PILLS: PillItem[] = [
  { id: "all", label: "All Systems", count: 13 },
  { id: "ai", label: "Living Intelligence", count: 4 },
  { id: "webgl", label: "3D Spatial Worlds", count: 3 },
  { id: "devops", label: "DevOps & CI/CD", count: 5 },
  { id: "security", label: "Evidence Fabric", count: 2 },
  { id: "crypto", label: "Ledger & SHAs", count: 6 },
  { id: "agents", label: "Omni Agents", count: 8 },
  { id: "fullstack", label: "SaaS Ecosystem", count: 7 },
];

export interface PillCarouselProps {
  pills?: PillItem[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

export function PillCarousel({
  pills = DEFAULT_PILLS,
  selectedId = "all",
  onSelect,
  className,
}: PillCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const distance = 220;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  };

  return (
    <div className={cn("relative flex items-center gap-2 select-none w-full max-w-4xl mx-auto py-3", className)}>
      {/* Scroll Left Button */}
      <button
        onClick={() => scroll("left")}
        className="shrink-0 p-1.5 rounded-full bg-black/60 border border-white/10 hover:bg-white/10 text-zinc-200 hover:text-white transition-colors backdrop-blur-md"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Pill Scroll Area */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {pills.map((pill) => {
          const isSelected = selectedId === pill.id;
          const Icon = pill.icon;

          return (
            <button
              key={pill.id}
              onClick={() => onSelect?.(pill.id)}
              className={cn(
                "shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full font-mono text-xs tracking-wider transition-all duration-200 border whitespace-nowrap",
                isSelected
                  ? "bg-white/10 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.25)] font-semibold"
                  : "bg-black/40 border-white/10 text-zinc-300 hover:text-white hover:border-white/25 hover:bg-white/5"
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{pill.label}</span>
              {pill.count !== undefined && (
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                    isSelected
                      ? "bg-white text-black font-bold"
                      : "bg-white/10 text-zinc-300"
                  )}
                >
                  {pill.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      <button
        onClick={() => scroll("right")}
        className="shrink-0 p-1.5 rounded-full bg-black/60 border border-white/10 hover:bg-white/10 text-zinc-200 hover:text-white transition-colors backdrop-blur-md"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default PillCarousel;
