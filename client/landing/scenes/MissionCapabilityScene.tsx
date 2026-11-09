import 'react';
import { CinematicScene } from '../components/CinematicScene';
import { Effect } from '../effects/EffectGate';

const MISSIONS = [
  {
    bgColor: '#0a0a0a',
    textColor: '#fafafa',
    title: 'Canonical World Model',
    subtitle: 'Topology Engine',
  },
  {
    bgColor: '#141414',
    textColor: '#e5e5e5',
    title: 'Evidence Ledger',
    subtitle: 'Cryptographic Provenance',
  },
  {
    bgColor: '#1c1c1c',
    textColor: '#fafafa',
    title: 'Omni Command',
    subtitle: 'Agentic Orchestration',
  },
  {
    bgColor: '#101010',
    textColor: '#e5e5e5',
    title: 'Spatial Galaxy',
    subtitle: '3D Knowledge World',
  },
  {
    bgColor: '#171717',
    textColor: '#fafafa',
    title: 'AI Navigator',
    subtitle: 'Grounded Retrieval',
  },
];

const PROJECTION_IMAGES = [
  { src: '/media/landing/scenes/worlds-poster.webp', title: 'World Model', alt: 'FeexSystems canonical worlds projection' },
  { src: '/media/landing/scenes/convergence-poster.webp', title: 'Evidence Ledger', alt: 'FeexSystems evidence convergence projection' },
  { src: '/media/landing/scenes/ui-loops-poster.webp', title: 'Omni Command', alt: 'FeexSystems omni command projection' },
  { src: '/media/landing/scenes/galaxy-poster.webp', title: 'Spatial Galaxy', alt: 'FeexSystems knowledge galaxy projection' },
  { src: '/media/landing/scenes/hero-poster.webp', title: 'AI Navigator', alt: 'FeexSystems navigator projection' },
  { src: '/media/landing/scenes/systems-poster.webp', title: 'AI Core Services', alt: 'FeexSystems core services projection' },
];

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
      <div className="mt-8 grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
        <Effect
          name="ellipse-carousel"
          fallback={
            <div className="flex h-80 items-center justify-center rounded-2xl border border-white/15 bg-black/60 font-mono text-[10px] uppercase tracking-widest text-white/50">
              Missions carousel unavailable
            </div>
          }
          items={MISSIONS}
          centerLabel="MISSIONS"
          showCenterLabel
          backgroundColor="#0a0a0a"
          autoPlay
          className="!h-[420px] !min-h-0 w-full overflow-hidden rounded-2xl border border-white/15"
        />
        <Effect
          name="portal-carousel"
          fallback={
            <div className="flex h-80 items-center justify-center rounded-2xl border border-white/15 bg-black/60 font-mono text-[10px] uppercase tracking-widest text-white/50">
              Cinematic projection unavailable
            </div>
          }
          images={PROJECTION_IMAGES}
          label="NEXT"
          thumbWidth={180}
          className="!h-[420px] !min-h-0 w-full overflow-hidden rounded-2xl border border-white/15"
        />
      </div>
    </CinematicScene>
  );
}
