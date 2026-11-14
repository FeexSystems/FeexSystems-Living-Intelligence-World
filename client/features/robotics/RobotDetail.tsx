import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  RefreshCw,
  Globe,
  Mic,
  Activity,
  Layers,
  Cpu,
  Bot,
  Package,
  ChevronLeft,
  X,
  ExternalLink,
} from "lucide-react";
import { getRoboticsDetail, updateRoboticsMetadata } from "./api";

interface RobotDetailData {
  id: string;
  repository: string;
  name: string;
  owner: string;
  url: string;
  description?: string | null;
  worldCategory?: string | null;
  worldModality?: string | null;
  worldStatus?: string | null;
  worldLifecycle?: string | null;
  worldYear?: number | null;
  worldLabel?: string | null;
  worldRole?: string | null;
  worldOwnerOrg?: string | null;
  worldLicenses?: string | null;
  verificationVerdict: string;
  verificationNote?: string | null;
  metadata?: Record<string, unknown>;
  evidence?: Array<{ id: string; evidenceType: string; sourceUrl: string; observedAt: string }>;
  artifacts?: Array<{ id: string; path: string; sha: string; kind: string; size?: number }>;
  events?: Array<{ id: string; eventType: string; commitSha?: string; occurredAt: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  DORMANT: "Dormant",
  ARCHIVED: "Archived",
  TERMINATED: "Terminated",
  PROPOSED: "Proposed",
  INACTIVE: "Inactive",
  EOL: "End of Life",
};

const MODALITY_ICON: Record<string, typeof Bot> = {
  CONTROL: Cpu,
  SIMULATION: Package,
  TEXT: Globe,
  MULTIMODAL: Layers,
};

export default function RobotDetail() {
  const { robotId } = useParams<{ robotId: string }>();
  const navigate = useNavigate();
  const [robot, setRobot] = useState<RobotDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getRoboticsDetail(robotId);
        if (!cancelled) {
          if (res.success && res.data) setRobot(res.data);
          else setError(res.error || "Failed to load robot");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [robotId]);

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!robot) return;
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const body: Record<string, string> = {};
      for (const [key, value] of formData.entries()) {
        body[key] = String(value);
      }
      await updateRoboticsMetadata(robotId, body);
      // Refresh
      const res = await getRoboticsDetail(robotId);
      if (res.success && res.data) setRobot(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white/60">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <span className="ml-2 font-mono text-xs">Loading robot detail…</span>
      </div>
    );
  }

  if (error || !robot) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white/60 p-6">
        <X className="h-10 w-10 mb-3 text-red-400" />
        <h2 className="text-lg font-bold mb-2">Robot not found</h2>
        <p className="text-sm text-white/40 mb-6">{error || "No data returned."}</p>
        <button
          onClick={() => navigate("/robotics")}
          className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm"
        >
          ← Back to catalog
        </button>
      </div>
    );
  }

  const ModalityIcon = MODALITY_ICON[robot.worldModality ?? ""] || Bot;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative max-w-7xl mx-auto px-5 py-8 md:py-12">
        <nav className="mb-6">
          <Link
            to="/robotics"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition"
          >
            <ChevronLeft className="h-3 w-3" />
            Robotics Catalog
          </Link>
        </nav>

        <header className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ModalityIcon className="h-5 w-5 text-emerald-400" />
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                  STATUS_DOT[robot.worldStatus ?? "INACTIVE"]
                }`}
              >
                {STATUS_LABELS[robot.worldStatus ?? "INACTIVE"] ?? robot.worldStatus}
              </span>
              {robot.holokaiIntegrated && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  <Activity className="h-3 w-3 animate-pulse" /> HOLOKAI INTEGRATED
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">{robot.name}</h1>
            <p className="text-sm text-white/50 font-mono">{robot.repository}</p>
          </div>
          <div className="flex items-end gap-3">
            {robot.url && (
              <a
                href={robot.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm"
              >
                <ExternalLink className="h-3 w-3" /> View Repository
              </a>
            )}
            <Link
              to="/world/compare"
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm"
            >
              <Layers className="h-3 w-3 mr-1" /> Compare
            </Link>
          </div>
        </header>

        {/* Metadata grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Description</h3>
            <p className="text-sm text-white/70 leading-relaxed">
              {robot.description ?? "No description available."}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Lifecycle</h3>
            <p className="text-sm font-mono text-white">{STATUS_LABELS[robot.worldLifecycle ?? "UNKNOWN"] ?? robot.worldLifecycle ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Modality</h3>
            <p className="text-sm font-mono text-white">{robot.worldModality ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Status</h3>
            <p className="text-sm font-mono text-white">{STATUS_LABELS[robot.worldStatus ?? "UNKNOWN"] ?? robot.worldStatus ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Year</h3>
            <p className="text-sm font-mono text-white">{String(robot.worldYear ?? "—")}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Owner Org</h3>
            <p className="text-sm font-mono text-white">{robot.worldOwnerOrg ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Role</h3>
            <p className="text-sm font-mono text-white">{robot.worldRole ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Licenses</h3>
            <p className="text-sm font-mono text-white">{robot.worldLicenses ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Verification</h3>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  robot.verificationVerdict === "VERIFIED"
                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                    : robot.verificationVerdict === "NOT_VERIFIED"
                    ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                    : "text-gray-400 bg-gray-500/10 border border-gray-500/20"
                }`}
              >
                {robot.verificationVerdict}
              </span>
              {robot.verificationNote && <span className="text-xs text-white/40">{robot.verificationNote}</span>}
            </div>
          </div>
        </div>

        {/* Metadata editor (admin) */}
        <form onSubmit={handleSaveMetadata} className="rounded-xl border border-white/10 bg-white/5 p-6 mb-8">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
            <Cpu className="h-3 w-3" /> Edit Faceted Metadata
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-white/40 font-mono mb-1">worldModality</label>
              <input
                name="worldModality"
                defaultValue={robot.worldModality ?? ""}
                className="w-full rounded border border-white/10 bg-black/30 py-2 px-3 text-sm text-white focus:border-white/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 font-mono mb-1">worldLifecycle</label>
              <input
                name="worldLifecycle"
                defaultValue={robot.worldLifecycle ?? ""}
                className="w-full rounded border border-white/10 bg-black/30 py-2 px-3 text-sm text-white focus:border-white/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 font-mono mb-1">worldStatus</label>
              <input
                name="worldStatus"
                defaultValue={robot.worldStatus ?? ""}
                className="w-full rounded border border-white/10 bg-black/30 py-2 px-3 text-sm text-white focus:border-white/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 font-mono mb-1">worldYear</label>
              <input
                name="worldYear"
                type="number"
                defaultValue={String(robot.worldYear ?? "")}
                className="w-full rounded border border-white/10 bg-black/30 py-2 px-3 text-sm text-white focus:border-white/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 font-mono mb-1">worldOwnerOrg</label>
              <input
                name="worldOwnerOrg"
                defaultValue={robot.worldOwnerOrg ?? ""}
                className="w-full rounded border border-white/10 bg-black/30 py-2 px-3 text-sm text-white focus:border-white/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 font-mono mb-1">worldLicenses</label>
              <input
                name="worldLicenses"
                defaultValue={robot.worldLicenses ?? ""}
                className="w-full rounded border border-white/10 bg-black/30 py-2 px-3 text-sm text-white focus:border-white/30 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono text-xs transition disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Metadata"}
            </button>
          </div>
        </form>

        {/* Evidence & artifacts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
              <Globe className="h-3 w-3" /> Evidence Provenance
            </h3>
            {robot.evidence?.length ? (
              <ul className="space-y-2">
                {robot.evidence.map((ev) => (
                  <li key={ev.id} className="border-b border-white/5 pb-2 last:border-0">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-mono text-white/30 mt-0.5">{ev.evidenceType}</span>
                      <div className="flex-1">
                        <a
                          href={ev.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-emerald-400 hover:underline break-all"
                        >
                          {ev.sourceUrl}
                        </a>
                        <div className="mt-1 text-[10px] text-white/40 font-mono">
                          {new Date(ev.observedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/40">No evidence records.</p>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
              <Package className="h-3 w-3" /> Artifacts
            </h3>
            {robot.artifacts?.length ? (
              <ul className="space-y-2">
                {robot.artifacts.map((a) => (
                  <li key={a.id} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0">
                    <div className="text-sm font-mono text-white/60 truncate max-w-[200px]">{a.path}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-white/30">{a.kind}</span>
                      <span className="text-[10px] font-mono text-white/30">{a.sha?.slice(0, 8) ?? "—"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/40">No artifacts recorded.</p>
            )}
          </section>
        </div>

        {/* Events timeline */}
        <section className="rounded-xl border border-white/10 bg-white/5 p-5 mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <RefreshCw className="h-3 w-3" /> Commit Events
          </h3>
          {robot.events?.length ? (
            <div className="space-y-3">
              {robot.events.map((ev) => (
                <div key={ev.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-white/20 mt-1" />
                  <div className="flex-1">
                    <div className="text-sm font-mono text-white">{ev.eventType}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-white/40 font-mono">
                        {ev.commitSha ? ev.commitSha.slice(0, 8) : "—"}
                      </span>
                      <span className="text-[10px] text-white/40 font-mono">
                        {new Date(ev.occurredAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40">No commit events recorded.</p>
          )}
        </section>
      </div>
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  ACTIVE: "border-emerald-500 text-emerald-400",
  DORMANT: "border-amber-500 text-amber-400",
  ARCHIVED: "border-slate-500 text-slate-400",
  TERMINATED: "border-red-500 text-red-400",
  PROPOSED: "border-blue-500 text-blue-400",
  INACTIVE: "border-slate-400 text-slate-400",
  EOL: "border-red-600 text-red-400",
};