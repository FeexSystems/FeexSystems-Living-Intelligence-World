import React from 'react';
import { CinematicScene } from '../components/CinematicScene';
import { SushCinematicCarousel } from '../cinematic/SushCinematicCarousel';

export function MissionCapabilityScene() {
  return (
    <CinematicScene 
      id="missions"
      title="MISSIONS & CAPABILITIES"
      subtitle="What we execute. How we operate."
      videoSrc="/media/landing/scenes/missions.webm"
    >
      <div className="mt-8 w-full">
        <SushCinematicCarousel />
      </div>
    </CinematicScene>
  );
}
