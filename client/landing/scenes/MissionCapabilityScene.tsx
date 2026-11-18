import 'react';
import { CinematicScene } from '../components/CinematicScene';
import { Effect } from '../effects/EffectGate';
import { HoverPlayVideo } from '../components/HoverPlayVideo';
import { useMotionPaused } from '../components/useMotionPaused';
import { useState } from 'react';
import { CANONICAL_MISSIONS, EVIDENCE_POSTER_URL, GALAXY_POSTER_URL } from '../../../src/data/canonicalRegistry';

/** Mission-to-projection mapping per the landing spec: 001->World Model, 002->Evidence Ledger, 003->Omni Command, 004->Spatial Galaxy */
const MISSION_PROJECTION_MAP: Record<string, number> = {
  '001': 0, // World Model
  '002': 1, // Evidence Ledger
  '003': 2, // Omni Command
  '004': 3, // Spatial Galaxy
};

/** Independent SHA-256 hashes bound to stop words for each canonical mission. */
const SHA_HASHES: Record<string, string> = {
  '001': '8f94e2c1a04b',
  '002': '3c71b9e4d22f',
  '003': '9b3c4f88e10a',
  '004': '5d12a7f0c93e',
  '005': '1e89d4b2f61c',
};

/** Projection assets keyed by the 4 canonical projection slots. Strict monochromatic Noir palette only. */
const PROJECTION_ASSETS = [
  { src: '/media/landing/scenes/worlds-poster.webp', title: 'World Model', alt: 'FeexSystems canonical worlds projection' },
  { src: EVIDENCE_POSTER_URL, title: 'Evidence Ledger', alt: 'FeexSystems evidence ledger keyframe' },
  { src: '/media/landing/scenes/ui-loops-poster.webp', title: 'Omni Command', alt: 'FeexSystems omni command projection' },
  { src: GALAXY_POSTER_URL, title: 'Spatial Galaxy', alt: 'FeexSystems spatial galaxy core keyframe' },
];

export function MissionCapabilityScene() {
  const motionPaused = useMotionPaused();
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

/** Determine projection index coupled to the currently selected mission. */
  const projectionIndex = selectedMissionId ? MISSION_PROJECTION_MAP[selectedMissionId] ?? 0 : 0;

  const activeProjection = PROJECTION_ASSETS[projectionIndex];

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
          fontSize={1.4}
          fontWeight={700}
          charactersPerSecond={18}
          className="!min-h-0 !h-auto w-full items-start justify-start overflow-visible px-0 py-0 font-mono uppercase"
        />
      }
    >
      {/* Layout contract for this scene:
          - `CinematicScene` already reserves the fixed scene rail via `lg:pr-56`
            on its content column, so this row must stay inside that bound — a
            12-col grid split 5/7 rendered the projection panel over the cards.
          - The scene is exactly one snap viewport and its content column already
            owns `overflow-y-auto`. This row must therefore fit inside the space
            left under the shared title, or cards get clipped at the fold. The
            projection preview is capped below (`max-h` on the video) and the two
            columns are top-aligned so the shorter one does not stretch the row.
          - `justify-between` + proportional basis keep the halves balanced across
            the full content width. */}
      <div className="mt-3 flex w-full flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        {/* LEFT: the five canonical missions, rendered from CANONICAL_MISSIONS. */}
        {/* The mission list is the tallest thing in the scene. Bound it to the
            space left under the shared title (which is a fixed ~231px block owned
            by CinematicScene and not overridable from here) so the last card can
            never be pushed under the fold. It scrolls internally only when the
            viewport is genuinely too short for all five. */}
        <div className="flex w-full flex-col gap-1.5 lg:min-w-0 lg:flex-1 lg:basis-[46%] lg:max-h-[min(34vh,22rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
          {CANONICAL_MISSIONS.map((mission) => {
            const isSelected = mission.id === selectedMissionId;
            return (
              <button
                key={mission.id}
                type="button"
                onClick={() => setSelectedMissionId(mission.id)}
                aria-pressed={isSelected}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-all duration-300 ${
                  isSelected
                    ? 'border-white bg-white text-black'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05]'
                }`}
              >
                <div className="mb-1.5 flex items-baseline gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">
                    {mission.id}
                  </span>
                  <h3 className="min-w-0 flex-1 font-mono text-[11px] uppercase leading-tight tracking-wider">
                    {mission.title}
                  </h3>
                </div>
                <p
                  className={`font-mono text-[10px] leading-snug ${isSelected ? 'text-black/70' : 'text-white/60'}`}
                >
                  {mission.description}
                </p>
                <span
                  className={`mt-1 inline-block rounded px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-wider ${
                    isSelected ? 'bg-black/10 text-black' : 'bg-white/10 text-white/55'
                  }`}
                >
                  SHA-256: {SHA_HASHES[mission.id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* RIGHT: coupled projection + execution trace. `min-w-0` lets the
            aspect-video child shrink instead of overflowing its column.

            Height budget: the scene is one snap viewport and its content column
            overflows past the fold. An unbounded `aspect-video` preview grew to
            ~490px on a wide column, which pushed the execution trace and all four
            selector tiles below the fold at every viewport size. The preview is
            now capped (and can shrink), so preview + trace + selector fit. */}
        <div className="flex w-full min-w-0 flex-col gap-2 lg:flex-1 lg:basis-[54%]">
          <figure className="overflow-hidden rounded-xl border border-white/10 bg-black/60">
            <div className="aspect-video max-h-[clamp(7rem,22vh,17rem)] w-full overflow-hidden bg-neutral-950">
              <HoverPlayVideo
                poster={activeProjection.src}
                alt={activeProjection.alt}
                motionPaused={motionPaused}
                className="h-full w-full object-cover opacity-80 transition-opacity hover:opacity-100"
              />
            </div>
            <figcaption className="border-t border-white/10 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[.18em] text-white/60">
              {projectionIndex + 1} // {activeProjection.title}
            </figcaption>
          </figure>

          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2">
            <p className="font-mono text-[8px] uppercase tracking-widest text-white/55">EXECUTION TRACE</p>
            {/* Single-line summary: the full JSON dump was taller than the
                scene's remaining height and got clipped mid-object. */}
            <pre className="mt-1 overflow-x-auto rounded bg-black/80 px-2 py-1 font-mono text-[8px] leading-snug text-white/75">
              {`mission=${selectedMissionId ?? 'none'} projection=${activeProjection.title} status=${
                selectedMissionId ? 'selected' : 'idle'
              }`}
            </pre>
          </div>

          {/* Projection selector — four canonical slots. */}
          <div className="grid grid-cols-4 gap-2">
            {PROJECTION_ASSETS.map((proj, idx) => (
              <button
                key={proj.src}
                type="button"
                onClick={() => setSelectedMissionId(Object.keys(MISSION_PROJECTION_MAP)[idx] ?? null)}
                aria-pressed={idx === projectionIndex}
                className={`min-w-0 overflow-hidden rounded-lg border text-left transition ${
                  idx === projectionIndex ? 'border-white' : 'border-white/10 hover:border-white/40'
                }`}
              >
                <img src={proj.src} alt={proj.alt} loading="lazy" className="h-8 w-full object-cover opacity-70" />
                <span className="block truncate px-1 py-0.5 font-mono text-[7px] uppercase tracking-wider text-white/55">
                  {idx + 1} // {proj.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </CinematicScene>
  );
}
