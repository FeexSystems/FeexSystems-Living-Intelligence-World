import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CinematicScene } from '../components/CinematicScene';
import { Effect } from '../effects/EffectGate';
import { cn } from '@/lib/utils';

/**
 * Live Surfaces scene — FeexSystems services and use cases presented through
 * monochrome canvas backdrops. Appended after the seven canonical cinematic
 * scenes; GPU tier is capability-gated through EffectGate.
 */

function SurfaceCard({
  index,
  name,
  useCase,
  to,
  children,
  className,
}: {
  index: string;
  name: string;
  useCase: string;
  to: string;
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
          {name}
        </span>
      </header>
      <div className="relative h-44 w-full overflow-hidden">{children}</div>
      <footer className="flex items-center justify-between border-t border-white/10 px-5 py-3">
        <span className="font-mono text-[9px] uppercase leading-relaxed tracking-[.18em] text-white/45">
          {useCase}
        </span>
        <Link
          to={to}
          className="font-mono text-[9px] uppercase tracking-[.2em] text-white/70 transition-colors hover:text-white"
        >
          OPEN →
        </Link>
      </footer>
    </article>
  );
}

export function NoirWebGLScene() {
  return (
    <CinematicScene
      id="fx-webgl"
      title="LIVE SURFACES"
      subtitle="FeexSystems services — world model, navigator, omni command and evidence ledger."
      videoSrc="/media/landing/scenes/ui-loops.webm"
      titleNode={
        <Effect
          name="glowing-text"
          fallback="LIVE SURFACES"
          eyebrow="FEEXSYSTEMS // SERVICES"
          text="LIVE SURFACES"
          textColor="#fafafa"
          glowColor="#d4d4d4"
          backgroundColor="transparent"
          fontSize={38}
          className="!min-h-0 !h-auto w-full items-start justify-start overflow-visible px-0 py-0"
        />
      }
      subtitleNode={
        <Effect
          name="typing-text"
          fallback="FeexSystems services — world model, navigator, omni command and evidence ledger."
          lines={['FeexSystems services — world model, navigator, omni command and evidence ledger.']}
          textColor="#a3a3a3"
          cursorColor="#fafafa"
          backgroundColor="transparent"
          fontSize={0.85}
          charactersPerSecond={30}
          className="!min-h-0 !h-auto w-full items-start justify-start overflow-visible px-0 py-0 font-mono uppercase"
        />
      }
    >
      <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <SurfaceCard
          index="SVC/01"
          name="World Model"
          useCase="Explore the canonical nine-world graph and topology."
          to="/world"
        >
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
        </SurfaceCard>

        <SurfaceCard
          index="SVC/02"
          name="AI Navigator"
          useCase="Ask grounded questions over engineering evidence."
          to="/navigator"
        >
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
        </SurfaceCard>

        <SurfaceCard
          index="SVC/03"
          name="Omni Command"
          useCase="Orchestrate agents against the living world model."
          to="/omni"
        >
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
        </SurfaceCard>

        <SurfaceCard
          index="SVC/04"
          name="Evidence Ledger"
          useCase="Audit claims against cryptographic provenance."
          to="/evidence"
        >
          <Effect
            name="ascii-band"
            backgroundColor="#080808"
            saturation={0}
            intensity={0.9}
            characters=" .:-=+*#%@"
            className="absolute inset-0 h-full w-full opacity-80"
          />
        </SurfaceCard>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/world"
          className="border border-white/40 bg-white/10 px-6 py-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:border-white/70 hover:shadow-[0_0_25px_rgba(255,255,255,0.35)]"
        >
          Enter Feex World
        </Link>
        <Link
          to="/projects"
          className="border border-white/25 bg-black/40 px-6 py-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/50 hover:text-white"
        >
          Explore Projects
        </Link>
        <Link
          to="/navigator"
          className="border border-white/25 bg-black/40 px-6 py-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/50 hover:text-white"
        >
          Open Navigator
        </Link>
      </div>
    </CinematicScene>
  );
}
