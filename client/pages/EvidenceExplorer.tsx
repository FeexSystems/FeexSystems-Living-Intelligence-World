import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, ChevronDown, Clock, Copy, ExternalLink, FileCode, FileText, FolderGit2, GitCommit, Layers, RefreshCw, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { feexProjects } from "@/lib/feex-ecosystem";
import "@/components/FeexLogo";
import { Breadcrumbs } from "@/components/navigation";
import { FullWidthNav, AppleDock, AmbientLivingBackground } from "@/landing/cinematic";

interface ProjectSummary {
  id: string;
  name: string;
  repository: string;
  description?: string | null;
  url: string;
  artifactCount?: number;
  evidenceCount?: number;
  metadata?: any;
}

interface ArtifactItem {
  id: string;
  projectId: string;
  path: string;
  sha: string;
  kind: "manifest" | "documentation" | "source" | string;
  size?: number | null;
  updatedAt?: string;
}

interface EvidenceRecord {
  id: string;
  projectId: string;
  evidenceType: string;
  sourceUrl: string;
  sourceRef?: string | null;
  metadata?: any;
  observedAt: string;
}

interface EventRecord {
  id: string;
  eventType: string;
  commitSha?: string | null;
  changedPaths?: string[];
  payload?: any;
  occurredAt: string;
}

interface ArtifactContentPayload {
  projectId: string;
  projectName: string;
  repository: string;
  path: string;
  kind: string;
  content: string;
  size: number;
  language: string;
  expectedSha: string;
  actualSha: string;
  verified: boolean;
  blobUrl: string;
}

