import 'react';
import { CinematicScene } from '../components/CinematicScene';

export function GalaxySequenceScene() {
  return (
    <CinematicScene 
      id="galaxy"
      title="THE CANONICAL GALAXY"
      subtitle="The authoritative graph defines what exists; intelligence interprets it."
      videoSrc="/media/landing/scenes/galaxy.webm"
    />
  );
}
