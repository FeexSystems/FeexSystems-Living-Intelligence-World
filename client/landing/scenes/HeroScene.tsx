import 'react';
import { CinematicScene } from '../components/CinematicScene';
import { Link } from 'react-router-dom';
import { getWorlds } from '../world/WorldModel';

export function HeroScene() {
  return (
    <CinematicScene
      id="hero"
      title="BUILD INTELLIGENT WORLDS."
      subtitle="Evidence → Intelligence → World"
      videoSrc="/media/landing/scenes/hero.webm"
    >
      <div className="mt-8 flex-wrap gap-3 font-mono text-[10px] font-semibold tracking-widest text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        <span className="border-l border-white/80 pl-3">WORLD MODEL / {getWorlds().length} CANONICAL WORLDS</span>
        <span className="border-l border-white/80 pl-3">STATE / REGISTRY PROJECTION</span>
      </div>
      <div className="mt-6 flex-wrap gap-3 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
        <Link to="/world" className="border border-white/40 bg-white/20 px-6 py-3 font-mono text-xs font-semibold text-white backdrop-blur-xl transition-all duration-300 hover:bg-white/30 hover:border-white/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white relative overflow-hidden group">
          <span className="absolute inset-0 -z-10 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-[100%]"></span>
          ENTER FEEX WORLD
        </Link>
        <a href="#systems" className="border border-white/30 bg-black/40 px-6 py-3 font-mono text-xs font-semibold text-white/90 backdrop-blur-xl transition-all duration-300 hover:bg-white/10 hover:border-white/50 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-white relative overflow-hidden group">
          <span className="absolute inset-0 -z-10 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-[100%]"></span>
          EXPLORE SYSTEMS
        </a>
      </div>
      <span className="mt-7 font-mono text-[10px] font-semibold tracking-widest text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">↓ SCROLL TO ENTER</span>
    </CinematicScene>
  );
}
