import React from 'react';
import { CinematicScene } from '../components/CinematicScene';
import { SequentialCarousel } from '../cinematic/SequentialCarousel';

export function ConvergenceScene() {
  return (
    <CinematicScene 
      id="convergence"
      title="CONVERGENCE"
      subtitle="All systems forming the absolute source of truth."
      videoSrc="/media/landing/scenes/convergence.webm"
    >
      <div className="mt-12 w-full">
        <SequentialCarousel />
      </div>
    </CinematicScene>
  );
}
