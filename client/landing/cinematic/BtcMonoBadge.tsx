import React, { useState } from "react";
import { ShieldCheck, Copy, Check, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BtcMonoBadgeProps {
  commitSha?: string;
  hash?: string;
  blockHeight?: number;
  label?: string;
  sublabel?: string;
  status?: string;
  size?: string;
  timestamp?: string;
  className?: string;
}

export function BtcMonoBadge({
  commitSha,
  hash,
  blockHeight = 840029,
  label = "IMMUTABLE PROOF",
  sublabel,
  status,
  size,
  timestamp = "2026-09-10 18:42 UTC",
  className,
}: BtcMonoBadgeProps) {
  const [copied, setCopied] = useState(false);
  const activeSha = commitSha || hash || "4a9f2e7b8c1d5e3f6a0b9c8d7e6f5a4b3c2d1e0f";

  const copySha = () => {
    navigator.clipboard.writeText(activeSha);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortSha = `${activeSha.slice(0, 7)}...${activeSha.slice(-7)}`;

  return (
    <div
      onClick={copySha}
      className={cn(
        "group inline-flex items-center gap-2.5 px-3 py-1.5 rounded-none bg-black/80 border border-white/15 hover:border-white/50 backdrop-blur-md shadow-lg font-mono text-xs cursor-pointer select-none transition-all duration-200",
        className
      )}
      title="Click to copy cryptographic SHA-256"
    >
      {/* Status Dot */}
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-200" />
        </span>
        <span className="text-[10px] text-zinc-200 font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>

      <div className="w-[1px] h-3.5 bg-white/15" />

      {/* Block & SHA */}
      <div className="flex items-center gap-2 text-zinc-200">
        <span className="text-zinc-300 text-[11px]">#{blockHeight}</span>
        <span className="text-white font-semibold group-hover:text-zinc-200 transition-colors">
          {shortSha}
        </span>
      </div>

      {/* Copy / Verified Glyph */}
      <div className="pl-1 text-zinc-300 group-hover:text-white transition-colors">
        {copied ? (
          <Check className="w-3.5 h-3.5 text-zinc-200" />
        ) : (
          <Copy className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100" />
        )}
      </div>
    </div>
  );
}

export default BtcMonoBadge;
