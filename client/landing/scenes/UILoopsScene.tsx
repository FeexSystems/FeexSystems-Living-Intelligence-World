import React from 'react';
import { CinematicScene } from '../components/CinematicScene';

export function UILoopsScene() {
  return (
    <CinematicScene 
      id="ui-loops"
      title="ENTER THE WORLD"
      subtitle="Spatial interfaces for structural telemetry."
      videoSrc="/media/landing/scenes/ui-loops.webm"
    >
        <div className="mt-8 flex gap-4">
            <a href="/world" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white text-black px-6 py-3 font-mono text-[11px] uppercase tracking-[0.18em] transition hover:bg-white/90">
                Explore The Systems
            </a>
            <a href="/evidence" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] text-white/65 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.18em] transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white">
                View Evidence
            </a>
        </div>
    </CinematicScene>
  );
}
