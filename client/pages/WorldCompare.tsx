import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search, Layers, AlertTriangle, X, Copy
} from "lucide-react";
import { Breadcrumbs } from "@/components/navigation";
import { FullWidthNav, AppleDock, AmbientLivingBackground } from "@/landing/cinematic";

interface ComparisonRow {
  key: string;
  label: string;
  type: "string" | "number";
  compute?: (p: any) => string | number;
}

interface ComparisonResult {
  projects: any[];
  comparison: { rows: ComparisonRow[]; matrix: Record<string, string | number>[] };
  count: number;
  facets: {
    categories: string[];
    modalities: string[];
    statuses: string[];
  };
}

interface FacetFilter {
  label: string;
  value: string;
  type: "category" | "modality" | "status";
}

export default function WorldCompare() {
  const [data, setData] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FacetFilter[]>([]);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/world-model/comparison?q=${encodeURIComponent(query)}&limit=30`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json);
        else setData(null);
      })
      .finally(() => setLoading(false));
  }, [query]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white/70 font-mono text-sm flex items-center gap-2">
          <Search className="h-4 w-4 animate-spin" />
          <span>Building comparison matrix…</span>
        </div>
      </div>
    );
  }

  const handleFilterChange = (type: FacetFilter["type"], value: string) => {
    setFilters((prev) => {
      const existing = prev.find((f) => f.type === type);
      if (existing) {
        return prev.map((f) => (f.type === type ? { ...f, value } : f));
      }
      return [...prev, { label: type === "category" ? "Category" : type === "modality" ? "Modality" : "Status", value, type }];
    });
  };

  const handleRemoveFilter = (type: FacetFilter["type"]) => {
    setFilters((prev) => prev.filter((f) => f.type !== type));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <FullWidthNav />
      <AmbientLivingBackground />

      <div className="relative max-w-7xl mx-auto px-5 py-8 md:py-12">
        <Breadcrumbs
          items={[
            { label: "World", to: "/world" },
            { label: "Comparison", to: "/world/compare" },
          ]}
        />

        <div className="flex flex-col gap-6">
          {/* Search + filters */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects, categories, owners…"
                  className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none transition-colors"
                />
              </div>
              <button
                onClick={() => {
                  if (filters.length === 0) return;
                  const params = new URLSearchParams();
                  filters.forEach((f) => params.set(f.type, f.value));
                  window.location.href = `/world/compare?${params.toString()}`;
                }}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Layers className="h-4 w-4" />
                Apply Filters ({filters.length})
              </button>
            </div>

            {filters.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {filters.map((f) => (
                  <span
                    key={`${f.type}-${f.value}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono"
                  >
                    <span className="text-white/60">{f.label}:</span>
                    <span className="text-white/80">{f.value}</span>
                    <button
                      onClick={() => handleRemoveFilter(f.type)}
                      className="text-white/50 hover:text-white/60"
                    >
                      <span className="sr-only">Remove</span>
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                        <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Comparison matrix */}
          {data?.comparison && data.comparison.rows.length ? (
            <div className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
              {/* Comparison header */}
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Layers className="h-4 w-4" />
                  <span>Comparison — {data.count} projects</span>
                </div>
                <div className="flex gap-2">
                  {["category", "modality", "status"].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        const values = data.facets[type as keyof typeof data.facets];
                        if (!values.length) return;
                        handleFilterChange(type as any, values[0]);
                      }}
                      className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-white/50 hover:text-white/70 hover:border-white/10 hover:bg-white/5 transition-colors"
                    >
                      {type}
                      <span className="ml-1 font-normal">({data.facets[type as keyof typeof data.facets]?.length})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Table header */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {data.comparison.rows.map((row) => (
                        <th
                          key={row.key}
                          className="text-left py-3 pr-4 font-mono text-[10px] uppercase tracking-wider text-white/50"
                        >
                          {row.label}
                        </th>
                      ))}
                      {data.projects.map((p: any) => (
                        <th
                          key={p.id}
                          className="text-left py-3 pr-4 font-mono text-xs text-white/60"
                        >
                          {p.name.split(" ")[0]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.comparison.matrix.map((row, ri) => (
                      <tr key={ri}>
                        {data.comparison.rows.map((rowDef) => (
                          <td
                            key={rowDef.key}
                            className="py-2.5 pr-4 text-xs text-white/50"
                          >
                            {typeof rowDef.compute === "function"
                              ? rowDef.compute(data.projects[ri])
                              : rowDef.type === "number"
                              ? String(row[rowDef.key] ?? "—")
                              : String(row[rowDef.key] ?? "—")}
                          </td>
                        ))}
                        {data.projects.map((p: any) => (
                          <td key={p.id} className="py-2.5 pr-4 font-mono text-xs text-white/60">
                            {p.name}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                <p className="text-[10px] text-white/50">
                  Comparison matrix — use filters above to refine
                </p>
                <button
                  onClick={() => setCopied(true)}
                  className="inline-flex items-center gap-1.5 text-[10px] text-white/50 hover:text-white transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  {copied ? "Copied" : "Copy as CSV"}
                </button>
              </div>
            </div>
          ) : data?.projects.length ? (
            <div className="rounded-2xl border border-white/10 bg-white/3 p-8 text-center">
              <Layers className="h-10 w-10 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-bold mb-2">No comparison results</h3>
              <p className="text-sm text-white/50 mb-4">
                Adjust your search or filters to find matching projects.
              </p>
              <Link
                to="/world"
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                ← Back to spatial galaxy
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/3 p-8 text-center">
              <AlertTriangle className="h-10 w-10 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-bold mb-2">No projects found</h3>
              <p className="text-sm text-white/50 mb-4">
                Try a different search term or clear your filters.
              </p>
              <div className="flex gap-2 justify-center">
                <Link
                  to="/world"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Browse all worlds
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <AppleDock />
    </div>
  );
}
