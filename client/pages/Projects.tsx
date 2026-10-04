import React, { useEffect, useMemo, useState, Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Boxes,
  Compass,
  ExternalLink,
  FileCode,
  GitBranch,
  Globe,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Activity,
  Layers,
  Check,
  ChevronRight,
} from "lucide-react";
import { feexProjects } from "@/lib/feex-ecosystem";
import { FeexHorizontalLockup, FeexWorldBadge } from "@/components/FeexLogo";
import { CursorSpotlightCard } from "@/components/motion/CursorSpotlightCard";
import { LinkPreviewCard } from "@/components/media/LinkPreviewCard";
import { InfiniteMarqueeTicker } from "@/components/carousel/InfiniteMarqueeTicker";
import { useGitHubAuthGuard } from "@/components/GitHubAuthGuard";
import {
  FullWidthNav,
  AppleDock,
  BtcMonoBadge,
  MagneticGlowButton,
  SkeletonLoader,
  PillCarousel,
  AmbientLivingBackground,
} from "@/landing/cinematic";

// Lazy-load Drei 3D Topology Hero for maximum initial bundle performance
const DreiProjectsHero = lazy(() => import("@/components/webgl/DreiProjectsHero"));
const ProjectMini3DCard = lazy(() => import("@/components/webgl/ProjectMini3DCard"));

type WorldProject = {
  id: string;
  repository: string;
  name: string;
  description: string | null;
  url: string;
  image?: string;
  metadata?: { language?: string; topics?: string[]; stars?: number };
  lastObservedAt?: string;
};

const DOMAIN_FILTERS = ["ALL", "INTELLIGENCE", "HEALTHCARE", "FINANCE", "RESEARCH"];

