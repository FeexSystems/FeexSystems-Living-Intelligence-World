import React from 'react';
import { CinematicScene } from '../components/CinematicScene';

export function MissionCapabilityScene() {
  return (
    <CinematicScene 
      id="missions"
      title="MISSIONS & CAPABILITIES"
      subtitle="What we execute. How we operate."
      videoSrc="/media/landing/scenes/missions.webm"
    />
  );
}
