import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ExternalLink, FileText, GitCommit, Layers, Globe, RefreshCw,
  ChevronRight
} from "lucide-react";
import { Breadcrumbs } from "@/components/navigation";
import { FullWidthNav, AppleDock, AmbientLivingBackground } from "@/landing/cinematic";

interface EvidenceRecord {
  id: string;
  projectId: string;
  evidenceType: string;
  sourceUrl: string;
  sourceRef?: string | null;
  metadata?: Record<string, unknown>;
  observedAt: string;
}

interface ArtifactItem {
  id: string;
  projectId: string;
  path: string;
  sha: string;
  kind: string;
  size?: number | null;
  updatedAt?: string;
}

interface EventRecord {
  id: string;
  eventType: string;
  commitSha?: string | null;
  changedPaths?: string[];
  payload?: Record<string, unknown>;
  occurredAt: string;
}

interface WorldProject {
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
  verificationLastSeen?: string | null;
  evidence?: EvidenceRecord[];
  artifacts?: ArtifactItem[];
  events?: EventRecord[];
  interpretations?: any[];
  marketingProducts?: any[];
  marketingEvents?: any[];
}

const VERDICT_LABELS: Record<string, string> = {
  VERIFIED: "Verified",
  NOT_VERIFIED: "Not Verified",
  PENDING_REVIEW: "Pending Review",
  REJECTED: "Rejected",
  SUPERSEDED: "Superseded",
};

const VERDICT_COLORS: Record<string, string> = {
  VERIFIED: "text-emerald-400 bg-emerald-500/10",
  NOT_VERIFIED: "text-amber-400 bg-amber-500/10",
  PENDING_REVIEW: "text-blue-400 bg-blue-500/10",
  REJECTED: "text-red-400 bg-red-500/10",
  SUPERSEDED: "text-gray-400 bg-gray-500/10",
};

