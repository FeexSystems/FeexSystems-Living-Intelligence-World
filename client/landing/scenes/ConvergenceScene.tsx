import 'react';
import { CinematicScene } from '../components/CinematicScene';
import { Effect } from '../effects/EffectGate';
import { SequentialCarousel } from '../cinematic/SequentialCarousel';

export function ConvergenceScene() {
  return (
    <CinematicScene
      id="convergence"
      title="CONVERGENCE"
      subtitle="All systems forming the absolute source of truth."
      videoSrc="/media/landing/scenes/convergence.webm"
      titleNode={
        <Effect
          name="glowing-text"
          fallback="CONVERGENCE"
          eyebrow="CONVERGENCE // TRUTH"
          text="CONVERGENCE"
          textColor="#fafafa"
          glowColor="#a3a3a3"
          backgroundColor="transparent"
          fontSize={44}
          className="!min-h-0 !h-auto w-full items-start justify-start overflow-visible px-0 py-0"
        />
      }
      subtitleNode={
        <Effect
          name="typing-text"
          fallback="All systems forming the absolute source of truth."
          lines={['All systems forming the absolute source of truth.']}
          textColor="#a3a3a3"
          cursorColor="#fafafa"
          backgroundColor="transparent"
          fontSize={0.85}
          charactersPerSecond={34}
          className="!min-h-0 !h-auto w-full items-start justify-start overflow-visible px-0 py-0 font-mono uppercase"
        />
      }
    >
      <div className="mt-12 w-full">
        <SequentialCarousel />
      </div>
    </CinematicScene>
  );
}
