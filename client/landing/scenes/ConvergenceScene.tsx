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
          name="text-convergence"
          fallback="CONVERGENCE"
          text="CONVERGENCE"
          staticMode
          bgColor="transparent"
          textColor="#fafafa"
          className="!min-h-0 !h-auto w-full items-start justify-start overflow-visible px-0 py-0 text-left"
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