export default function WorldDetail() {
  const { worldId } = useParams<{ worldId: string }>();
  const [project, setProject] = useState<WorldProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useState(() => {
    fetch(`/api/world-model/${worldId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.project) {
          setProject(json.project);
        } else {
          setError(json.error || "Failed to load world");
        }
      })
      .catch(() => setError("Network error connecting to backend"))
      .finally(() => setLoading(false));
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white/70 font-mono text-sm flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading world registry…</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-white/60">
        <Globe className="h-12 w-12 mb-4 opacity-30" />
        <h2 className="text-xl font-bold mb-2">World not found</h2>
        <p className="text-sm">{error || "Unknown world ID"}</p>
        <Link
          to="/world"
          className="mt-6 text-sm text-white/60 hover:text-white transition-colors"
        >
          ← Back to spatial galaxy
        </Link>
      </div>
    );
  }

  const facets = [
    { label: "Category", value: project.worldCategory ?? "—" },
    { label: "Modality", value: project.worldModality ?? "—" },
    { label: "Status", value: project.worldStatus ?? "—" },
    { label: "Lifecycle", value: project.worldLifecycle ?? "—" },
    { label: "Year", value: project.worldYear ? project.worldYear.toString() : "—" },
    { label: "Role", value: project.worldRole ?? "—" },
    { label: "Owner Org", value: project.worldOwnerOrg ?? "—" },
    { label: "Licenses", value: project.worldLicenses ?? "—" },
  ] as const;

  return (
    <div className="min-h-screen bg-black text-white">
      <FullWidthNav />

      {/* Ambient background */}
      <AmbientLivingBackground />

      <div className="relative max-w-7xl mx-auto px-5 py-8 md:py-12">
        <Breadcrumbs
          items={[
            { label: "World", to: "/world" },
            { label: project.name, to: `/world/${project.id}` },
          ]}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold">{project.name}</h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono ${VERDICT_COLORS[project.verificationVerdict] || VERDICT_COLORS.NOT_VERIFIED}`}>
                {VERDICT_LABELS[project.verificationVerdict] ?? project.verificationVerdict}
              </span>
            </div>
            <p className="text-white/50 font-mono text-xs mt-1">
              {project.repository} · {project.url}
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View on GitHub
            </a>
          </div>
        </div>

        {project.description && (
          <p className="text-white/70 text-base md:text-lg mb-8 leading-relaxed">
            {project.description}
          </p>
        )}

        {/* Faceted metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {facets.map((f) => (
            <div
              key={f.label}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <span className="text-[10px] uppercase tracking-wider text-white/50">{f.label}</span>
              <div className="mt-1 font-mono text-sm text-white">{f.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Evidence provenance ledger */}
          <div className="space-y-6">
            <section>
              <h2 className="flex items-center gap-2 text-lg font-bold mb-4">
                <FileText className="h-5 w-5 text-white/60" />
                Evidence Provenance
              </h2>
              {project.evidence?.length ? (
                <div className="space-y-3">
                  {project.evidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/2 p-3 hover:bg-white/4 transition-colors"
                    >
                      <div className="mt-0.5 p-1.5 rounded-full bg-white/5">
                        <FileText className="h-3 w-3 text-white/50" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-white/50">{ev.evidenceType}</span>
                          {ev.sourceRef && (
                            <span className="font-mono text-[10px] text-white/50">@{ev.sourceRef}</span>
                          )}
                        </div>
                        <a
                          href={ev.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-white/50 hover:text-white/60 transition-colors truncate"
                        >
                          {ev.sourceUrl}
                        </a>
                        <span className="font-mono text-[10px] text-white/50">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {new Date(ev.observedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/50">No evidence records yet.</p>
              )}
            </section>

            <section>
              <h2 className="flex items-center gap-2 text-lg font-bold mb-4">
                <GitCommit className="h-5 w-5 text-white/60" />
                Commit History
              </h2>
              <div className="space-y-2">
                {project.events?.slice(0, 20).map((ev, idx) => (
                  <div
                    key={ev.id || idx}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/2 px-4 py-2 hover:bg-white/4 transition-colors"
                  >
                    <span className="font-mono text-[10px] text-white/50 w-10">
                      {ev.commitSha?.slice(0, 8) ?? "—"}
                    </span>
                    <span className="flex-1 text-sm text-white/60">{ev.eventType}</span>
                    <span className="font-mono text-[10px] text-white/50">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {new Date(ev.occurredAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {(!project.events || project.events.length === 0) && (
                  <p className="text-sm text-white/50">No commit events recorded.</p>
                )}
              </div>
            </section>
          </div>

          {/* Right: Comparison + metadata */}
          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-bold mb-4">Connected Technologies</h2>
              {project.artifacts?.some((a) => a.kind === "technology") ? (
                <div className="flex flex-wrap gap-2">
                  {project.artifacts
                    .filter((a) => a.kind === "technology")
                    .map((t) => (
                      <span
                        key={t.id}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono text-white/70"
                      >
                        {t.path}
                      </span>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-white/50">No connected technologies.</p>
              )}
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">Comparison View</h2>
              <Link
                to="/world/compare"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Layers className="h-4 w-4" />
                Explore Cross-Project Comparison
                <ChevronRight className="h-4 w-4" />
              </Link>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">Interpretation</h2>
              {project.interpretations?.length ? (
                <div className="space-y-3">
                  {project.interpretations.map((interp) => (
                    <div
                      key={interp.id}
                      className="rounded-xl border border-white/5 bg-white/2 p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-[10px] text-white/50">
                          {interp.provider} / {interp.model}
                        </span>
                        {interp.confidence && (
                          <span className="font-mono text-[10px] text-white/50">
                            ({interp.confidence.toFixed(2)})
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/70 leading-relaxed">{interp.answer}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/50">No AI interpretations yet.</p>
              )}
            </section>
          </div>
        </div>
      </div>

      <AppleDock />
    </div>
  );
}
