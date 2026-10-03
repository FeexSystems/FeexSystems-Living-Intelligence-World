import React from 'react';
import { CinematicScene } from '../components/CinematicScene';
import { MagneticGlowButton } from '../cinematic/MagneticGlowButton';
import { TransitionVisualizer } from '../cinematic/TransitionVisualizer';
import { Compass, Database, TerminalSquare } from 'lucide-react';

export function UILoopsScene() {
  return (
    <CinematicScene 
      id="ui-loops"
      title="ENTER THE WORLD"
      subtitle="Spatial interfaces for structural telemetry."
      videoSrc="/media/landing/scenes/ui-loops.webm"
    >
      <div className="mt-8 flex flex-col items-center gap-10">
        <div className="w-full max-w-4xl opacity-80 mix-blend-screen">
            <TransitionVisualizer />
        </div>
        <div className="flex flex-col sm:flex-row gap-6">
            <MagneticGlowButton to="/world" variant="primary" size="lg">
                <Compass className="w-5 h-5 opacity-70" />
                Explore The Systems
            </MagneticGlowButton>
            <MagneticGlowButton to="/evidence" variant="secondary" size="lg">
                <Database className="w-5 h-5 opacity-70" />
                View Evidence Ledger
            </MagneticGlowButton>
            <MagneticGlowButton to="/navigator" variant="outline" size="lg">
                <TerminalSquare className="w-5 h-5 opacity-70" />
                AI Navigator
            </MagneticGlowButton>
        </div>
      </div>
    </CinematicScene>
  );
}
