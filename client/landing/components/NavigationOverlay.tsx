import 'react';
import { Link } from 'react-router-dom';
import { Terminal, ShieldCheck, Command, Globe2, Search } from 'lucide-react';
import { SCENE_ASSETS } from '../registry/landingAssets';
import { FeexHorizontalLockup } from '../../components/FeexLogo';

export function NavigationOverlay({ onCommandClick, activeIndex = 0 }: { onCommandClick: () => void; activeIndex?: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex flex-col justify-between p-6 sm:p-8">
      <header className="flex justify-between items-center pointer-events-auto">
        <Link to="/" aria-label="FEEXSYSTEMS Home" className="flex items-center transition-transform hover:scale-105">
          <FeexHorizontalLockup markSize={28} showSubtitle={false} />
        </Link>
        <nav aria-label="Application surfaces" className="hidden items-center gap-5 font-mono text-[10px] tracking-widest text-white/75 lg:flex">
          {['world', 'navigator', 'omni', 'evidence'].map((route) => <Link key={route} to={`/${route}`} className="hover:text-white focus-visible:outline focus-visible:outline-white">{route.toUpperCase()}</Link>)}
        </nav>
        <span className="hidden font-mono text-[10px] tracking-widest text-white/60 sm:block">{String(activeIndex + 1).padStart(2, '0')} / {String(SCENE_ASSETS.length).padStart(2, '0')} {SCENE_ASSETS[activeIndex]?.label.toUpperCase()}</span>
        <button
          type="button"
          aria-label="Open FEEX command launcher"
          onClick={onCommandClick}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/55 transition hover:border-white/25 hover:text-white backdrop-blur-md"
        >
          <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
          Command
        </button>
      </header>

      <div className="sr-only">
         <div className="flex flex-col gap-2">
            <div className="font-mono text-[9px] uppercase tracking-[.25em] text-white/40">EXPLORE SURFACES</div>
            <div className="flex gap-2 mt-2">
               <Link to="/world" aria-label="Explore World Model" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/50 hover:text-white hover:border-white/30 backdrop-blur-md transition-all"><Globe2 className="w-4 h-4" aria-hidden="true" /></Link>
               <Link to="/navigator" aria-label="Open Navigator" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/50 hover:text-white hover:border-white/30 backdrop-blur-md transition-all"><Search className="w-4 h-4" aria-hidden="true" /></Link>
               <Link to="/omni" aria-label="Open Omni Command" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/50 hover:text-white hover:border-white/30 backdrop-blur-md transition-all"><Command className="w-4 h-4" aria-hidden="true" /></Link>
               <Link to="/evidence" aria-label="View Evidence Ledger" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/50 hover:text-white hover:border-white/30 backdrop-blur-md transition-all"><ShieldCheck className="w-4 h-4" aria-hidden="true" /></Link>
            </div>
         </div>
      </div>
    </div>
  );
}
