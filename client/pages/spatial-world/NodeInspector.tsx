import { Link } from "react-router-dom";
import { Compass, ExternalLink, FileCode, RefreshCw, ShieldCheck, X } from "lucide-react";
import type { GraphNode } from "@/components/galaxy/types";
import type { ReactNode } from "react";
import type { TemporalEvent } from "./useKnowledgeGalaxy";

/**
 * Shared base styles for inspector action rows (link or button).
 */
const INSPECTOR_ACTION_BASE = "w-full h-9 flex items-center justify-center gap-2 text-xs transition-colors";

/**
 * Style variants for the responsive node inspector action row.
 */
const INSPECTOR_ACTION_VARIANTS = {
  secondary: "border border-white/20 bg-white/5 hover:bg-white/10 text-white",
  primary: "bg-white hover:bg-zinc-200 text-black font-semibold",
  outline: "border border-white/20 hover:bg-zinc-900 text-white",
  subtle: "border border-white/30 text-white hover:bg-white/10",
} as const;

type InspectorActionVariant = keyof typeof INSPECTOR_ACTION_VARIANTS;

interface InspectorActionProps {
  variant: InspectorActionVariant;
  className?: string;
  to?: string;
  onClick?: () => void;
  children: ReactNode;
}

/**
 * Renders a single full-width inspector action row, either as a router Link
 * (when `to` is provided) or a plain button.
 */
function InspectorAction({ variant, className = "", to, onClick, children }: InspectorActionProps) {
  const classes = `${INSPECTOR_ACTION_BASE} ${INSPECTOR_ACTION_VARIANTS[variant]} ${className}`.trim();

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={classes}>
      {children}
    </button>
  );
}

export interface NodeInspectorProps {
  node: GraphNode;
  isMobile: boolean;
  temporalEvents: TemporalEvent[];
  selectedCommit: string | null;
  loadingTemporal: boolean;
  onSelectCommit: (commit: string) => void;
  onClose: () => void;
  onGitHubClick: (url: string) => void;
}

/**
 * Responsive World Model node inspector: renders as a bottom sheet on mobile and
 * a floating panel on desktop, including metadata, repository provenance, the
 * temporal commit lens, and the node action rows.
 */
export function NodeInspector({
  node,
  isMobile,
  temporalEvents,
  selectedCommit,
  loadingTemporal,
  onSelectCommit,
  onClose,
  onGitHubClick,
}: NodeInspectorProps) {
  return (
    <aside
      className={`z-30 border bg-black/95 backdrop-blur-xl p-5 pointer-events-auto overflow-y-auto transition-all duration-300 ${
        isMobile
          ? "fixed bottom-0 inset-x-0 max-h-[55vh] rounded-t-2xl border-white/25 border-b-0 shadow-[0_-8px_32px_rgba(0,0,0,0.9)]"
          : "absolute top-24 right-4 md:right-6 w-full max-w-sm border-white/20 max-h-[calc(100vh-8rem)]"
      }`}
    >
      {isMobile && <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-3" />}

      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/50 mb-1">
            {node.type === "project" ? "WORLD NODE" : "TECHNOLOGY"}
          </div>
          <h2 className="text-base md:text-lg font-bold leading-tight text-white">
            {node.name}
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close inspector"
          className="text-white/50 hover:text-white p-1"
        >
          <X className="size-4" />
        </button>
      </div>

      {node.description && (
        <p className="text-xs text-white/70 mb-4 leading-relaxed font-mono">
          {node.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 mb-4">
        {node.domain && (
          <div className="border border-white/10 bg-zinc-950 p-2.5">
            <span className="text-[9px] uppercase text-white/40 block">Domain</span>
            <span className="text-xs font-semibold mt-1 block text-white">{node.domain}</span>
          </div>
        )}
        <div className="border border-white/10 bg-zinc-950 p-2.5">
          <span className="text-[9px] uppercase text-white/40 block">Language</span>
          <span className="text-xs font-semibold mt-1 block text-white">{node.language || "—"}</span>
        </div>
        {typeof node.artifactCount === "number" && (
          <div className="border border-white/10 bg-zinc-950 p-2.5">
            <span className="text-[9px] uppercase text-white/40 block">Artifacts</span>
            <span className="text-xs font-semibold mt-1 block text-white">{node.artifactCount}</span>
          </div>
        )}
      </div>

      {node.repository && (
        <div className="border border-white/10 bg-zinc-950 p-2.5 mb-4">
          <div className="flex items-center justify-between text-[9px] text-white/40 mb-1">
            <span>Repository</span>
            <ShieldCheck className="size-3.5 text-white/70" />
          </div>
          <div className="font-mono text-xs text-white break-all">{node.repository}</div>
        </div>
      )}

      {node.type === "project" && temporalEvents.length > 0 && (
        <div className="border border-white/15 bg-zinc-950 p-3 mb-4 space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase text-white/60 font-semibold tracking-wider">
            <span>Temporal Lens</span>
            {loadingTemporal && <RefreshCw className="size-3 animate-spin" />}
          </div>
          <div className="relative pt-2 pb-1">
            <input
              type="range"
              min={0}
              max={temporalEvents.length - 1}
              step={1}
              value={
                selectedCommit
                  ? Math.max(0, temporalEvents.findIndex((e) => e.commit === selectedCommit))
                  : 0
              }
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                const event = temporalEvents[idx];
                if (event) {
                  onSelectCommit(event.commit);
                }
              }}
              className="w-full h-1 bg-zinc-800 appearance-none outline-none accent-white cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-white/40">
            <span>{new Date(temporalEvents[0]?.timestamp).toLocaleDateString()}</span>
            <span>{new Date(temporalEvents[temporalEvents.length - 1]?.timestamp).toLocaleDateString()}</span>
          </div>
          {selectedCommit && (
            <div className="text-xs text-white/50 mt-1 font-mono">
              Snapshot: <span className="text-white">{selectedCommit.substring(0, 7)}</span>
              <br />
              <span className="text-[10px] truncate block mt-0.5 text-white/70">
                {temporalEvents.find((e) => e.commit === selectedCommit)?.message || "—"}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {node.type === "project" && (
          <InspectorAction
            variant="secondary"
            to={`/evidence?projectId=${encodeURIComponent(node.id)}`}
          >
            <FileCode className="size-3.5" /> Inspect Evidence
          </InspectorAction>
        )}

        {/* Authenticated GitHub Source link (Intercepted for public users) */}
        {node.url && (
          <InspectorAction variant="primary" onClick={() => onGitHubClick(node.url as string)}>
            GitHub Source <ExternalLink className="size-3.5" />
          </InspectorAction>
        )}

        <InspectorAction variant="outline" to={`/navigator?q=${encodeURIComponent(node.name)}`}>
          <Compass className="size-3.5 text-white" /> Query Navigator
        </InspectorAction>
        <InspectorAction
          variant="subtle"
          to={`/omni?q=${encodeURIComponent("Show architecture for " + node.name)}`}
        >
          Open in Omni-Command
        </InspectorAction>
      </div>
    </aside>
  );
}

export default NodeInspector;