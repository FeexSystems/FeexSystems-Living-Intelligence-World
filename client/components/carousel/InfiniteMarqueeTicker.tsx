import "react";
import { cn } from "@/lib/utils";
import { GitCommit, Zap, Layers } from "lucide-react";

interface MarqueeItem {
  id: string;
  label: string;
  sublabel?: string;
  type?: "commit" | "tech" | "telemetry";
  status?: string;
}

const DEFAULT_MARQUEE_ITEMS: MarqueeItem[] = [
  { id: "1", label: "feex-world-model", sublabel: "sha-feex-8a391f", type: "commit", status: "HMAC-VALID" },
  { id: "2", label: "Three.js r158", sublabel: "WebGL 2.0 / Drei Suite", type: "tech", status: "ACTIVE" },
  { id: "3", label: "Persona Operating Environment", sublabel: "0xFEEX992", type: "commit", status: "GROUNDED" },
  { id: "4", label: "Dual-Engine AI Reasoning", sublabel: "Gemini Enterprise + Claude 3.5", type: "tech", status: "ONLINE" },
  { id: "5", label: "Yurrheeler Med Advisor", sublabel: "sha-med-77bc12", type: "commit", status: "HMAC-VALID" },
  { id: "6", label: "Evidence Fabric Ingestion", sublabel: "< 14ms Real-Time Latency", type: "telemetry", status: "OPTIMAL" },
  { id: "7", label: "KappaXchangeFin Gateway", sublabel: "sha-fin-0091ef", type: "commit", status: "GROUNDED" },
  { id: "8", label: "Prisma ORM + PostgreSQL", sublabel: "Idempotent Schema v15", type: "tech", status: "ACTIVE" },
  { id: "9", label: "HoloKai Systems Labs", sublabel: "sha-holo-4321da", type: "commit", status: "GROUNDED" },
  { id: "10", label: "Bvh Raycasting Acceleration", sublabel: "60 FPS Native WebGL", type: "telemetry", status: "OPTIMAL" },
];

interface InfiniteMarqueeTickerProps {
  items?: MarqueeItem[];
  speedSeconds?: number;
  pauseOnHover?: boolean;
  className?: string;
}

export function InfiniteMarqueeTicker({
  items = DEFAULT_MARQUEE_ITEMS,
  speedSeconds = 35,
  pauseOnHover = true,
  className,
}: InfiniteMarqueeTickerProps) {
  // Duplicate array to ensure seamless infinite looping
  const duplicatedItems = [...items, ...items];

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden border-y border-white/10 bg-[#121212]/90 py-2.5 font-mono select-none backdrop-blur-md",
        className
      )}
    >
      {/* Side gradient fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-black to-transparent" />

      {/* Marquee Track */}
      <div
        className={cn(
          "flex w-max gap-8 items-center animate-marquee",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
        style={{
          animationDuration: `${speedSeconds}s`,
        }}
      >
        {duplicatedItems.map((item, idx) => (
          <div
            key={`${item.id}-${idx}`}
            className="flex items-center gap-2.5 text-xs text-white/60 border-r border-white/10 pr-8 whitespace-nowrap"
          >
            {item.type === "commit" ? (
              <GitCommit className="size-3.5 text-white/80" />
            ) : item.type === "tech" ? (
              <Layers className="size-3.5 text-white/80" />
            ) : (
              <Zap className="size-3.5 text-white/80" />
            )}

            <span className="font-bold text-white tracking-tight">{item.label}</span>
            {item.sublabel && <span className="text-zinc-300 text-[11px] font-medium">[{item.sublabel}]</span>}

            {item.status && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-[6px] bg-white/5 border border-white/10 text-white/80">
                {item.status}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default InfiniteMarqueeTicker;
