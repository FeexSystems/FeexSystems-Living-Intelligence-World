import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { CinematicScene } from '../components/CinematicScene';
import { Effect } from '../effects/EffectGate';
import { GlobestudioGlobe, DEFAULT_WORLD_COORDS } from '../../components/GlobestudioGlobe';
import { PLANETARY_ECOSYSTEMS } from '../../world-model';

/**
 * Spatial Galaxy scene — the FeexSystems 3D spatial world projected through
 * Globestudio. The nine canonical worlds from PLANETARY_ECOSYSTEMS are plotted
 * as data points with interconnecting arcs on a sonar-look dotted globe.
 * Appended after the seven canonical cinematic scenes; monochromatic noir.
 */

function LegendRow({ world }: { world: (typeof PLANETARY_ECOSYSTEMS)[number] }) {
  return (
    <li className="flex items-baseline justify-between gap-4 border-b border-white/10 py-2">
      <span className="font-mono text-[10px] uppercase tracking-[.2em] text-white/85">
        {world.name}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[.18em] text-white/50">
        {world.category}
      </span>
    </li>
  );
}

export function NoirWebGLScene() {
  const navigate = useNavigate();
  const [selectedWorld, setSelectedWorld] = useState<string | null>(null);

  const spaNav = (to: string) => (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigate(to);
  };

  const handleWorldClick = (worldId: string) => {
    setSelectedWorld(worldId);
    // Dispatch custom event for cross-component communication
    window.dispatchEvent(new CustomEvent('feex:world-selected', { detail: { worldId } }));
  };

  return (
    <CinematicScene
      id="fx-webgl"
      title="SPATIAL GALAXY"
      subtitle="Nine canonical worlds projected as a living 3D galaxy — every node evidence-backed."
      videoSrc="/media/landing/scenes/ui-loops.webm"
      // The globe is the content here. Skipping the video avoids a third decode
      // of the same ui-loops.webm and frees GPU headroom for the WebGL context.
      hideMedia
      titleNode={
        <Effect
          name="glowing-text"
          fallback="SPATIAL GALAXY"
          eyebrow="FEEXSYSTEMS // SPATIAL WORLD"
          text="SPATIAL GALAXY"
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
          fallback="Nine canonical worlds projected as a living 3D galaxy."
          textColor="#fafafa"
          fontSize={18}
          className="max-w-xl text-balance"
        />
      }
    >
      <div className="mt-8 grid w-full grid-cols-1 gap-4 lg:grid-cols-5">
        {/* The canonical registry stays visible even when the remote projection cannot load. */}
        <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-white/15 bg-black/50 backdrop-blur-xl lg:col-span-3">
          <div className="pointer-events-none absolute inset-0 z-0 grid grid-cols-3 place-items-center opacity-40" aria-hidden="true">
            {PLANETARY_ECOSYSTEMS.map((world, index) => (
              <span key={world.id} className="h-2 w-2 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,.8)]" style={{ transform: `translateY(${index % 2 ? 38 : -38}px)` }} />
            ))}
          </div>
          <ul className="absolute inset-x-4 bottom-4 z-10 grid grid-cols-2 gap-x-4 rounded-xl border border-white/10 bg-black/75 p-3 backdrop-blur sm:grid-cols-3" aria-label="Canonical worlds static projection fallback">
            {PLANETARY_ECOSYSTEMS.map((world) => (
              <li key={world.id} className="truncate py-1 font-mono text-[9px] uppercase tracking-widest text-white/80">{world.name}</li>
            ))}
          </ul>
          <GlobestudioGlobe
            look="topographic"
            dataArcs
            showLabels
            worldCoords={DEFAULT_WORLD_COORDS}
            highlightWorld={selectedWorld}
            onWorldClick={handleWorldClick}
            height="100%"
            width="100%"
            theme="dark"
            title="FeexSystems spatial galaxy — nine canonical worlds as data points"
            loading="eager"
            className="relative z-[1] block h-[46vh] min-h-[320px] w-full lg:h-[54vh]"
          />
          <div className="pointer-events-none absolute left-5 top-4">
            <span className="font-mono text-[9px] uppercase tracking-[.25em] text-white/50">
              GLOBE / LIVE PROJECTION
            </span>
          </div>
        </div>

        {/* Canonical world index is available on demand beside its spatial projection. */}
        <details className="flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/60 backdrop-blur-xl lg:col-span-2">
          <summary className="flex cursor-pointer list-none items-center justify-between border-b border-white/10 px-5 py-4 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-white">
            <span className="font-mono text-[9px] uppercase tracking-[.25em] text-white/80">WORLD INDEX · {PLANETARY_ECOSYSTEMS.length} WORLDS</span>
            <span className="font-mono text-[9px] uppercase tracking-[.25em] text-white/50">Expand registry</span>
          </summary>
          <ul className="max-h-[46vh] flex-1 overflow-y-auto px-5 py-2" aria-label="Canonical world registry">
            {PLANETARY_ECOSYSTEMS.map((world) => (
              <LegendRow key={world.id} world={world} />
            ))}
          </ul>
          <footer className="border-t border-white/10 px-5 py-3">
            <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[.18em] text-white/45">
              Nodes and arcs projected from PLANETARY_ECOSYSTEMS — graph, not list.
            </p>
          </footer>
        </details>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Effect
          name="liquid-glass-cursor"
          className="flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-white/10 bg-black/30 px-6 py-4"
          fallback={null}
        >
          <a
            href="/world"
            onClick={spaNav('/world')}
            className="border border-white/40 bg-white/10 px-6 py-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:border-white/70 hover:shadow-[0_0_25px_rgba(255,255,255,0.35)]"
          >
            Enter Feex World
          </a>
          <a
            href="/projects"
            onClick={spaNav('/projects')}
            className="border border-white/25 bg-black/40 px-6 py-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/50 hover:text-white"
          >
            Explore Projects
          </a>
          <a
            href="/navigator"
            onClick={spaNav('/navigator')}
            className="border border-white/25 bg-black/40 px-6 py-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/50 hover:text-white"
          >
            Open Navigator
          </a>
        </Effect>
      </div>
    </CinematicScene>
  );
}

export default NoirWebGLScene;
