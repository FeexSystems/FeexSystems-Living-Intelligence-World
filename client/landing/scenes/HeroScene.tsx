import React from 'react';
import { CinematicScene } from '../components/CinematicScene';

export function HeroScene() {
  return (
    <CinematicScene 
      id="hero"
      title="FEEXSYSTEMS"
      subtitle="A living World Model for systems, repositories, relationships and evidence."
      videoSrc="/media/landing/scenes/hero.webm"
    />
  );
}
