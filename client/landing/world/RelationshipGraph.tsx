import { useState } from "react";
import { cn } from "@/lib/utils";
import { getTopologyLayout, getWorldEdges, getWorldDomain } from "./WorldModel";

/**
 * RelationshipGraph
 *
 * Renders the canonical world topology as an SVG node/edge map. Every node is a
 * `PLANETARY_ECOSYSTEMS` record and every edge is derived from a shared canonical
 * attribute (domain family or repository) — see `getWorldEdges`. Nothing here
 * invents a relationship.
 */

export interface RelationshipGraphProps {
  /** Dims nodes not in the selected world's neighbourhood. */
  focusWorldId?: string;
  visibleWorldIds?: string[];
  /** Lifts a world into the inspector. */
  onSelectWorld?: (worldId: string) => void;
  className?: string;
}

export function RelationshipGraph({
  focusWorldId,
  visibleWorldIds,
  onSelectWorld,
  className,
}: RelationshipGraphProps) {
  const [hoveredWorldId, setHoveredWorldId] = useState<string | null>(null);
  const activeFocusId = focusWorldId ?? hoveredWorldId ?? undefined;
  const nodes = getTopologyLayout().filter(({ world }) => !visibleWorldIds || visibleWorldIds.includes(world.id));
  const edges = getWorldEdges().filter((edge) => nodes.some(({ world }) => world.id === edge.from) && nodes.some(({ world }) => world.id === edge.to));

  const connectedToFocus = new Set<string>();
  if (activeFocusId) {
    connectedToFocus.add(activeFocusId);
    for (const edge of edges) {
      if (edge.from === activeFocusId) connectedToFocus.add(edge.to);
      if (edge.to === activeFocusId) connectedToFocus.add(edge.from);
    }
  }

  const positionById = new Map(nodes.map((node) => [node.world.id, node]));

  return (
    <div
      data-testid="relationship-graph"
      data-node-count={nodes.length}
      data-edge-count={edges.length}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/50",
        className
      )}
    >
      {/* NB: no role="img" on this <svg>. The nodes inside are real interactive
          controls (role="button" with tabIndex and Enter/Space handlers), and an
          image role would claim the whole subtree is a single static graphic —
          axe reports that as `nested-interactive` (serious), and screen readers
          can then neither reach nor announce the nodes. The svg is a container
          for an interactive graph, so it is labelled as a group instead. */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="h-[min(36vh,420px)] w-full"
        role="group"
        aria-label="Canonical world relationship graph"
      >
        {/* Edges first so nodes render above them. */}
        <g>
          {edges.map((edge) => {
            const from = positionById.get(edge.from);
            const to = positionById.get(edge.to);
            if (!from || !to) return null;

            const isFocused =
              !activeFocusId || edge.from === activeFocusId || edge.to === activeFocusId;

            return (
              <line
                key={edge.id}
                data-testid="graph-edge"
                data-edge-kind={edge.kind}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="currentColor"
                strokeWidth={edge.kind === "SHARES_REPOSITORY" ? 0.5 : 0.25}
                className={cn(
                  "transition-opacity duration-300",
                  isFocused ? "text-white/50" : "text-white/[.06]"
                )}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map(({ world, x, y }) => {
            const dimmed = Boolean(activeFocusId) && !connectedToFocus.has(world.id);
            const isFocus = world.id === activeFocusId;

            return (
              <g
                key={world.id}
                role="button"
                tabIndex={0}
                aria-label={`Inspect ${world.name}, ${getWorldDomain(world)}`}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectWorld?.(world.id); } }}
                data-testid="graph-node"
                data-world-id={world.id}
                transform={`translate(${x} ${y})`}
                className={cn(
                  "cursor-pointer transition-opacity duration-300",
                  dimmed ? "opacity-25" : "opacity-100"
                )}
                onClick={() => onSelectWorld?.(world.id)}
                onMouseEnter={() => setHoveredWorldId(world.id)}
                onMouseLeave={() => setHoveredWorldId((current) => (current === world.id ? null : current))}
                onFocus={() => setHoveredWorldId(world.id)}
                onBlur={() => setHoveredWorldId((current) => (current === world.id ? null : current))}
              >
                <circle
                  r={isFocus ? 2.4 : 1.7}
                  className={cn(
                    "fill-black stroke-current",
                    isFocus ? "text-white" : "text-white/50"
                  )}
                  strokeWidth={0.4}
                />
                <text
                  y={-3.4}
                  textAnchor="middle"
                  className="fill-current text-white/70"
                  style={{ fontSize: "2.1px", fontFamily: "monospace" }}
                >
                  {world.name}
                </text>
                {/* Explicit space text node: JSX strips whitespace-only lines between
                    tags, and axe concatenates visible child text without separators —
                    without this, the visible text cannot match the aria-label. */}
                {" "}
                <text
                  y={4.6}
                  textAnchor="middle"
                  className="fill-current text-white/50"
                  style={{ fontSize: "1.7px", fontFamily: "monospace" }}
                >
                  {getWorldDomain(world)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="flex items-center gap-5 border-t border-white/[.07] px-4 py-3 font-mono text-[9px] uppercase tracking-[.2em] text-white/50">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-px w-6 bg-white/40" /> Shared domain
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-[2px] w-6 bg-white/50" /> Shared repository
        </span>
        <span className="ml-auto">{edges.length} SHARED-ATTRIBUTE EDGES</span>
      </div>
    </div>
  );
}
