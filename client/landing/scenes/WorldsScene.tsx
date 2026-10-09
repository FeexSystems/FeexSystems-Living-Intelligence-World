import { useMemo, useState } from "react";
import { Search, Eye, Network } from "lucide-react";
import { cn } from "@/lib/utils";
import { CinematicScene } from "../components/CinematicScene";
import {
  filterWorlds,
  getWorldDomains,
  getWorlds,
  getWorldDomain,
} from "../world/WorldModel";
import { RelationshipGraph } from "../world/RelationshipGraph";
import { WorldInspector } from "../world/WorldInspector";

/**
 * WorldsScene — canonical nine-world presentation and inspection.
 *
 * This is the Phase C surface. Every world name, domain, repository and evidence
 * value is projected from `PLANETARY_ECOSYSTEMS` through `landing/world/`.
 * Filtering is real (it narrows the canonical array); the topology and
 * relationship edges are derived from shared canonical attributes; the inspector
 * renders the registry's own evidence provenance.
 *
 * Scene state (filter, query, selection, view mode) is presentation state only
 * and never becomes a source of ecosystem truth.
 */

export function WorldsScene() {
  const [domain, setDomain] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const [showTopology, setShowTopology] = useState(true);

  const domains = useMemo(() => ["ALL", ...getWorldDomains()], []);

  const visibleWorlds = useMemo(
    () => filterWorlds({ domain, query }),
    [domain, query]
  );

  const totalWorlds = getWorlds().length;

  return (
    <>
      <CinematicScene
        id="worlds"
        title="THE CANONICAL NINE"
        subtitle="The registry defines what exists; intelligence interprets it."
        videoSrc="/media/landing/scenes/worlds.webm"
        posterSrc="/media/landing/scenes/worlds-poster.webp"
      >
        <div className="mt-8 w-full space-y-6" data-testid="worlds-scene">
          {/* Filter surface */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2" data-testid="domain-filters">
              {domains.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDomain(item)}
                  aria-pressed={domain === item}
                  className={cn(
                    "rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest transition-all duration-300 backdrop-blur-md",
                    domain === item
                      ? "border-white/60 bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                      : "border-white/20 bg-black/40 text-white/60 hover:bg-white/10 hover:border-white/40 hover:text-white"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 backdrop-blur-md transition-all focus-within:border-white/50 focus-within:bg-white/10">
                <Search className="h-3.5 w-3.5 text-white/50" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter canonical worlds"
                  aria-label="Filter canonical worlds"
                  className="w-44 bg-transparent font-mono text-[10px] text-white outline-none placeholder:text-white/40"
                />
              </label>
              <button
                type="button"
                onClick={() => setShowTopology((value) => !value)}
                aria-pressed={showTopology}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest transition-all duration-300 backdrop-blur-md",
                  showTopology
                    ? "border-white/60 bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                    : "border-white/20 bg-black/40 text-white/60 hover:bg-white/10 hover:border-white/40 hover:text-white"
                )}
              >
                <Network className="h-3.5 w-3.5" />
                {showTopology ? 'Show list' : 'Show topology'}
              </button>
            </div>
          </div>

          {showTopology && (
            <RelationshipGraph
              visibleWorldIds={visibleWorlds.map((world) => world.id)}
              focusWorldId={selectedWorldId ?? undefined}
              onSelectWorld={setSelectedWorldId}
            />
          )}

          {/* Canonical world nodes */}
          <div
            data-testid="worlds-grid"
            data-visible-count={visibleWorlds.length}
            data-total-count={totalWorlds}
            className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', showTopology && 'sr-only')}
          >
            {visibleWorlds.map((world) => (
              <article
                key={world.id}
                data-testid="world-node"
                data-world-id={world.id}
                className="group flex flex-col justify-between rounded-2xl border border-white/20 bg-black/40 p-5 backdrop-blur-xl transition-all duration-300 hover:bg-white/5 hover:border-white/50 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:-translate-y-1"
              >
                <div className="space-y-1">
                  <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/60">
                    {getWorldDomain(world)}
                  </div>
                  <h3 className="text-lg font-light tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {world.name}
                  </h3>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                    {world.status}
                  </p>
                </div>

                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  {world.description}
                </p>

                <button
                  type="button"
                  onClick={() => setSelectedWorldId(world.id)}
                  className="mt-4 inline-flex items-center gap-2 self-start rounded-lg border border-white/20 bg-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/80 backdrop-blur-sm transition-all hover:bg-white/20 hover:border-white/60 hover:text-white hover:shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Inspect World
                </button>
              </article>
            ))}
          </div>

          {visibleWorlds.length === 0 && (
            <p
              data-testid="worlds-empty"
              className="py-10 text-center font-mono text-[10px] uppercase tracking-widest text-white/30"
            >
              No canonical world matches this filter.
            </p>
          )}
        </div>
      </CinematicScene>

      <WorldInspector
        worldId={selectedWorldId}
        onClose={() => setSelectedWorldId(null)}
        onSelectWorld={setSelectedWorldId}
      />
    </>
  );
}
