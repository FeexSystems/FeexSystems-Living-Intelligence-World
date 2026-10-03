import React from "react";
import { X, GitBranch, ShieldCheck, ShieldAlert, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getWorldById,
  getWorldEvidence,
  getWorldEdges,
  getWorldDomain,
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
  if (!worldId) return null;

  const world = getWorldById(worldId);
  const evidence = getWorldEvidence(worldId);

  if (!world || !evidence) return null;

  const relatedEdges = getWorldEdges().filter(
    (edge) => edge.from === world.id || edge.to === world.id
  );

  return (
    <aside
      data-testid="world-inspector"
      data-world-id={world.id}
      role="dialog"
      aria-label={`${world.name} inspector`}
      className="fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-[#070707]/95 backdrop-blur-xl"
    >
      <header className="flex items-start justify-between gap-4 border-b border-white/[.07] px-6 py-5">
        <div className="space-y-1">
          <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/40">
            {getWorldDomain(world)} // WORLD INSPECTOR
          </div>
          <h3 className="text-2xl font-light tracking-tight text-white">{world.name}</h3>
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
            {world.status}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close world inspector"
          className="text-white/30 transition hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="space-y-6 px-6 py-6">
        <section className="space-y-2">
          <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/35">
            DESCRIPTION
          </div>
          <p className="text-sm leading-relaxed text-white/70">{world.description}</p>
        </section>

        <section className="space-y-2" data-testid="inspector-evidence">
          <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/35">
            EVIDENCE FABRIC
          </div>

          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-[10px] uppercase tracking-widest",
              evidence.verified
                ? "border-emerald-400/20 bg-emerald-400/[.04] text-emerald-200/80"
                : "border-amber-400/20 bg-amber-400/[.04] text-amber-200/80"
            )}
          >
            {evidence.verified ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5" />
            )}
            {evidence.evidenceClass} · {evidence.verified ? "VERIFIED" : "UNVERIFIED"}
          </div>

          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 font-mono text-[10px] text-white/50">
            <dt className="text-white/30">SOURCE</dt>
            <dd>{evidence.source}</dd>
            <dt className="text-white/30">REPOSITORY</dt>
            <dd className="break-all">{evidence.repository}</dd>
            {evidence.reference && (
              <>
                <dt className="text-white/30">REFERENCE</dt>
                <dd className="break-all">{evidence.reference}</dd>
              </>
            )}
          </dl>

          <a
            href={evidence.repositoryUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 font-mono text-[10px] text-white/55 transition hover:border-white/30 hover:text-white"
          >
            <GitBranch className="h-3.5 w-3.5" />
            OPEN REPOSITORY TRACE
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
        </section>

        <section className="space-y-2">
          <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/35">
            RELATIONSHIPS ({relatedEdges.length})
          </div>
          {relatedEdges.length === 0 ? (
            <p className="font-mono text-[10px] text-white/30">
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
                      className="flex w-full items-center justify-between rounded-lg border border-white/[.07] px-3 py-2 text-left font-mono text-[10px] text-white/50 transition hover:border-white/25 hover:text-white"
                    >
                      <span>{other.name}</span>
                      <span className="text-white/25">{edge.kind}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/35">
            CAPABILITIES
          </div>
          <div className="flex flex-wrap gap-2">
            {world.capabilities.map((capability) => (
              <span
                key={capability}
                className="rounded-full border border-white/10 px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-white/45"
              >
                {capability}
              </span>
            ))}
          </div>
        </section>

        <section className="space-y-3 border-t border-white/[.07] pt-5">
          <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/25">
            DESIGN TELEMETRY — NOT CANONICAL TRUTH
          </div>
          <div className="grid grid-cols-2 gap-3 font-mono text-[10px] text-white/40">
            {Object.entries(world.metrics).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-white/[.07] px-3 py-2">
                {value}
              </div>
            ))}
          </div>
          <p className="font-mono text-[9px] leading-relaxed text-white/20">{world.sysLog}</p>
        </section>
      </div>
    </aside>
  );
}
