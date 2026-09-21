import React from "react";
import { Link } from "react-router-dom";

/**
 * EMERGENCY STUB — PR #34 merged a null Index.tsx.
 * Full PASS 11 synchronized Index is in project artifacts:
 *   Index.pass11-synced.tsx
 *   pass11-landing-world-sync.patch
 *
 * Restore ASAP on a follow-up PR:
 *   cp artifacts/Index.pass11-synced.tsx client/pages/Index.tsx
 *   npm run typecheck && npm run build
 */
export default function Index() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#00ff41] font-mono flex items-center justify-center p-8">
      <div className="max-w-xl border border-[#00ff41]/40 p-8 space-y-4">
        <div className="text-xs tracking-widest opacity-70">FEEX WORLD OS // CRITICAL</div>
        <h1 className="text-2xl font-bold text-white">Landing Index stub active</h1>
        <p className="text-sm text-zinc-300 leading-relaxed">
          PR #34 merged a temporary null <code className="text-[#00ff41]">Index.tsx</code>.
          Restore the full PASS 11 synchronized page (8 canonical worlds) from
          <code className="text-[#00ff41]"> artifacts/Index.pass11-synced.tsx</code> before production traffic.
        </p>
        <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
          <li>3WM · YURRHEELER · FARMPLUG · FIREHOUSE</li>
          <li>FEEXKEEAUTH · KAPPAXCHANGEFIN · RENTALL · HOLOKAI</li>
        </ul>
        <div className="pt-4 flex gap-3 text-xs">
          <Link to="/world" className="border border-[#00ff41]/50 px-3 py-2 hover:bg-[#00ff41]/10">
            /world spatial galaxy
          </Link>
          <a href="/health" className="border border-zinc-600 px-3 py-2 text-zinc-400 hover:border-zinc-400">
            /health
          </a>
        </div>
      </div>
    </div>
  );
}