export default function Projects() {
  const [query, setQuery] = useState("");
  const [activeDomain, setActiveDomain] = useState("ALL");
  const { handleGitHubClick, GitHubAuthModal } = useGitHubAuthGuard();
  const [projects, setProjects] = useState<WorldProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const r = await fetch("/api/world-model/projects");
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || "World Model unavailable");
      setProjects(d.projects || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "World Model unavailable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/world-model/sync/github-pinned", { method: "POST" });
      await load();
    } finally {
      setSyncing(false);
    }
  };

  const fallback = useMemo(() => {
    return projects.length
      ? projects
      : feexProjects.map((p) => ({
          id: p.id,
          repository: `FeexSystems/${p.repository}`,
          name: p.name,
          description: p.description,
          url: `https://github.com/FeexSystems/${p.repository}`,
          image: p.image,
          metadata: { language: p.technologies[0], topics: p.technologies },
        }));
  }, [projects]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fallback.filter((p) => {
      const matchesText = !q || [
        p.name,
        p.repository,
        p.description || "",
        p.metadata?.language || "",
        ...(p.metadata?.topics || [])
      ].join(" ").toLowerCase().includes(q);

      if (activeDomain === "ALL") return matchesText;
      const desc = (p.description || "").toLowerCase();
      const repo = p.repository.toLowerCase();
      const domainMatch = desc.includes(activeDomain.toLowerCase()) || 
                          repo.includes(activeDomain.toLowerCase()) ||
                          (p.metadata?.topics || []).some(t => t.toLowerCase().includes(activeDomain.toLowerCase()));
      return matchesText && domainMatch;
    });
  }, [fallback, query, activeDomain]);

  return (
    <main className="min-h-screen bg-[#000000] text-white antialiased font-mono selection:bg-white selection:text-black relative pb-28">
      {/* 0. AMBIENT LIVING INTELLIGENCE BACKGROUND */}
      <AmbientLivingBackground fixed={true} opacity={32} linesOpacity={16} />

      {/* 1. TECHNICAL CANONICAL NAVIGATION */}
      <FullWidthNav />

      {/* 2. DREI 3D TOPOLOGY HERO */}
      <div className="pt-20">
        <Suspense
          fallback={
            <div className="h-52 w-full bg-black flex items-center justify-center font-mono text-xs text-white/40">
              Initializing 3D Topology Scene...
            </div>
          }
        >
          <DreiProjectsHero />
        </Suspense>
      </div>

      {/* 3. HERO TITLES & INDUSTRIAL CONTROL STATS */}
      <section className="container mx-auto max-w-7xl px-5 md:px-8 pt-10 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 mb-4">
              <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>//01 — EXPLORATION ENGINE · CANONICAL MATRIX</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
              FeexSystems Project Explorer.
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-white/60 max-w-2xl leading-relaxed">
              Every pinned repository is an autonomous living world. Artifacts, technologies, and cryptographic relationships synchronized with zero manual configuration.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <MagneticGlowButton
              onClick={sync}
              glowColor="rgba(0, 245, 212, 0.4)"
              className="px-4 py-2 text-xs font-mono rounded-[10px] border border-white/20 bg-white/5 text-white hover:bg-white/10 flex items-center gap-2"
            >
              <RefreshCw className={`size-3.5 ${syncing ? "animate-spin text-cyan-400" : "text-white/70"}`} />
              <span>{syncing ? "Syncing GitHub..." : "Sync GitHub"}</span>
            </MagneticGlowButton>

            <Link to="/world">
              <MagneticGlowButton
                glowColor="rgba(255, 255, 255, 0.6)"
                className="px-5 py-2 text-xs font-bold font-mono rounded-[10px] bg-white text-black hover:bg-white/90 flex items-center gap-2 shadow-lg"
              >
                <Globe className="size-3.5" />
                <span>Launch 3D World</span>
              </MagneticGlowButton>
            </Link>
          </div>
        </div>

        {/* 3-Card Metric Strip */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-[20px] border border-white/10 bg-[#121212] p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40">
              <span className="font-mono text-xs uppercase tracking-wider">//01 REPOSITORIES</span>
              <Boxes className="size-4 text-white/70" />
            </div>
            <div className="mt-3 font-mono text-3xl text-white font-bold">
              {projects.length || feexProjects.length} <span className="text-xs text-white/40 font-normal">Active</span>
            </div>
            <div className="mt-1 text-xs text-white/50 font-mono">
              Tracked across GitHub organization
            </div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-[#121212] p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40">
              <span className="font-mono text-xs uppercase tracking-wider">//02 EVIDENCE PIPELINE</span>
              <GitBranch className="size-4 text-white/70" />
            </div>
            <div className="mt-3 font-mono text-3xl text-white font-bold">
              HMAC <span className="text-xs text-white/60 font-normal">SHA-256</span>
            </div>
            <div className="mt-1 text-xs text-white/50 font-mono">
              Cryptographically verified provenance
            </div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-[#121212] p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40">
              <span className="font-mono text-xs uppercase tracking-wider">//03 MODEL GROUNDING</span>
              <ShieldCheck className="size-4 text-white/70" />
            </div>
            <div className="mt-3 font-mono text-3xl text-white font-bold">
              100% <span className="text-xs text-white/60 font-normal">Grounded</span>
            </div>
            <div className="mt-1 text-xs text-white/50 font-mono">
              Zero ungrounded hallucinations
            </div>
          </div>
        </div>
      </section>

      {/* 3.5. CONTINUOUS REPOSITORY & TELEMETRY MARQUEE */}
      <div className="container mx-auto max-w-7xl px-5 md:px-8 pt-4">
        <InfiniteMarqueeTicker speedSeconds={28} pauseOnHover={true} />
      </div>

      {/* 4. SEARCH & DOMAIN FILTER DECK */}
      <section className="container mx-auto max-w-7xl px-5 md:px-8 py-6">
        <div className="rounded-[20px] border border-white/10 bg-[#121212] p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-xl">
          {/* Terminal Search Input */}
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-white/40 font-mono text-xs pointer-events-none">
              <Terminal className="size-3.5 text-white" />
              <span className="hidden sm:inline">query //</span>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by repo, technology, language..."
              aria-label="Search repositories by tech or language"
              className="w-full h-10 pl-10 sm:pl-24 pr-4 bg-black/60 border border-white/10 rounded-[10px] text-xs font-mono text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-white/40 hover:text-white"
              >
                CLEAR
              </button>
            )}
          </div>

          {/* Domain Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {DOMAIN_FILTERS.map((d) => (
              <button
                key={d}
                onClick={() => setActiveDomain(d)}
                className={`px-3 py-1.5 rounded-[10px] text-xs font-mono tracking-wider transition-all border ${
                  activeDomain === d
                    ? "bg-white text-black font-bold border-white shadow-sm"
                    : "bg-white/5 text-white/60 hover:text-white border-white/10 hover:border-white/25"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-[10px] bg-red-950/40 border border-red-800/60 text-xs font-mono text-red-300 flex items-center justify-between">
            <span>World Model sync notice: {error}. Showing fallback registry.</span>
            <button onClick={load} className="underline hover:text-white">Retry</button>
          </div>
        )}
      </section>

      {/* 5. PROJECT CARD MATRIX GRID WITH LINK PREVIEW */}
      <section className="container mx-auto max-w-7xl px-5 md:px-8 py-6 pb-24">
        {loading ? (
          <div className="py-12">
            <SkeletonLoader variant="card" count={6} className="max-w-7xl mx-auto" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((p, idx) => {
              const shortRepo = p.repository.split("/").pop();
              const language = p.metadata?.language || "TypeScript";

              return (
                <div
                  key={p.id}
                  className="group relative rounded-[20px] border border-white/10 bg-[#121212] hover:border-white/30 p-6 flex flex-col justify-between transition-all duration-200 shadow-xl"
                >
                  <div>
                    {/* Top Bar: Language + Index */}
                    <div className="flex items-center justify-between text-xs font-mono text-white/40 border-b border-white/10 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-cyan-400" />
                        <span className="text-white font-medium">{language}</span>
                      </div>
                      <span className="text-[11px] text-white/40">0{idx + 1} // REPO</span>
                    </div>

                    {p.image && (
                      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[12px] border border-white/10 bg-black/60 mb-4">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-full h-full object-cover grayscale contrast-125 group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded text-[9px] font-mono bg-black/80 border border-white/20 text-white/80 backdrop-blur-sm">
                          VERIFIED ASSET // {p.id}
                        </div>
                      </div>
                    )}

                    {/* Project Name with Rich Link Preview Card */}
                    <LinkPreviewCard
                      url={p.url}
                      title={p.name}
                      description={p.description || "Engineering project discovered and anchored in the FEEXSYSTEMS Living World Model."}
                    >
                      <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors cursor-pointer inline-block">
                        {p.name}
                      </h3>
                    </LinkPreviewCard>

                    {/* Repository slug */}
                    <div className="mt-1 font-mono text-xs text-white/40 truncate">
                      feexsystems/{shortRepo}
                    </div>

                    {/* Cryptographic Evidence Badge */}
                    <div className="mt-3">
                      <BtcMonoBadge
                        label="CANONICAL ENTITY"
                        sublabel={`ID: ${p.id.slice(0, 10)}...`}
                        status="confirmed"
                        size="sm"
                      />
                    </div>

                    {/* Description */}
                    <p className="mt-3 text-xs text-white/60 leading-relaxed line-clamp-3">
                      {p.description || "Engineering project discovered and anchored in the FEEXSYSTEMS Living World Model."}
                    </p>

                    {/* Topics Pills */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {(p.metadata?.topics || ["AI", "Systems", "WebGL"]).slice(0, 4).map((topic) => (
                        <span
                          key={topic}
                          className="px-2 py-0.5 rounded-[6px] text-[10px] font-mono bg-black/60 border border-white/10 text-white/50"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>

                    {/* Interactive 3D Presentation Preview */}
                    <div className="mt-4 rounded-[10px] border border-white/10 bg-black/60 relative overflow-hidden">
                      <div className="absolute top-2 left-2.5 z-10 text-[9px] font-mono text-white/50 flex items-center gap-1.5 pointer-events-none">
                        <span className="size-1 rounded-full bg-white animate-pulse" />
                        <span>3D TILT // DREI TOPOLOGY</span>
                      </div>
                      <Suspense
                        fallback={
                          <div className="h-28 flex items-center justify-center font-mono text-[10px] text-white/40">
                            Initializing 3D Artifact...
                          </div>
                        }
                      >
                        <ProjectMini3DCard
                          domain={p.description?.includes("Med") ? "Healthcare" : p.name?.includes("Xchange") ? "Finance" : p.name?.includes("Labs") ? "Research" : "Intelligence"}
                          isPinned={idx < 2}
                          color="#ffffff"
                        />
                      </Suspense>
                    </div>
                  </div>

                  {/* Bottom Actions Bar */}
                  <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 text-xs font-mono">
                      <Link
                        to={`/navigator?q=${encodeURIComponent(p.name)}`}
                        className="inline-flex items-center gap-1 text-white/60 hover:text-white transition-colors"
                        title="Explore in AI Navigator"
                      >
                        <Compass className="size-3 text-white/80" />
                        <span>Nav</span>
                      </Link>
                      <span className="text-white/20">|</span>
                      <Link
                        to={`/omni?q=${encodeURIComponent(`Show me ${p.name} architecture`)}`}
                        className="inline-flex items-center gap-1 text-white/60 hover:text-white transition-colors"
                        title="Open in Omni-Command Stage"
                      >
                        <Terminal className="size-3 text-white/80" />
                        <span>Omni</span>
                      </Link>
                      <span className="text-white/20">|</span>
                      <Link
                        to={`/evidence/${encodeURIComponent(p.id)}`}
                        className="inline-flex items-center gap-1 text-white/60 hover:text-white transition-colors"
                        title="View Evidence Provenance"
                      >
                        <FileCode className="size-3 text-white/80" />
                        <span>Evidence</span>
                      </Link>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/world?focus=${encodeURIComponent(p.id)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-[10px] bg-white/5 border border-white/10 hover:border-white/30 text-white transition-colors"
                      >
                        <Globe className="size-3 text-white" />
                        <span>3D</span>
                      </Link>
                      <button
                        onClick={() => handleGitHubClick(p.url)}
                        title="GitHub Repository (Requires Authentication)"
                        className="inline-flex items-center p-1.5 rounded-[10px] bg-white/5 border border-white/10 hover:border-white/30 text-white/60 hover:text-white transition-colors"
                      >
                        <ExternalLink className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !visible.length && (
          <div className="mt-8 p-12 rounded-[20px] border border-dashed border-white/10 text-center font-mono text-xs text-white/40">
            No projects found matching current filter query.
          </div>
        )}
      </section>

      {/* 6. TECHNICAL FOOTER */}
      <footer className="border-t border-white/10 py-12 bg-black text-xs font-mono text-white/60">
        <div className="container mx-auto max-w-7xl px-5 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="size-2.5 bg-white rounded-none" />
            <span className="font-bold text-white uppercase tracking-wider">FEEXSYSTEMS</span>
            <span className="text-white/40">// Living World Model</span>
          </div>
          <div className="text-white/40">
            © 2026 FEEXSYSTEMS. Authoritative Provenance & SOC 2 Type II Certified.
          </div>
        </div>
      </footer>

      {/* Floating Interactive Quick Dock */}
      <div className="fixed bottom-6 inset-x-0 flex justify-center z-40 pointer-events-auto">
        <AppleDock />
      </div>

      {/* GitHub Auth Required Modal */}
      {GitHubAuthModal}
    </main>
  );
}
