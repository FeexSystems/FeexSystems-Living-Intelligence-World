import { useEffect, useState, type ReactNode } from 'react';
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

const CAROUSEL_POSTERS = [
  '/media/landing/scenes/worlds-poster.webp',
  '/media/landing/scenes/galaxy-poster.webp',
  '/media/landing/scenes/convergence-poster.webp',
  '/media/landing/scenes/ui-loops-poster.webp',
  '/media/landing/scenes/hero-poster.webp',
];

const SURFACE_NAMES = ['WORLD MODEL', 'AI NAVIGATOR', 'OMNI COMMAND', 'EVIDENCE LEDGER', 'SPATIAL GALAXY'];

const arcFlowItems = CAROUSEL_POSTERS.map((src, i) => ({
  src,
  alt: `${SURFACE_NAMES[i]} cinematic projection`,
  label: `SURFACE ${String(i + 1).padStart(2, '0')}`,
  title: SURFACE_NAMES[i],
  description: 'FeexSystems live surface — projected from canonical world state.',
}));

const orbitItems = CAROUSEL_POSTERS.map((image, i) => ({
  id: i,
  image,
  alt: `${SURFACE_NAMES[i]} projection`,
}));

function Panel({
  index,
  label,
  caption,
  children,
  className,
}: {
  index: string;
  label: string;
  caption: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/60 backdrop-blur-xl',
        className
      )}
    >
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <span className="font-mono text-[9px] uppercase tracking-[.25em] text-white/50">{index}</span>
        <span className="font-mono text-[9px] uppercase tracking-[.25em] text-white/80">{label}</span>
      </header>
      <div className="relative flex-1 overflow-hidden">{children}</div>
      <footer className="border-t border-white/10 px-5 py-3">
        <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[.18em] text-white/45">{caption}</p>
      </footer>
    </article>
  );
}

function SyncCard() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 1600);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <Effect
      name="animated-skeleton"
      exportName="SkeletonSwap"
      loading={loading}
      swapAnimation="fade"
      duration={0.4}
      skeleton={
        <Effect name="animated-skeleton" exportName="SkeletonGroup" animation="shimmer" duration={1.4} stagger={0.08}>
          <Effect name="animated-skeleton" exportName="Skeleton" className="h-3 w-2/3" index={0} />
          <Effect name="animated-skeleton" exportName="Skeleton" className="mt-3 h-3 w-1/2" index={1} />
          <Effect name="animated-skeleton" exportName="Skeleton" className="mt-3 h-3 w-3/5" index={2} />
        </Effect>
      }
      fallback={
        <div className="space-y-3 p-2 font-mono text-[10px] uppercase tracking-widest text-white/60">
          <p>WORLD MODEL — SYNCED</p>
          <p>NINE WORLDS — INDEXED</p>
          <p>EVIDENCE — VERIFIED</p>
        </div>
      }
    >
      <div className="space-y-3 p-2 font-mono text-[10px] uppercase tracking-widest text-white/80">
        <p>WORLD MODEL — SYNCED</p>
        <p>NINE WORLDS — INDEXED</p>
        <p>EVIDENCE — VERIFIED</p>
      </div>
    </Effect>
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

      <div className="mt-4 grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          index="SVC/05"
          label="Arc Flow"
          caption="Drag through the FeexSystems surface projections."
          className="lg:col-span-2"
        >
          <Effect
            name="arc-flow-carousel"
            fallback={
              <div className="flex h-full items-center justify-center gap-3 p-4">
                {arcFlowItems.map((item) => (
                  <img key={item.src} src={item.src} alt={item.alt} className="h-24 w-20 rounded-md border border-white/10 object-cover" />
                ))}
              </div>
            }
            items={arcFlowItems}
            surfaceColor="#0a0a0a"
            autoRotateSpeed={0.15}
            className="!h-full !min-h-[280px] !bg-transparent"
          />
        </Panel>

        <Panel
          index="SVC/06"
          label="Orbit Ring"
          caption="The surfaces in orbital projection — drag to spin."
        >
          <Effect
            name="orbit-flip-slider"
            fallback={
              <div className="flex h-full items-center justify-center gap-3 p-4">
                {orbitItems.map((item) => (
                  <img key={item.id} src={item.image} alt={item.alt} className="h-20 w-16 rounded-md border border-white/10 object-cover" />
                ))}
              </div>
            }
            items={orbitItems}
            backgroundColor="#0a0a0a"
            imageWidth={72}
            imageHeight={96}
            rotateSpeed={5}
            className="!h-full !min-h-[280px]"
          />
        </Panel>

        <Panel
          index="SVC/07"
          label="Live Telemetry"
          caption="World model sync state — skeleton resolves into verified status."
          className="lg:col-span-3 lg:!min-h-0"
        >
          <SyncCard />
        </Panel>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Effect
          name="liquid-glass-cursor"
          className="flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-white/10 bg-black/30 px-6 py-4"
          fallback={null}
        >
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
        </Effect>
      </div>
    </CinematicScene>
  );
}
