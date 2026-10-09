import 'react';
import { CinematicScene } from '../components/CinematicScene';

export function CoreSystemsScene() {
  return (
    <CinematicScene 
      id="systems"
      title="CORE ARCHITECTURE"
      subtitle="Non-blocking initialization. Provider-neutral intelligence. Provenance."
      videoSrc="/media/landing/scenes/systems.webm"
    />
  );
}