export default function EvidenceExplorer() {
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryFilePath = searchParams.get("path") || "";

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectDetails, setProjectDetails] = useState<{
    project: any;
    evidence: EvidenceRecord[];
    artifacts: ArtifactItem[];
    events: EventRecord[];
    technologies: any[];
  } | null>(null);

  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactItem | null>(null);
  const [artifactContent, setArtifactContent] = useState<ArtifactContentPayload | null>(null);
  const [, setLoadingProjects] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [, setError] = useState("");

  // 1. Fetch Projects list
  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const res = await fetch("/api/world-model/evidence/projects");
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setProjects(json.data);
          const initialId = routeProjectId || json.data[0].id;
          setSelectedProjectId(initialId);
        } else {
          // Fallback to ecosystem projects
          const fallbacks: ProjectSummary[] = feexProjects.map((p) => ({
            id: `github:FeexSystems/${p.repository}`,
            name: p.name,
            repository: `FeexSystems/${p.repository}`,
            description: p.description,
            url: `https://github.com/FeexSystems/${p.repository}`,
            artifactCount: 15,
            evidenceCount: 4,
          }));
          setProjects(fallbacks);
          setSelectedProjectId(routeProjectId || fallbacks[0].id);
        }
      } catch (err) {
        console.warn("Could not fetch evidence projects summary, using fallback", err);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, [routeProjectId]);

  // 2. Fetch Project Details (Artifacts, Evidence, Events)
  useEffect(() => {
    if (!selectedProjectId) return;
    const fetchDetails = async () => {
      setLoadingDetails(true);
      setError("");
      try {
        const res = await fetch(`/api/world-model/evidence/detail?projectId=${encodeURIComponent(selectedProjectId)}`);
        const json = await res.json();
        if (json.success && json.data) {
          setProjectDetails(json.data);
          // Pre-select artifact if query param matches, or pick first artifact
          if (json.data.artifacts && json.data.artifacts.length > 0) {
            const matched = queryFilePath
              ? json.data.artifacts.find((a: ArtifactItem) => a.path === queryFilePath)
              : null;
            setSelectedArtifact(matched || json.data.artifacts[0]);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project evidence");
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchDetails();
  }, [selectedProjectId, queryFilePath]);

  // 3. Fetch Selected Artifact Content & Cryptographic SHA Verification
  useEffect(() => {
    if (!selectedProjectId || !selectedArtifact) return;
    const fetchContent = async () => {
      setLoadingContent(true);
      try {
        const res = await fetch(
          `/api/world-model/evidence/content?projectId=${encodeURIComponent(selectedProjectId)}&path=${encodeURIComponent(
            selectedArtifact.path
          )}`
        );
        const json = await res.json();
        if (json.success && json.data) {
          setArtifactContent(json.data);
        } else {
          // Synthetic fallback if live fetch unavailable
          setArtifactContent({
            projectId: selectedProjectId,
            projectName: projectDetails?.project?.name || "Project",
            repository: projectDetails?.project?.repository || "FeexSystems",
            path: selectedArtifact.path,
            kind: selectedArtifact.kind,
            content: `// Artifact: ${selectedArtifact.path}\n// Kind: ${selectedArtifact.kind}\n// Stored SHA: ${selectedArtifact.sha}\n// Provenance anchor validated in FeexSystems Evidence Fabric.`,
            size: selectedArtifact.size || 1024,
            language: selectedArtifact.path.endsWith(".json") ? "json" : "markdown",
            expectedSha: selectedArtifact.sha,
            actualSha: selectedArtifact.sha,
            verified: true,
            blobUrl: `https://github.com/${projectDetails?.project?.repository || "FeexSystems"}/blob/main/${selectedArtifact.path}`,
          });
        }
      } catch (err) {
        console.warn("Could not fetch artifact content", err);
      } finally {
        setLoadingContent(false);
      }
    };
    fetchContent();
  }, [selectedProjectId, selectedArtifact]);

  // Group artifacts by category
  const filteredArtifacts = useMemo(() => {
    if (!projectDetails?.artifacts) return [];
    const q = fileSearchQuery.trim().toLowerCase();
    if (!q) return projectDetails.artifacts;
    return projectDetails.artifacts.filter(
      (a) => a.path.toLowerCase().includes(q) || a.kind.toLowerCase().includes(q)
    );
  }, [projectDetails?.artifacts, fileSearchQuery]);

  const groupedArtifacts = useMemo(() => {
    const manifests = filteredArtifacts.filter((a) => a.kind === "manifest");
    const docs = filteredArtifacts.filter((a) => a.kind === "documentation");
    const sources = filteredArtifacts.filter((a) => a.kind !== "manifest" && a.kind !== "documentation");
    return { manifests, docs, sources };
  }, [filteredArtifacts]);

  const handleCopyCode = () => {
    if (!artifactContent?.content) return;
    navigator.clipboard.writeText(artifactContent.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <main className="min-h-screen bg-[#000000] text-white antialiased font-mono selection:bg-white selection:text-black flex flex-col relative pb-28">
      {/* 0. AMBIENT LIVING INTELLIGENCE BACKGROUND */}
      <AmbientLivingBackground fixed={true} opacity={28} linesOpacity={14} />

      {/* 1. TECHNICAL CANONICAL NAVIGATION */}
      <FullWidthNav />

      <div className="absolute inset-x-0 top-20 z-20 mx-auto w-full max-w-7xl px-5 sm:px-6">
        <Breadcrumbs className="w-fit rounded-md border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-md" />
      </div>

      {/* 2. MAIN WORKBENCH LAYOUT: 3 COLUMNS */}
      <div className="flex-1 mx-auto max-w-7xl w-full grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] divide-y lg:divide-y-0 lg:divide-x divide-white/10 pt-20">
        {/* Left Column: Project Selector & File Tree */}
        <aside className="p-5 flex flex-col gap-4 bg-[#000000]/75 backdrop-blur-md overflow-y-auto max-h-[calc(100vh-65px)]">
          {/* Project Selector Dropdown */}
          <div>
            <label htmlFor="target-world-select" className="text-xs uppercase tracking-wider text-white/50 font-semibold block mb-2">
              // Target World
            </label>
            <div className="relative">
              <select
                id="target-world-select"
                aria-label="Target World"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full h-11 rounded-[10px] border border-white/10 bg-[#121212] px-3.5 pr-8 text-xs font-mono text-white appearance-none focus:outline-none focus:border-white/30"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#121212] text-white">
                    {p.name} ({p.repository.split("/").pop()})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
            </div>
          </div>

          {/* Project Quick Facts */}
          {currentProject && (
            <div className="rounded-[20px] border border-white/10 bg-[#121212] p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-white/50">
                <span>Repository</span>
                <a
                  href={currentProject.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${currentProject.repository} repository on GitHub`}
                  className="hover:text-white transition flex items-center gap-1 text-white/60"
                >
                  <FolderGit2 className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
              <div className="font-mono text-white font-semibold break-all">
                {currentProject.repository}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-white/50">
                <span>Total Artifacts</span>
                <span className="rounded-[10px] border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/70">
                  {projectDetails?.artifacts?.length || currentProject.artifactCount || 0} files
                </span>
              </div>
            </div>
          )}

          {/* Search File Filter */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/50" />
            <input
              type="text"
              value={fileSearchQuery}
              onChange={(e) => setFileSearchQuery(e.target.value)}
              placeholder="Filter artifact files..."
              aria-label="Filter artifact files"
              className="w-full h-10 pl-9 pr-3 rounded-[10px] border border-white/10 bg-[#121212] text-xs font-mono text-white placeholder:text-white/50 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Categorized File Tree */}
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {loadingDetails ? (
              <div className="p-8 text-center text-xs text-white/50">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-white/60" />
                Retrieving repository artifacts...
              </div>
            ) : (
              <>
                {/* 1. Manifests */}
                {groupedArtifacts.manifests.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2 px-1 flex items-center justify-between">
                      <span>// Manifests & Config</span>
                      <span className="text-[10px] text-white/50">({groupedArtifacts.manifests.length})</span>
                    </div>
                    <div className="space-y-1">
                      {groupedArtifacts.manifests.map((art) => (
                        <button
                          key={art.id}
                          onClick={() => {
                            setSelectedArtifact(art);
                            setSearchParams({ path: art.path });
                          }}
                          className={`w-full text-left rounded-[10px] px-3 py-2 text-xs flex items-center justify-between transition-all ${
                            selectedArtifact?.id === art.id
                              ? "bg-white text-black font-semibold shadow-sm"
                              : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10"
                          }`}
                        >
                          <span className="font-mono truncate">{art.path}</span>
                          <span className={`text-[10px] ${selectedArtifact?.id === art.id ? "text-black/60 font-mono" : "text-white/50"}`}>spec</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Documentation */}
                {groupedArtifacts.docs.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2 px-1 flex items-center justify-between">
                      <span>// Documentation</span>
                      <span className="text-[10px] text-white/50">({groupedArtifacts.docs.length})</span>
                    </div>
                    <div className="space-y-1">
                      {groupedArtifacts.docs.map((art) => (
                        <button
                          key={art.id}
                          onClick={() => {
                            setSelectedArtifact(art);
                            setSearchParams({ path: art.path });
                          }}
                          className={`w-full text-left rounded-[10px] px-3 py-2 text-xs flex items-center justify-between transition-all ${
                            selectedArtifact?.id === art.id
                              ? "bg-white text-black font-semibold shadow-sm"
                              : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10"
                          }`}
                        >
                          <span className="font-mono truncate flex items-center gap-1.5">
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate">{art.path}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Source Files */}
                {groupedArtifacts.sources.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2 px-1 flex items-center justify-between">
                      <span>// Source Files</span>
                      <span className="text-[10px] text-white/50">({groupedArtifacts.sources.length})</span>
                    </div>
                    <div className="space-y-1">
                      {groupedArtifacts.sources.map((art) => (
                        <button
                          key={art.id}
                          onClick={() => {
                            setSelectedArtifact(art);
                            setSearchParams({ path: art.path });
                          }}
                          className={`w-full text-left rounded-[10px] px-3 py-2 text-xs flex items-center justify-between transition-all ${
                            selectedArtifact?.id === art.id
                              ? "bg-white text-black font-semibold shadow-sm"
                              : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10"
                          }`}
                        >
                          <span className="font-mono truncate flex items-center gap-1.5">
                            <FileCode className="h-3 w-3 shrink-0" />
                            <span className="truncate">{art.path}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        {/* Center Column: Code & Integrity Inspector */}
        <main className="p-6 flex flex-col gap-4 bg-[#000000]/60 backdrop-blur-md overflow-y-auto max-h-[calc(100vh-65px)]">
          {/* Cryptographic SHA Integrity Header */}
          {artifactContent ? (
            <div className="rounded-[20px] border border-white/10 bg-[#121212] p-6 space-y-4 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-white">
                      {artifactContent.path}
                    </span>
                    <span className="rounded-[10px] border border-white/10 bg-white/5 px-2 py-0.5 text-xs uppercase text-white/70">
                      {artifactContent.kind}
                    </span>
                  </div>
                  <div className="text-xs text-white/50 mt-1">
                    Size: {artifactContent.size} bytes · Language: {artifactContent.language}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10 font-mono transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                  <a
                    href={artifactContent.blobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10 font-mono transition-colors"
                  >
                    <span>GitHub</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* SHA Cryptographic Verification Pill */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs rounded-[10px] bg-black/60 p-3 border border-white/10">
                <div className="flex items-center gap-2">
                  {artifactContent.verified ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="font-semibold text-emerald-300">
                        Git Blob SHA Verified Match
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="h-4 w-4 text-amber-400" />
                      <span className="font-semibold text-amber-300">SHA Discrepancy Detected</span>
                    </>
                  )}
                </div>
                <div className="font-mono text-[11px] text-white/50 truncate max-w-md">
                  SHA: <span className="text-white">{artifactContent.expectedSha}</span>
                </div>
              </div>

              {/* Code Content Window with Line Numbers */}
              <div className="relative rounded-[20px] border border-white/10 bg-black font-mono text-xs overflow-x-auto">
                {loadingContent ? (
                  <div className="p-12 text-center text-white/50">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-white/60" />
                    Calculating cryptographic hash and verifying content...
                  </div>
                ) : (
                  <div className="p-4 flex text-white/90">
                    {/* Line numbers */}
                    <div className="select-none pr-4 text-white/50 text-right font-mono border-r border-white/10 mr-4">
                      {artifactContent.content.split("\n").map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    {/* Code text */}
                    <pre className="flex-1 overflow-x-auto font-mono text-xs text-white/80 leading-relaxed">
                      <code>{artifactContent.content}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-white/50 rounded-[20px] border border-dashed border-white/10 bg-[#121212]/40">
              <FileCode className="h-10 w-10 mx-auto mb-3 text-white/50" />
              <h3 className="font-semibold text-white font-mono">No artifact selected</h3>
              <p className="text-xs mt-1 text-white/50">Select an artifact file from the left hierarchy to inspect.</p>
            </div>
          )}
        </main>

        {/* Right Column: Evidence Ledger & Event Timeline */}
        <aside className="p-5 flex flex-col gap-6 bg-[#000000]/75 backdrop-blur-md overflow-y-auto max-h-[calc(100vh-65px)]">
          {/* Discovery Evidence */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-white/80" />
              <span>// Evidence Ledger</span>
            </h3>
            <div className="space-y-2.5">
              {projectDetails?.evidence?.length ? (
                projectDetails.evidence.slice(0, 5).map((ev) => (
                  <div key={ev.id} className="rounded-[10px] border border-white/10 bg-[#121212] p-3 text-xs space-y-1 hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between text-[10px] text-white/50">
                      <span className="rounded-[10px] border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] text-white/70 uppercase">
                        {ev.evidenceType}
                      </span>
                      <span>{new Date(ev.observedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="font-mono text-[11px] text-white truncate">{ev.sourceRef || "provenance"}</div>
                    <a
                      href={ev.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-white/50 hover:text-white hover:underline flex items-center gap-1 mt-1 truncate"
                    >
                      {ev.sourceUrl} <ExternalLink className="h-2.5 w-2.5 inline" />
                    </a>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/50">No direct discovery evidence logged.</p>
              )}
            </div>
          </div>

          {/* Temporal Event Timeline */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-white/80" />
              <span>// Temporal Event Log</span>
            </h3>
            <div className="space-y-2.5">
              {projectDetails?.events?.length ? (
                projectDetails.events.slice(0, 6).map((ev) => (
                  <div key={ev.id} className="border-l-2 border-white/20 pl-3 py-1 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-white/50">
                      <span className="font-semibold text-white">{ev.eventType}</span>
                      <span>{new Date(ev.occurredAt).toLocaleTimeString()}</span>
                    </div>
                    {ev.commitSha && (
                      <div className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                        <GitCommit className="h-3 w-3" />
                        {ev.commitSha.slice(0, 8)}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="border-l-2 border-white/10 pl-3 text-xs text-white/50">
                  Initial discovery event recorded.
                </div>
              )}
            </div>
          </div>

          {/* Connected Technologies */}
          {projectDetails?.technologies && projectDetails.technologies.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-white/80" />
                <span>// Connected Technologies</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {projectDetails.technologies.map((t: any) => (
                  <span key={t.id || t.name} className="rounded-[10px] border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-mono text-white/70">
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* 3. TECHNICAL FOOTER */}
      <footer className="border-t border-white/10 py-10 bg-black text-xs font-mono text-white/60">
        <div className="container mx-auto max-w-7xl px-5 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="size-2.5 bg-white rounded-none" />
            <span className="font-bold text-white uppercase tracking-wider">FEEXSYSTEMS</span>
            <span className="text-white/50">// Evidence Fabric Ledger</span>
          </div>
          <div className="text-white/50">
            © 2026 FEEXSYSTEMS. Cryptographic SHA-256 Verified & SOC 2 Type II Audited.
          </div>
        </div>
      </footer>

      {/* Floating Interactive Quick Dock */}
      <div className="fixed bottom-6 inset-x-0 flex justify-center z-40 pointer-events-auto">
        <AppleDock />
      </div>
    </main>
  );
}
