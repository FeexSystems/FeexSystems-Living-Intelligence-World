import 'react';
import { CinematicScene } from '../components/CinematicScene';
import { Effect } from '../effects/EffectGate';

const MISSIONS = [
  {
    bgColor: '#0a0a0a',
    textColor: '#fafafa',
    title: 'Mission 001 — AI Operations',
    subtitle: 'Provider-neutral AI orchestration with idempotent workflows and execution tracing.',
  },
  {
    bgColor: '#141414',
    textColor: '#e5e5e5',
    title: 'Mission 002 — Shared Platform',
    subtitle: 'Multi-tenant isolation, team RBAC, and a hardened AI gateway.',
  },
  {
    bgColor: '#1c1c1c',
    textColor: '#fafafa',
    title: 'Mission 003 — World Intelligence',
    subtitle: 'Canonical graph interpretation that separates authoritative facts from model interpretations.',
  },
  {
    bgColor: '#101010',
    textColor: '#e5e5e5',
    title: 'Mission 004 — Domain Products',
    subtitle: 'RentAll property operations and FarmPlug smart agriculture.',
  },
  {
    bgColor: '#171717',
    textColor: '#fafafa',
    title: 'Mission 005 — Knowledge & Document AI',
    subtitle: 'SHA-256 evidence hashing and citation-validated document retrieval.',
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
            <section aria-label="Mission capability registry" className="grid min-h-[420px] content-center gap-3 rounded-2xl border border-white/15 bg-black/70 p-5 sm:p-7">
              <p className="font-mono text-[10px] uppercase tracking-[.24em] text-white/60">[CANONICAL MISSION REGISTRY // STATIC VIEW]</p>
              {MISSIONS.map((mission, index) => (
                <article key={mission.title} className="grid grid-cols-[auto_1fr] gap-x-4 border-t border-white/10 py-3">
                  <span className="row-span-2 font-mono text-xs text-white/50">{String(index + 1).padStart(3, '0')}</span>
                  <h3 className="font-mono text-sm uppercase tracking-wider text-white">{mission.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/65">{mission.subtitle}</p>
                </article>
              ))}
            </section>
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
            <section aria-label="Cinematic world projections" className="grid min-h-[420px] grid-cols-2 gap-3 rounded-2xl border border-white/15 bg-black/70 p-4">
              {PROJECTION_IMAGES.slice(0, 4).map((image, index) => (
                <figure key={image.src} className="relative min-h-40 overflow-hidden border border-white/10 bg-neutral-950">
                  <img src={image.src} alt={image.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-65" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white">0{index + 1} // {image.title}</figcaption>
                </figure>
              ))}
            </section>
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
