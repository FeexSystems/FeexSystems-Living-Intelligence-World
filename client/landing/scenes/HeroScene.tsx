import React from 'react';
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
      <div className="mt-8 flex-wrap gap-3 font-mono text-[10px] tracking-widest text-white/70">
        <span className="border-l border-white/50 pl-3">WORLD MODEL / {getWorlds().length} CANONICAL WORLDS</span>
        <span className="border-l border-white/50 pl-3">STATE / REGISTRY PROJECTION</span>
      </div>
      <div className="mt-6 flex-wrap gap-3">
        <Link to="/world" className="border border-white bg-white px-6 py-3 font-mono text-xs text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">ENTER FEEX WORLD</Link>
        <a href="#systems" className="border border-white/50 bg-black/50 px-6 py-3 font-mono text-xs text-white focus-visible:outline focus-visible:outline-white">EXPLORE SYSTEMS</a>
      </div>
      <span className="mt-7 font-mono text-[10px] tracking-widest text-white/60">↓ SCROLL TO ENTER</span>
    </CinematicScene>
  );
}
