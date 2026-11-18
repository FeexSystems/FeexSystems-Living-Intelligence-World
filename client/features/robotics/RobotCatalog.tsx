import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Activity,
  ChevronRight,
  X,
  Bot,
  Mic,
} from "lucide-react";
import { listRobotics, getRoboticsStatus, RoboticsStatus } from "./api";
import type { RobotCardViewModel, RoboticsFilterState } from "./types";

const STATUS_DOT: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  DORMANT: "bg-amber-500",
  ARCHIVED: "bg-slate-500",
  TERMINATED: "bg-red-500",
  PROPOSED: "bg-blue-500",
  INACTIVE: "bg-slate-400",
  EOL: "bg-red-600",
};

export function RobotCatalog() {
  const navigate = useNavigate();
  const [robots, setRobots] = useState<RobotCardViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<RoboticsStatus | null>(null);
  const [filter, setFilter] = useState<RoboticsFilterState>({
    robotClass: "all",
    domain: "all",
    lifecycle: "all",
    holokaiIntegrated: "all",
    search: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [listRes, statusRes] = await Promise.all([
          listRobotics({
            q: filter.search || undefined,
            limit: 50,
          }),
          getRoboticsStatus(),
        ]);
        if (!cancelled) {
          setRobots(
            listRes.data.map((r) => ({
              id: r.id,
              name: r.name || r.repository,
              slug: r.slug || r.repository.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
              description: r.description ?? null,
              manufacturer: r.worldOwnerOrg ?? null,
              robotClass: r.worldModality ?? null,
              domain: r.worldCategory ?? null,
              lifecycle: r.worldLifecycle ?? null,
              capabilities: Array.isArray(r.capabilities) ? r.capabilities : [],
              holokaiIntegrated: !!r.holokaiIntegrated,
              worldModelProjectId: r.id,
            })),
          );
          setStatus(statusRes.data);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load robots");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filter.search]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter({ ...filter, search: e.target.value });
  };

  const activeFiltersCount = Object.values(filter).reduce((n, v) => {
    if (v === "all" || v === "" || v === true || v === false) return n;
    return n + 1;
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white/60">
        <Activity className="h-5 w-5 animate-spin" />
        <span className="ml-2 font-mono text-xs">Loading robotics catalog…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white/60 p-6">
        <X className="h-10 w-10 mb-3 text-red-400" />
        <h2 className="text-lg font-bold mb-2">Robotics catalog unavailable</h2>
        <p className="text-sm text-white/50 mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative max-w-7xl mx-auto px-5 py-8 md:py-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Robotics Catalog</h1>
            <p className="text-white/50 mt-1 font-mono text-xs">
              Holokai-integrated robot systems &mdash; {status?.roboticsWorldCount ?? robots.length} worlds online
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono border ${
              status?.status === "operational"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-white/10 bg-white/5 text-white/50"
            }`}>
              {status?.status ?? "operational"}
            </span>
            {status?.holokaiIntegration && (
              <button
                onClick={() => navigate("/world/compare")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-[11px]"
                title="Compare robotics worlds"
              >
                <Mic className="h-3 w-3 text-emerald-400" /> Holokai Uplink
              </button>
            )}
          </div>
        </header>

        {/* Search + filter bar */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <input
                value={filter.search}
                onChange={handleSearch}
                placeholder="Search robots, manufacturers, capabilities…"
                className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none transition-colors"
              />
            </div>
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {filter.robotClass !== "all" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-mono">
                    <span className="text-white/60">class:</span>
                    <span className="text-white/80">{filter.robotClass}</span>
                    <button onClick={() => setFilter({ ...filter, robotClass: "all" })} className="text-white/50 hover:text-white/60">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filter.domain !== "all" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-mono">
                    <span className="text-white/60">domain:</span>
                    <span className="text-white/80">{filter.domain}</span>
                    <button onClick={() => setFilter({ ...filter, domain: "all" })} className="text-white/50 hover:text-white/60">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filter.lifecycle !== "all" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-mono">
                    <span className="text-white/60">lifecycle:</span>
                    <span className="text-white/80">{filter.lifecycle}</span>
                    <button onClick={() => setFilter({ ...filter, lifecycle: "all" })} className="text-white/50 hover:text-white/60">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() =>
                    setFilter({
                      robotClass: "all",
                      domain: "all",
                      lifecycle: "all",
                      holokaiIntegrated: "all",
                      search: "",
                    })
                  }
                  className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-[10px]"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Robot grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {robots.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-white/10 bg-white/3 p-12 text-center">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-bold mb-2">No robots found</h3>
              <p className="text-sm text-white/50 mb-4">
                Adjust your search or filters to discover robotics worlds.
              </p>
              <Link
                to="/world"
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                \u2190 Browse all worlds
              </Link>
            </div>
          ) : (
            robots.map((robot) => (
              <article
                key={robot.id}
                className="group rounded-xl border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 transition-all p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${STATUS_DOT[robot.lifecycle ?? "INACTIVE"] ?? "bg-white/30"}`}
                    />
                    <span className="font-mono text-[10px] text-white/50">{robot.lifecycle ?? "\u2014"}</span>
                  </div>
                  {robot.holokaiIntegrated && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                      <Activity className="h-2.5 w-2.5 animate-pulse" /> HOLOKAI
                    </span>
                  )}
                </div>
                <Link
                  to={`/robotics/${robot.id}`}
                  className="block"
                >
                  <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition mb-1">
                    {robot.name}
                  </h3>
                  {robot.manufacturer && (
                    <p className="text-[10px] text-white/50 font-mono mb-2">{robot.manufacturer}</p>
                  )}
                  <p className="text-xs text-white/60 mb-3 line-clamp-2">{robot.description ?? "No description available."}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {robot.capabilities.slice(0, 4).map((cap) => (
                      <span
                        key={cap}
                        className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] text-white/50"
                      >
                        {cap}
                      </span>
                    ))}
                    {robot.capabilities.length > 4 && (
                      <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] text-white/50">
                        +{robot.capabilities.length - 4}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-[10px] font-mono text-white/50">
                      {robot.robotClass ?? "\u2014"}
                    </span>
                    <ChevronRight className="h-3 w-3 text-white/50 group-hover:text-white transition" />
                  </div>
                </Link>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
