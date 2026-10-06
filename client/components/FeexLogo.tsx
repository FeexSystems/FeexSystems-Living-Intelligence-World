import React from "react";

interface FeexMasterMarkProps {
  size?: number | string;
  className?: string;
  glow?: boolean;
}

/**
 * FEEXSYSTEMS Master Mark
 * Canonical 16x16 modular matrix with 45° isometric cutaways,
 * concentric orbital telemetry arcs, and quantum state indicator.
 */
export function FeexMasterMark({
  size = 36,
  className = "",
  glow = true,
}: FeexMasterMarkProps) {
  return (
    <img 
      src="/media/brand/FX_logo_monochrome_noir_transparent.png" 
      alt="FX" 
      width={size} 
      height={size} 
      className={`inline-block select-none transition-transform duration-300 hover:scale-105 rounded-full ${glow ? 'shadow-[0_0_15px_rgba(255,255,255,0.2)]' : ''} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

interface FeexHorizontalLockupProps {
  markSize?: number;
  className?: string;
  showSubtitle?: boolean;
}

/**
 * FEEXSYSTEMS Horizontal Platform Lockup (4.5:1 ratio)
 */
export function FeexHorizontalLockup({
  markSize = 36,
  className = "",
  showSubtitle = true,
}: FeexHorizontalLockupProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <img src="/media/brand/Feexsystems_horizontal_banner_logo_transparent.webp" alt="FeexSystems" className="h-8 w-auto object-contain" style={{ height: markSize }} />
      {showSubtitle && (
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase">
            Living Engineering Intelligence
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * World Model Provenance Pill
 */
export function FeexWorldBadge({
  sha = "sha-canonical",
  status = "SYNC 100%",
  className = "",
}: {
  sha?: string;
  status?: string;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-[10px] bg-[#121212] border border-white/10 text-xs font-mono shadow-sm backdrop-blur-md ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
      </span>
      <span className="text-white/40 uppercase tracking-wider text-[10px]">
        EVIDENCE:
      </span>
      <span className="text-white font-medium hover:text-white/80 cursor-pointer transition-colors">
        {sha}
      </span>
      <span className="text-white/20">|</span>
      <span className="text-white/80 text-[10px] font-semibold">{status}</span>
    </div>
  );
}
