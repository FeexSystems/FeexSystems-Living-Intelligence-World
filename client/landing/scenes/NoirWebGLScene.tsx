import type { ReactNode } from 'react';
import { CinematicScene } from '../components/CinematicScene';
import { Effect } from '../effects/EffectGate';
import { cn } from '@/lib/utils';

/**
 * NoirWebGLScene — canvas/WebGL effect backdrops in strict monochrome.
 * Appended after the seven canonical cinematic scenes; the heavy GPU tier is
 * gated per-scene through EffectGate (WebGL probe + low-power + visibility).
 */

function WebglCard({
  index,
  label,
  children,
  className,
}: {
  index: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/70 backdrop-blur-xl',
        className
      )}
    >
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <span className="font-mono text-[9px] uppercase tracking-[.25em] text-white/50">
          {index}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[.25em] text-white/80">
          {label}
        </span>
      </header>
      <div className="relative h-44 w-full overflow-hidden">{children}</div>
    </article>
  );
}

export function NoirWebGLScene() {
  return (
    <CinematicScene
      id="fx-webgl"
      title="SIGNAL DEPTH"
      subtitle="Canvas and WebGL backdrops — arc light, aurora, opal flow and ascii band."
      videoSrc="/media/landing/scenes/ui-loops.webm"
      hideMedia
      fxLayer={
        /* Monochrome arc-light: drifting light arcs in pure greyscale. */
        <Effect
          name="arc-light"
          backgroundColor="#050505"
          color="#e5e5e5"
          saturation={0}
          intensity={0.9}
          grain={0.05}
          interactive
          className="absolute inset-0 h-full w-full"
        />
      }
      titleNode={
        <Effect
          name="focus-text"
          fallback="SIGNAL DEPTH"
          text="SIGNAL DEPTH"
          fontSize={3}
          textColor="#fafafa"
          backgroundColor="transparent"
          showReplayButton={false}
          loop={false}
          className="!min-h-0 !h-auto w-full items-start justify-start overflow-visible px-0 py-0"
        />
      }
    >
      <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <WebglCard index="GL/01" label="Arc Light — full bleed">
          <Effect
            name="arc-light"
            backgroundColor="#0a0a0a"
            color="#d4d4d4"
            saturation={0}
            intensity={0.85}
            grain={0.04}
            interactive={false}
            className="absolute inset-0 h-full w-full"
          />
        </WebglCard>

        <WebglCard index="GL/02" label="Aurora Ribbon">
          <Effect
            name="aurora-ribbon"
            backgroundColor="#080808"
            haloColor="#404040"
            glowColor="#a3a3a3"
            coreColor="#fafafa"
            intensity={0.9}
            grain={0.04}
            className="absolute inset-0 h-full w-full"
          />
        </WebglCard>

        <WebglCard index="GL/03" label="Opal Flow">
          <Effect
            name="opal-flow"
            baseColor="#262626"
            wispColor="#a3a3a3"
            ribbonColor="#e5e5e5"
            highlightColor="#fafafa"
            saturation={0.25}
            speed={0.8}
            className="absolute inset-0 h-full w-full"
          />
        </WebglCard>

        <WebglCard index="GL/04" label="Ascii Band">
          <Effect
            name="ascii-band"
            backgroundColor="#080808"
            saturation={0}
            intensity={0.9}
            characters=" .:-=+*#%@"
            className="absolute inset-0 h-full w-full opacity-80"
          />
        </WebglCard>
      </div>

      <p className="mt-6 max-w-2xl font-mono text-[10px] uppercase tracking-[.2em] text-white/50">
        GPU tier is capability-gated: reduced-motion, save-data, coarse pointers,
        low-power devices and missing WebGL contexts fall back to the scene
        poster automatically.
      </p>
    </CinematicScene>
  );
}
