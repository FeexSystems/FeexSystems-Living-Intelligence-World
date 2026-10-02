import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal, ShieldCheck, Command, Globe2, Search } from 'lucide-react';

export function NavigationOverlay({ onCommandClick }: { onCommandClick: () => void }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex flex-col justify-between p-6 sm:p-8">
      <header className="flex justify-between items-center pointer-events-auto">
        <div className="flex items-center gap-3 font-mono text-xs tracking-[0.22em] text-white">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-white/20">
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
          FEEXSYSTEMS
        </div>
        <button
          onClick={onCommandClick}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/55 transition hover:border-white/25 hover:text-white backdrop-blur-md"
        >
          <Terminal className="h-3.5 w-3.5" />
          Command
        </button>
      </header>
      
      <div className="pointer-events-auto flex items-end justify-between">
         <div className="flex flex-col gap-2">
            <div className="font-mono text-[9px] uppercase tracking-[.25em] text-white/40">EXPLORE SURFACES</div>
            <div className="flex gap-2 mt-2">
               <Link to="/world" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/50 hover:text-white hover:border-white/30 backdrop-blur-md transition-all"><Globe2 className="w-4 h-4" /></Link>
               <Link to="/navigator" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/50 hover:text-white hover:border-white/30 backdrop-blur-md transition-all"><Search className="w-4 h-4" /></Link>
               <Link to="/omni" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/50 hover:text-white hover:border-white/30 backdrop-blur-md transition-all"><Command className="w-4 h-4" /></Link>
               <Link to="/evidence" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/50 hover:text-white hover:border-white/30 backdrop-blur-md transition-all"><ShieldCheck className="w-4 h-4" /></Link>
            </div>
         </div>
      </div>
    </div>
  );
}
