import 'react';
import { CinematicScene } from '../components/CinematicScene';
import { Effect } from '../effects/EffectGate';
import { SushCinematicCarousel } from '../cinematic/SushCinematicCarousel';

export function MissionCapabilityScene() {
  return (
    <CinematicScene
      id="missions"
      title="MISSIONS & CAPABILITIES"
      subtitle="What we execute. How we operate."
      videoSrc="/media/landing/scenes/missions.webm"
      titleNode={
        <Effect
          name="typing-text"
          fallback="MISSIONS & CAPABILITIES"
          lines={['MISSIONS & CAPABILITIES']}
          textColor="#fafafa"
          cursorColor="#e5e5e5"
          backgroundColor="transparent"
          fontSize={2.4}
          fontWeight={700}
          charactersPerSecond={18}
          className="!min-h-0 !h-auto w-full items-start justify-start overflow-visible px-0 py-0 font-mono uppercase"
        />
      }
    >
      <div className="mt-8 w-full">
        <SushCinematicCarousel />
      </div>
    </CinematicScene>
  );
}
