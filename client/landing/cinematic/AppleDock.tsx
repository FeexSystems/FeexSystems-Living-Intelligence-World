import React, { useRef, useState, MouseEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  Globe, 
  Layers, 
  Compass, 
  ShieldCheck, 
  Terminal, 
  FlaskConical, 
  LayoutDashboard 
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DockItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

const DEFAULT_DOCK_ITEMS: DockItem[] = [
  { id: "home", label: "Home", href: "/", icon: Home },
  { id: "world", label: "Spatial Galaxy", href: "/world", icon: Globe },
  { id: "projects", label: "Projects", href: "/projects", icon: Layers },
  { id: "navigator", label: "AI Navigator", href: "/navigator", icon: Compass },
  { id: "evidence", label: "Evidence Fabric", href: "/evidence", icon: ShieldCheck },
  { id: "omni", label: "Omni Stage", href: "/omni", icon: Terminal },
  { id: "dashboard", label: "Feex Dashboard", href: "/dashboard", icon: LayoutDashboard },
];

export interface AppleDockProps {
  items?: DockItem[];
  className?: string;
  maxScale?: number; // default 1.7
  baseSize?: number; // default 40
  distanceLimit?: number; // default 100
}

export function AppleDock({
  items = DEFAULT_DOCK_ITEMS,
  className,
  maxScale = 1.6,
  baseSize = 42,
  distanceLimit = 90,
}: AppleDockProps) {
  const location = useLocation();
  const dockRef = useRef<HTMLDivElement>(null);
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!dockRef.current) return;
    const rect = dockRef.current.getBoundingClientRect();
    setMouseX(e.clientX - rect.left);
  };

  const handleMouseLeave = () => {
    setMouseX(null);
    setHoveredLabel(null);
  };

  return (
    <div
      ref={dockRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative inline-flex items-end gap-2 px-3 py-2.5 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] select-none transition-all duration-300",
        className
      )}
    >
      {/* Floating Tooltip */}
      {hoveredLabel && (
        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md bg-black/90 border border-white/20 text-[11px] font-mono text-white whitespace-nowrap shadow-md animate-in fade-in zoom-in-90 duration-100">
          {hoveredLabel}
        </div>
      )}

      {items.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;

        // Calculate magnification scale based on mouse distance
        let scale = 1;
        if (mouseX !== null && dockRef.current) {
          // Find item center relative to dock
          const itemIdx = items.indexOf(item);
          const itemCenter = itemIdx * (baseSize + 8) + baseSize / 2 + 12;
          const distance = Math.abs(mouseX - itemCenter);
          if (distance < distanceLimit) {
            const factor = Math.cos((distance / distanceLimit) * (Math.PI / 2));
            scale = 1 + (maxScale - 1) * factor;
          }
        }

        return (
          <Link
            key={item.id}
            to={item.href}
            onMouseEnter={() => setHoveredLabel(item.label)}
            className="group relative flex flex-col items-center justify-center transition-transform duration-100 ease-out origin-bottom"
            style={{
              width: `${baseSize * scale}px`,
              height: `${baseSize * scale}px`,
            }}
          >
            <div
              className={cn(
                "w-full h-full rounded-xl flex items-center justify-center border transition-all duration-200",
                isActive
                  ? "bg-white/20 border-white/50 shadow-[0_0_12px_rgba(255,255,255,0.3)] text-white"
                  : "bg-white/5 border-white/10 text-gray-400 group-hover:bg-white/15 group-hover:text-white group-hover:border-white/30"
              )}
            >
              <Icon
                className="transition-all"
                style={{
                  width: `${(baseSize * 0.48) * (scale * 0.9)}px`,
                  height: `${(baseSize * 0.48) * (scale * 0.9)}px`,
                }}
              />
            </div>

            {/* Active Route Pip Indicator */}
            {isActive && (
              <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-white shadow-[0_0_4px_#ffffff]" />
            )}
          </Link>
        );
      })}
    </div>
  );
}

export default AppleDock;
