import 'react';
import { CinematicScene } from '../components/CinematicScene';
import { Effect } from '../effects/EffectGate';

export function GalaxySequenceScene() {
  return (
    <CinematicScene
      id="galaxy"
      title="THE CANONICAL GALAXY"
      subtitle="The authoritative graph defines what exists; intelligence interprets it."
      videoSrc="/media/landing/scenes/galaxy.webm"
      titleNode={
        <Effect
          name="glowing-text"
          fallback="THE CANONICAL GALAXY"
          eyebrow="CANONICAL GRAPH"
          text="THE CANONICAL GALAXY"
          textColor="#fafafa"
          glowColor="#d4d4d4"
          backgroundColor="transparent"
          fontSize={40}
          className="!min-h-0 !h-auto w-full items-start justify-start overflow-visible px-0 py-0"
        />
      }
      subtitleNode={
        <Effect
          name="typing-text"
          fallback="The authoritative graph defines what exists; intelligence interprets it."
          lines={['The authoritative graph defines what exists; intelligence interprets it.']}
          textColor="#a3a3a3"
          cursorColor="#fafafa"
          backgroundColor="transparent"
          fontSize={0.85}
          charactersPerSecond={34}
          className="!min-h-0 !h-auto w-full items-start justify-start overflow-visible px-0 py-0 font-mono uppercase"
        />
      }
    />
  );
}
