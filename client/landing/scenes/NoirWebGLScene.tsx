import { useNavigate } from 'react-router-dom';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { CinematicScene } from '../components/CinematicScene';
import { Effect } from '../effects/EffectGate';
import { GlobestudioGlobe } from '../../components/GlobestudioGlobe';
import { PLANETARY_ECOSYSTEMS } from '../../world-model';

/**
 * Spatial Galaxy scene — the FeexSystems 3D spatial world projected through
 * Globestudio. The nine canonical worlds from PLANETARY_ECOSYSTEMS are plotted
 * as data points with interconnecting arcs on a sonar-look dotted globe.
 * Appended after the seven canonical cinematic scenes; monochromatic noir.
 */

// Canonical worlds → globe coordinates. The ecosystems are registry entities,
// not geographic places, so each world anchors to a representative coordinate
// that spreads the "galaxy" across the projection.
const WORLD_COORDS: Record<string, { lat: number; lng: number; value: number }> = {
  '3wm': { lat: 51.5, lng: -0.12, value: 6 },
  yurrheeler: { lat: 40.71, lng: -74.0, value: 9 },
  farmplug: { lat: -1.29, lng: 36.82, value: 7 },
  firehouse: { lat: 30.27, lng: -97.74, value: 5 },
  feexkeeauth: { lat: 47.37, lng: 8.54, value: 8 },
  kappaxchangefin: { lat: 1.35, lng: 103.82, value: 9 },
  rentall: { lat: -33.87, lng: 151.21, value: 6 },
  feexsystems: { lat: 35.68, lng: 139.69, value: 10 },
  vyralabs: { lat: -23.55, lng: -46.63, value: 7 },
};

const GLOBE_CONFIG = JSON.stringify({
  v: 3,
  selection: 'world',
  backgroundStyle: 'transparent',
  dotColor: '#8a8a8a',
  density: 55,
  globeSettings: {
    dataPoints: PLANETARY_ECOSYSTEMS.map((world) => {
      const coord = WORLD_COORDS[world.id] ?? { lat: 0, lng: 0, value: 5 };
      return { lat: coord.lat, lng: coord.lng, value: coord.value };
    }),
    dataArcs: true,
    dataMarkerColor: '#fafafa',
  },
});

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
  const spaNav = (to: string) => (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigate(to);
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
          fallback="Nine canonical worlds projected as a living 3D galaxy — every node evidence-backed."
          lines={['Nine canonical worlds projected as a living 3D galaxy — every node evidence-backed.']}
          textColor="#a3a3a3"
          cursorColor="#fafafa"
          backgroundColor="transparent"
          fontSize={0.85}
          charactersPerSecond={30}
          className="!min-h-0 !h-auto w-full items-start justify-start overflow-visible px-0 py-0 font-mono uppercase"
        />
      }
    >
      <div className="mt-8 grid w-full grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Globestudio spatial galaxy — sonar-look dotted globe with the nine
            canonical worlds as data points joined by arcs. */}
        <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black/50 backdrop-blur-xl lg:col-span-3">
          <GlobestudioGlobe
            look="topographic"
            config={GLOBE_CONFIG}
            height="100%"
            width="100%"
            theme="dark"
            title="FeexSystems spatial galaxy — nine canonical worlds as data points"
            loading="eager"
            className="block h-[46vh] min-h-[320px] w-full lg:h-[54vh]"
          />
          <div className="pointer-events-none absolute left-5 top-4">
            <span className="font-mono text-[9px] uppercase tracking-[.25em] text-white/50">
              GLOBE / LIVE PROJECTION
            </span>
          </div>
        </div>

        {/* Canonical world legend — registry names, no invented data. */}
        <aside className="flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/60 backdrop-blur-xl lg:col-span-2">
          <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <span className="font-mono text-[9px] uppercase tracking-[.25em] text-white/50">LEGEND</span>
            <span className="font-mono text-[9px] uppercase tracking-[.25em] text-white/80">
              {PLANETARY_ECOSYSTEMS.length} WORLDS
            </span>
          </header>
          <ul className="flex-1 overflow-y-auto px-5 py-2">
            {PLANETARY_ECOSYSTEMS.map((world) => (
              <LegendRow key={world.id} world={world} />
            ))}
          </ul>
          <footer className="border-t border-white/10 px-5 py-3">
            <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[.18em] text-white/45">
              Nodes and arcs projected from PLANETARY_ECOSYSTEMS — graph, not list.
            </p>
          </footer>
        </aside>
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
