import { useState } from "react";
import { Filter, X, ChevronDown, Check } from "lucide-react";

interface FacetFilter<T extends string> {
  label: string;
  options: { value: T; label: string; count?: number }[];
  selected: T | "all";
  onChange: (v: T | "all") => void;
  multi?: false;
}

interface FacetedFilterProps {
  categories: { value: string; label: string; count?: number }[];
  modalities: { value: string; label: string; count?: number }[];
  statuses: { value: string; label: string; count?: number }[];
  activeFilters: { type: "category" | "modality" | "status"; value: string }[];
  onFilterChange: (type: "category" | "modality" | "status", value: string) => void;
  onClear: () => void;
}

const FACET_ORDER: Array<"category" | "modality" | "status"> = ["category", "modality", "status"];

export function FacetedFilter({
  categories,
  modalities,
  statuses,
  activeFilters,
  onFilterChange,
  onClear,
}: FacetedFilterProps) {
  const [open, setOpen] = useState<"category" | "modality" | "status" | null>(null);

  const toggle = (type: "category" | "modality" | "status", value: string) => {
    onFilterChange(type, value);
    setOpen(null);
  };

  const isSelected = (type: "category" | "modality" | "status", value: string) =>
    activeFilters.some((f) => f.type === type && f.value === value);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-white/50" />
        <h2 className="text-sm font-semibold text-white/80">Faceted Search</h2>
        <span className="text-xs text-white/40 font-mono">
          ({activeFilters.length} active)
        </span>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((f) => (
            <span
              key={`${f.type}-${f.value}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-mono"
            >
              <span className="text-white/60">{f.type}:</span>
              <span className="text-white/80">{f.value}</span>
              <button
                onClick={() => onClear()}
                className="text-white/30 hover:text-white/60"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FACET_ORDER.map((type) => {
          const data = type === "category" ? categories : type === "modality" ? modalities : statuses;
          const selectedCount = data.filter((d) => isSelected(type, d.value)).length;

          return (
            <div key={type}>
              <button
                onClick={() => setOpen(open === type ? null : type)}
                className="flex items-center justify-between w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    {type}
                  </span>
                  <span className="text-[10px] text-white/30">
                    {data.length} options
                    {selectedCount > 0 && ` · ${selectedCount} selected`}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-white/30 transition-transform ${open === type ? "rotate-180" : ""}`}
                />
              </button>

              {open === type && (
                <div className="mt-2 space-y-1 border border-white/5 rounded-xl bg-black/20 px-3 py-3">
                  {data.map((d) => {
                    const count = d.count ?? 0;
                    const selected = isSelected(type, d.value);
                    return (
                      <button
                        key={d.value}
                        onClick={() => toggle(type, d.value)}
                        className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                          selected
                            ? "bg-white/10 text-white"
                            : "text-white/60 hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-mono">{d.label}</span>
                          {count > 0 && (
                            <span className={`text-[10px] font-mono ${selected ? "text-white/40" : "text-white/30"}`}>
                              ({count})
                            </span>
                          )}
                        </span>
                        {selected && <Check className="h-3 w-3 text-emerald-400" />}
                      </button>
                    );
                  })}
                  {data.length === 0 && (
                    <p className="text-xs text-white/30 px-1">No facet values available.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={onClear}
          disabled={activeFilters.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <X className="h-4 w-4" />
          Clear Filters
        </button>
      </div>
    </div>
  );
}
