import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { X, GitBranch, ShieldCheck, ShieldAlert, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getWorldById,
  getWorldEvidence,
  getWorldEdges,
  getWorldDomain,
  getWorlds,
} from "./WorldModel";

/**
 * WorldInspector
 *
 * The selected-world detail surface. Opened by the `INSPECT WORLD` action and
 * closed by the dismiss control.
 *
 * Invariant 3 ("evidence over decoration"): the evidence block renders the
 * canonical `evidence` provenance record verbatim. It does not upgrade a
 * DESIGN_SPEC value to "verified" or synthesize a confidence number. Visual
 * telemetry (metrics/highlight) is presented as decorative and labelled as such.
 */

export interface WorldInspectorProps {
  worldId: string | null;
  onClose: () => void;
  onSelectWorld?: (worldId: string) => void;
}

export function WorldInspector({ worldId, onClose, onSelectWorld }: WorldInspectorProps) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!worldId) return;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab' || !worldId) return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])');
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [worldId, onClose]);

  if (!worldId) return null;

  const world = getWorldById(worldId);
  const evidence = getWorldEvidence(worldId);

  if (!world || !evidence) return null;

  const relatedEdges = getWorldEdges().filter(
    (edge) => edge.from === world.id || edge.to === world.id
  );

  const order = getWorlds().map((entry) => entry.id);
  const position = order.indexOf(world.id);
  const step = (delta: number) => {
    const next = order[(position + delta + order.length) % order.length];
    if (next) onSelectWorld?.(next);
  };

  return (
    <aside
      data-testid="world-inspector"
      data-world-id={world.id}
      role="dialog"
      ref={panelRef}
      tabIndex={-1}
      aria-modal="true"
      aria-label={`World inspector: ${world.name}`}
      className="fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-[#070707]/95 backdrop-blur-xl"
    >
      <header className="flex items-start justify-between gap-4 border-b border-white/[.07] px-6 py-5">
        <div className="space-y-1">
          <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/60">
            {getWorldDomain(world)} // WORLD INSPECTOR
          </div>
          <h3 className="text-2xl font-light tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{world.name}</h3>
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">
            {world.status}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close world inspector"
          className="text-white/50 transition hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="space-y-6 px-6 py-6">
        <section className="space-y-2">
          <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/50">
            DESCRIPTION
          </div>
          <p className="text-sm leading-relaxed text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{world.description}</p>
        </section>

        <section className="space-y-2" data-testid="inspector-evidence">
          <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/50">
            EVIDENCE FABRIC
          </div>

          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-[10px] uppercase tracking-widest",
              evidence.verified
                ? "border-emerald-400/30 bg-emerald-400/[.08] text-emerald-100"
                : "border-amber-400/30 bg-amber-400/[.08] text-amber-100"
            )}
          >
            {evidence.verified ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5" />
            )}
            {evidence.evidenceClass} · {evidence.verified ? "VERIFIED" : "UNVERIFIED"}
          </div>

          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 font-mono text-[10px] text-white/70">
            <dt className="text-white/50">SOURCE</dt>
            <dd>{evidence.source}</dd>
            <dt className="text-white/50">REPOSITORY</dt>
            <dd className="break-all">{evidence.repository}</dd>
            {evidence.reference && (
              <>
                <dt className="text-white/50">REFERENCE</dt>
                <dd className="break-all">{evidence.reference}</dd>
              </>
            )}
          </dl>

          <div className="flex flex-wrap gap-2">
            <Link to="/world" className="border border-white/60 bg-white/20 px-3 py-2 font-mono text-[10px] text-white backdrop-blur-md transition-all hover:bg-white/30 hover:border-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] focus-visible:outline focus-visible:outline-white">ENTER WORLD</Link>
            <Link to="/evidence" className="border border-white/30 bg-black/40 px-3 py-2 font-mono text-[10px] text-white/90 backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/60 hover:text-white focus-visible:outline focus-visible:outline-white">VIEW EVIDENCE</Link>
          </div>

          <a
            href={evidence.repositoryUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 border border-white/20 bg-black/40 px-3 py-2 font-mono text-[10px] text-white/80 backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/50 hover:text-white focus-visible:outline focus-visible:outline-white"
          >
            <GitBranch className="h-3.5 w-3.5" />
            OPEN REPOSITORY TRACE
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
        </section>

        <section className="space-y-2">
          <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/50">
            RELATIONSHIPS ({relatedEdges.length})
          </div>
          {relatedEdges.length === 0 ? (
            <p className="font-mono text-[10px] text-white/50">
              No shared canonical domain or repository.
            </p>
          ) : (
            <ul className="space-y-1">
              {relatedEdges.map((edge) => {
                const otherId = edge.from === world.id ? edge.to : edge.from;
                const other = getWorldById(otherId);
                if (!other) return null;
                return (
                  <li key={edge.id}>
                    <button
                      type="button"
                      onClick={() => onSelectWorld?.(other.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left font-mono text-[10px] text-white/70 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/40 hover:text-white"
                    >
                      <span>{other.name}</span>
                      <span className="text-white/50">{edge.kind}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/50">
            CAPABILITIES
          </div>
          <div className="flex flex-wrap gap-2">
            {world.capabilities.map((capability) => (
              <span
                key={capability}
                className="rounded-full border border-white/20 bg-white/5 px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-white/70 backdrop-blur-sm"
              >
                {capability}
              </span>
            ))}
          </div>
        </section>

        <section className="space-y-3 border-t border-white/[.07] pt-5">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => step(-1)} aria-label="Inspect previous world" className="flex items-center gap-1 border border-white/20 bg-black/40 px-3 py-2 font-mono text-[10px] text-white/80 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/50 hover:text-white focus-visible:outline focus-visible:outline-white"><ChevronLeft className="h-3.5 w-3.5" /> PREV</button>
            <span className="font-mono text-[9px] tracking-[.2em] text-white/50">{position + 1} / {order.length}</span>
            <button type="button" onClick={() => step(1)} aria-label="Inspect next world" className="flex items-center gap-1 border border-white/20 bg-black/40 px-3 py-2 font-mono text-[10px] text-white/80 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/50 hover:text-white focus-visible:outline focus-visible:outline-white">NEXT <ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </section>

        <section className="space-y-3 border-t border-white/[.07] pt-5">
          <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/50">
            DESIGN TELEMETRY — NOT CANONICAL TRUTH
          </div>
          <div className="grid grid-cols-2 gap-3 font-mono text-[10px] text-white/60">
            {Object.entries(world.metrics).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
                {value}
              </div>
            ))}
          </div>
          <p className="font-mono text-[9px] leading-relaxed text-white/50">{world.sysLog}</p>
        </section>
      </div>
    </aside>
  );
}
