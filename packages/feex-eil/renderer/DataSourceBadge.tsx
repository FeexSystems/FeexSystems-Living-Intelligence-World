/**
 * FEEX EIL — DataSourceBadge  (Gate 2)
 *
 * Renders the provenance label for any datum. CONSTRAINT_04: every
 * operational claim must carry a DataSourceLabel — LIVE, CACHED,
 * FALLBACK, UNAVAILABLE, ERROR or SIMULATED.
 */

import type { DataSourceLabel, LabeledDatum } from "../contracts/agent-state";

const LABEL_STYLES: Record<
  DataSourceLabel,
  { bg: string; text: string; label: string }
> = {
  LIVE: { bg: "bg-emerald-500/20", text: "text-emerald-300", label: "LIVE" },
  CACHED: { bg: "bg-amber-500/20", text: "text-amber-300", label: "CACHED" },
  FALLBACK: { bg: "bg-orange-500/20", text: "text-orange-300", label: "FALLBACK" },
  UNAVAILABLE: { bg: "bg-zinc-500/20", text: "text-zinc-400", label: "UNAVAILABLE" },
  ERROR: { bg: "bg-red-500/20", text: "text-red-400", label: "ERROR" },
  SIMULATED: { bg: "bg-violet-500/20", text: "text-violet-300", label: "SIM" },
};

export function DataSourceBadge({ label }: { label: DataSourceLabel }) {
  const s = LABEL_STYLES[label];
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}

/**
 * Renders a LabeledDatum with its provenance badge. UNAVAILABLE renders an
 * explicit absent state — never a fabricated value.
 */
export function LabeledDatumDisplay<T>({
  datum,
  render,
}: {
  datum: LabeledDatum<T> | null;
  render: (value: T) => string;
}) {
  if (!datum || datum.sourceLabel === "UNAVAILABLE") {
    return (
      <span className="flex items-center gap-1.5">
        <DataSourceBadge label="UNAVAILABLE" />
        <span className="text-zinc-500">—</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <DataSourceBadge label={datum.sourceLabel} />
      <span>{render(datum.value)}</span>
    </span>
  );
}
