import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { Loader } from "@react-three/drei";
import {
  Boxes,
  Compass,
  ExternalLink,
  FileCode,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCw,
  Search,
  ShieldCheck,
  Sparkles,
  Smartphone,
  X,
} from "lucide-react";
import { FeexHorizontalLockup, FeexWorldBadge } from "@/components/FeexLogo";
import { GalaxyScene } from "@/components/galaxy/GalaxyScene";
import type { GalaxyQuality, GraphData, GraphNode } from "@/components/galaxy/types";
import { QUALITY_PRESETS } from "@/components/galaxy/types";
import { useGitHubAuthGuard } from "@/components/GitHubAuthGuard";
import type { ReactNode } from "react";

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

/**
 * A single temporal lens event sourced from the World Model commit history.
 */
export interface TemporalEvent {
  commit: string;
  message?: string;
  timestamp: string;
}

/**
 * Minimal navigator surface for non-standard, loosely-typed browser APIs.
 */
interface NavigatorWithDeviceMemory extends Navigator {
  deviceMemory?: number;
}

const CANONICAL_INITIAL_GRAPH: GraphData = {
  nodes: [
    {
      id: "github:FeexSystems/FEEXSYSTEMS-Persona-Digital-Portfolio",
      name: "Persona Digital Operating Environment",
      type: "project",
      repository: "FeexSystems/FEEXSYSTEMS-Persona-Digital-Portfolio",
      description: "Spatial digital environment for Persona, systems, and engineering relationships.",
      url: "https://github.com/FeexSystems/FEEXSYSTEMS-Persona-Digital-Portfolio",
      isPinned: true,
      domain: "Intelligence",
      language: "JavaScript",
      artifactCount: 14,
      val: 36,
    },
    {
      id: "github:FeexSystems/yurrheeler-med-advisor",
      name: "Yurrheeler Med Advisor",
      type: "project",
      repository: "FeexSystems/yurrheeler-med-advisor",
      description: "AI-oriented healthcare medical-advisor engineering project.",
      url: "https://github.com/FeexSystems/yurrheeler-med-advisor",
      isPinned: true,
      domain: "Healthcare",
      language: "TypeScript",
      artifactCount: 12,
      val: 36,
    },
    {
      id: "github:FeexSystems/kappaxchangefin",
      name: "KappaXchangeFin",
      type: "project",
      repository: "FeexSystems/kappaxchangefin",
      description: "Financial intelligence exchange platform with live algorithmic pipelines.",
      url: "https://github.com/FeexSystems/kappaxchangefin",
      isPinned: true,
      domain: "Finance",
      language: "TypeScript",
      artifactCount: 10,
      val: 36,
    },
    {
      id: "github:FeexSystems/HoloKai-Systems-Labs",
      name: "HoloKai Systems Labs",
      type: "project",
      repository: "FeexSystems/HoloKai-Systems-Labs",
      description: "Civilization and spatial intelligence engineering lab repository.",
      url: "https://github.com/FeexSystems/HoloKai-Systems-Labs",
      isPinned: true,
      domain: "Cultural",
      language: "TypeScript",
      artifactCount: 8,
      val: 36,
    },
    {
      id: "github:FeexSystems/VYRA-LABS",
      name: "VYRA Labs Platform",
      type: "project",
      repository: "FeexSystems/VYRA-LABS",
      description: "Living intelligence systems, agents, and conversational runtime.",
      url: "https://github.com/FeexSystems/VYRA-LABS",
      isPinned: true,
      domain: "Conversational",
      language: "TypeScript",
      artifactCount: 11,
      val: 36,
    },
    {
      id: "github:FeexSystems/3WM-SONIK-LABS",
      name: "3WM Sonik Labs",
      type: "project",
      repository: "FeexSystems/3WM-SONIK-LABS",
      description: "Spatial audio, DSP neural pipelines, and acoustic engineering platform.",
      url: "https://github.com/FeexSystems/3WM-SONIK-LABS",
      isPinned: true,
      domain: "Audio",
      language: "TypeScript",
      artifactCount: 9,
      val: 36,
    },
    { id: "tech:threejs", name: "Three.js", type: "technology", domain: "Rendering", val: 18 },
    { id: "tech:typescript", name: "TypeScript", type: "technology", domain: "Language", val: 20 },
    { id: "tech:react", name: "React 18", type: "technology", domain: "Frontend", val: 22 },
    { id: "tech:express", name: "Express 5", type: "technology", domain: "Backend", val: 18 },
    { id: "tech:prisma", name: "Prisma ORM", type: "technology", domain: "Database", val: 16 },
    { id: "tech:redis", name: "Redis", type: "technology", domain: "Cache", val: 14 },
    { id: "tech:gemini", name: "Gemini AI", type: "technology", domain: "Intelligence", val: 20 },
  ],
  links: [
    { id: "l1", source: "github:FeexSystems/FEEXSYSTEMS-Persona-Digital-Portfolio", target: "tech:threejs", relation: "USES" },
    { id: "l2", source: "github:FeexSystems/FEEXSYSTEMS-Persona-Digital-Portfolio", target: "tech:react", relation: "USES" },
    { id: "l3", source: "github:FeexSystems/yurrheeler-med-advisor", target: "tech:gemini", relation: "USES" },
    { id: "l4", source: "github:FeexSystems/yurrheeler-med-advisor", target: "tech:typescript", relation: "USES" },
    { id: "l5", source: "github:FeexSystems/kappaxchangefin", target: "tech:redis", relation: "USES" },
    { id: "l6", source: "github:FeexSystems/kappaxchangefin", target: "tech:prisma", relation: "USES" },
    { id: "l7", source: "github:FeexSystems/HoloKai-Systems-Labs", target: "tech:threejs", relation: "USES" },
    { id: "l8", source: "github:FeexSystems/VYRA-LABS", target: "tech:gemini", relation: "USES" },
    { id: "l9", source: "github:FeexSystems/3WM-SONIK-LABS", target: "tech:threejs", relation: "USES" },
  ],
  stats: {
    totalProjects: 6,
    totalTechnologies: 7,
    totalLinks: 9,
  },
};

function detectDefaultQuality(): GalaxyQuality {
  if (typeof window === "undefined") return "performance";
  const isSmallDevice = window.innerWidth < 768;
  if (isSmallDevice) return "performance";

  const cores = navigator.hardwareConcurrency || 4;
  const typedNavigator = navigator as NavigatorWithDeviceMemory;
  const mem =
    typeof typedNavigator.deviceMemory === "number" ? typedNavigator.deviceMemory : 4;
  if (cores <= 4 || mem <= 4) return "performance";
  if (cores >= 8 && mem >= 8) return "cinematic";
  return "balanced";
}

interface KnowledgeGalaxyState {
  graphData: GraphData;
  loading: boolean;
  loadGraph: () => Promise<void>;
  quality: GalaxyQuality;
  setQuality: (quality: GalaxyQuality) => void;
  isMobile: boolean;
  orientation: "portrait" | "landscape";
  temporalEvents: TemporalEvent[];
  selectedCommit: string | null;
  setSelectedCommit: (commit: string | null) => void;
  loadingTemporal: boolean;
}

/**
 * Owns the World Model graph fetch, device-quality detection, responsive
 * mobile/orientation tracking, and the temporal commit feed for the selected
 * project node.
 */
function useKnowledgeGalaxy(selectedNode: GraphNode | null): KnowledgeGalaxyState {
  const [graphData, setGraphData] = useState<GraphData>(CANONICAL_INITIAL_GRAPH);
  const [loading, setLoading] = useState(false);
  const [quality, setQuality] = useState<GalaxyQuality>(() => detectDefaultQuality());
  const [isMobile, setIsMobile] = useState(false);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");
  const [temporalEvents, setTemporalEvents] = useState<TemporalEvent[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [loadingTemporal, setLoadingTemporal] = useState(false);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/world-model/graph");
      if (!res.ok) {
        throw new Error(`Graph fetch failed: ${res.status}`);
      }
      const json = await res.json();
      if (json.success && json.data) setGraphData(json.data);
    } catch (e) {
      console.warn("Could not fetch live graph, using fallback", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  // Dynamic mobile & orientation detection
  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const mobile = w < 768;
      setIsMobile(mobile);
      setOrientation(h > w ? "portrait" : "landscape");
      setQuality((current) => (mobile && current === "cinematic" ? "performance" : current));
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  // Temporal Lens feed for the currently selected project node.
  useEffect(() => {
    // Clear stale temporal state immediately so the previous node's commits
    // never render while the new request is in flight.
    setTemporalEvents([]);
    setSelectedCommit(null);

    if (selectedNode?.type !== "project") {
      setLoadingTemporal(false);
      return;
    }

    const nodeId = selectedNode.id;
    let cancelled = false;
    setLoadingTemporal(true);

    fetch(`/api/world-model/temporal/${encodeURIComponent(nodeId)}/events?limit=20`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Temporal fetch failed: ${res.status}`))))
      .then((json) => {
        if (cancelled) return;
        if (json.success && json.data) {
          setTemporalEvents(json.data);
          if (json.data.length > 0) {
            setSelectedCommit(json.data[0].commit);
          }
        }
      })
      .catch((e) => {
        if (!cancelled) console.warn("Could not fetch temporal events", e);
      })
      .finally(() => {
        if (!cancelled) setLoadingTemporal(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedNode]);

  return {
    graphData,
    loading,
    loadGraph,
    quality,
    setQuality,
    isMobile,
    orientation,
    temporalEvents,
    selectedCommit,
    setSelectedCommit,
    loadingTemporal,
  };
}

export default function SpatialWorld() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [autoRotate, setAutoRotate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mobile & Orientation UI state
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  // GitHub Auth Guard hook
  const { handleGitHubClick, GitHubAuthModal } = useGitHubAuthGuard();

  // World Model graph, device quality and temporal-lens state
  const {
    graphData,
    loading,
    loadGraph,
    quality,
    setQuality,
    isMobile,
    orientation,
    temporalEvents,
    selectedCommit,
    setSelectedCommit,
    loadingTemporal,
  } = useKnowledgeGalaxy(selectedNode);

  const domains = useMemo(() => {
    const set = new Set<string>();
    graphData.nodes.forEach((n) => {
      if (n.domain) set.add(n.domain);
    });
    return Array.from(set);
  }, [graphData]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen toggle failed", e);
    } finally {
      // Derive state from the browser rather than assuming the request succeeded.
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  };

  // Safe capped DPR for mobile devices
  const dpr = useMemo(() => {
    if (isMobile) {
      return [1, Math.min(window.devicePixelRatio || 1, 1.25)] as [number, number];
    }
    return QUALITY_PRESETS[quality].dpr;
  }, [isMobile, quality]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white select-none font-mono">
      <div className="bg-diagonal-stripes absolute inset-0 z-10 opacity-10 pointer-events-none" />

      {/* Header Bar */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 md:p-6 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link
            to="/"
            className="flex items-center gap-2.5 border border-white/20 bg-black/90 px-3 py-1.5 text-xs font-semibold backdrop-blur-xl transition hover:border-white"
          >
            <FeexHorizontalLockup markSize={20} showSubtitle={false} />
            <span className="text-white/40">/</span>
            <span className="text-white font-mono text-[11px] tracking-wider uppercase">
              KNOWLEDGE_GALAXY
            </span>
          </Link>
          <FeexWorldBadge sha="sha-galaxy-hq" status="MONOCHROME" className="hidden sm:inline-flex" />
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto font-mono text-xs">
          {/* Mobile Orientation indicator */}
          {isMobile && (
            <span className="hidden xs:inline-flex items-center gap-1 px-2 py-1 text-[9px] border border-white/10 bg-black/80 text-white/50">
              <Smartphone className="size-2.5" />
              {orientation.toUpperCase()}
            </span>
          )}

          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as GalaxyQuality)}
            className="h-8 md:h-9 px-2 border border-white/20 bg-black/90 text-white text-xs outline-none"
            title="Render quality"
          >
            {(Object.keys(QUALITY_PRESETS) as GalaxyQuality[]).map((k) => (
              <option key={k} value={k}>
                {QUALITY_PRESETS[k].label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`h-8 md:h-9 px-2.5 border flex items-center gap-1 transition-colors text-xs ${
              autoRotate
                ? "bg-white text-black border-white font-semibold"
                : "bg-black/90 text-white/60 border-white/20"
            }`}
          >
            <RotateCw className={`size-3 ${autoRotate ? "animate-spin" : ""}`} style={{ animationDuration: "4s" }} />
            <span className="hidden sm:inline">ORBIT</span>
          </button>

          <button
            onClick={loadGraph}
            className="h-8 md:h-9 px-2.5 border border-white/20 bg-black/90 text-white/60 hover:text-white flex items-center gap-1.5"
            title="Refresh Knowledge Graph"
          >
            <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="h-8 md:h-9 px-2.5 border border-white/20 bg-black/90 text-white/60 hover:text-white"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
          </button>
        </div>
      </header>

      {/* Mobile Search Toggle */}
      {isMobile && !isSearchExpanded && !selectedNode && (
        <div className="absolute top-14 left-3 z-20 pointer-events-auto">
          <button
            onClick={() => setIsSearchExpanded(true)}
            className="h-8 px-3 rounded-full border border-white/20 bg-black/90 text-xs font-mono text-white/80 flex items-center gap-2 shadow-lg backdrop-blur-md"
          >
            <Search className="size-3 text-white" />
            <span>Filter Galaxy</span>
          </button>
        </div>
      )}

      {/* Search & Domain Filter Deck */}
      <div
        className={`z-20 space-y-2 pointer-events-auto transition-all ${
          isMobile
            ? isSearchExpanded
              ? "absolute top-14 inset-x-3 max-w-none bg-black/95 p-3 rounded-xl border border-white/20 shadow-2xl backdrop-blur-xl"
              : "hidden"
            : "absolute top-20 left-4 md:left-6 w-full max-w-xs"
        }`}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/40" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter galaxy…"
            className="w-full h-9 pl-9 pr-8 border border-white/20 bg-black/90 text-xs font-mono text-white placeholder:text-white/40 outline-none focus:border-white"
          />
          {isMobile && isSearchExpanded && (
            <button
              onClick={() => setIsSearchExpanded(false)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setDomainFilter("all")}
            className={`px-2 py-0.5 text-[10px] font-mono uppercase border ${
              domainFilter === "all"
                ? "border-white bg-white text-black font-semibold"
                : "border-white/20 text-white/60 hover:text-white"
            }`}
          >
            All
          </button>
          {domains.map((d) => (
            <button
              key={d}
              onClick={() => setDomainFilter(d)}
              className={`px-2 py-0.5 text-[10px] font-mono uppercase border ${
                domainFilter === d
                  ? "border-white bg-white text-black font-semibold"
                  : "border-white/20 text-white/60 hover:text-white"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-[10px] font-mono text-white/50 border border-white/20 bg-black/90 px-3 py-1.5">
          <Boxes className="size-3 text-white" />
          <span>{graphData.stats.totalProjects} worlds</span>
          <span>·</span>
          <span>{graphData.stats.totalTechnologies} tech</span>
          <span>·</span>
          <span>{graphData.stats.totalLinks} links</span>
          <Sparkles className="size-3 text-white ml-auto" />
          <span className="text-white/70">{QUALITY_PRESETS[quality].label}</span>
        </div>
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div className="absolute inset-0 z-0">
        {contextLost ? (
          <div className="h-full w-full flex flex-col items-center justify-center bg-black text-white p-6 font-mono text-center">
            <p className="text-sm text-white/70 mb-4">
              WebGL context paused. Tap below to resume 3D rendering.
            </p>
            <button
              onClick={() => setContextLost(false)}
              className="px-4 py-2 bg-white text-black text-xs font-semibold rounded-lg"
            >
              Resume 3D Galaxy
            </button>
          </div>
        ) : (
          <Canvas
            dpr={dpr}
            camera={{ position: [0, 8, 28], fov: isMobile ? 60 : 50, near: 0.1, far: 200 }}
            gl={{
              antialias: quality !== "performance",
              powerPreference: "high-performance",
              preserveDrawingBuffer: false,
            }}
            onCreated={({ gl }) => {
              const canvas = gl.domElement;
              const handleContextLost = (event: Event) => {
                event.preventDefault();
                setContextLost(true);
              };
              const handleContextRestored = () => setContextLost(false);
              canvas.addEventListener("webglcontextlost", handleContextLost, false);
              canvas.addEventListener("webglcontextrestored", handleContextRestored, false);
            }}
            onPointerMissed={() => setSelectedNode(null)}
          >
            <Suspense fallback={null}>
              <GalaxyScene
                data={graphData}
                selectedNode={selectedNode}
                searchQuery={searchQuery}
                domainFilter={domainFilter}
                autoRotate={autoRotate}
                quality={quality}
                onSelectNode={setSelectedNode}
              />
            </Suspense>
          </Canvas>
        )}
        <Loader
          containerStyles={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          innerStyles={{ backgroundColor: "#FFFFFF" }}
          barStyles={{ backgroundColor: "#71717A" }}
          dataStyles={{ color: "#FFFFFF", fontFamily: "monospace", fontSize: 11 }}
          dataInterpolation={(p) => `GALAXY_BOOT ${(p * 100).toFixed(0)}%`}
        />
      </div>

      {/* Responsive Node Inspector */}
      {selectedNode && (
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
                {selectedNode.type === "project" ? "WORLD NODE" : "TECHNOLOGY"}
              </div>
              <h2 className="text-base md:text-lg font-bold leading-tight text-white">
                {selectedNode.name}
              </h2>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              aria-label="Close inspector"
              className="text-white/50 hover:text-white p-1"
            >
              <X className="size-4" />
            </button>
          </div>

          {selectedNode.description && (
            <p className="text-xs text-white/70 mb-4 leading-relaxed font-mono">
              {selectedNode.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 mb-4">
            {selectedNode.domain && (
              <div className="border border-white/10 bg-zinc-950 p-2.5">
                <span className="text-[9px] uppercase text-white/40 block">Domain</span>
                <span className="text-xs font-semibold mt-1 block text-white">{selectedNode.domain}</span>
              </div>
            )}
            <div className="border border-white/10 bg-zinc-950 p-2.5">
              <span className="text-[9px] uppercase text-white/40 block">Language</span>
              <span className="text-xs font-semibold mt-1 block text-white">{selectedNode.language || "—"}</span>
            </div>
            {typeof selectedNode.artifactCount === "number" && (
              <div className="border border-white/10 bg-zinc-950 p-2.5">
                <span className="text-[9px] uppercase text-white/40 block">Artifacts</span>
                <span className="text-xs font-semibold mt-1 block text-white">{selectedNode.artifactCount}</span>
              </div>
            )}
          </div>

          {selectedNode.repository && (
            <div className="border border-white/10 bg-zinc-950 p-2.5 mb-4">
              <div className="flex items-center justify-between text-[9px] text-white/40 mb-1">
                <span>Repository</span>
                <ShieldCheck className="size-3.5 text-white/70" />
              </div>
              <div className="font-mono text-xs text-white break-all">{selectedNode.repository}</div>
            </div>
          )}

          {selectedNode.type === "project" && temporalEvents.length > 0 && (
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
                    if (temporalEvents[idx]) {
                      setSelectedCommit(temporalEvents[idx].commit);
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
            {selectedNode.type === "project" && (
              <InspectorAction
                variant="secondary"
                to={`/evidence?projectId=${encodeURIComponent(selectedNode.id)}`}
              >
                <FileCode className="size-3.5" /> Inspect Evidence
              </InspectorAction>
            )}

            {/* Authenticated GitHub Source link (Intercepted for public users) */}
            {selectedNode.url && (
              <InspectorAction variant="primary" onClick={() => handleGitHubClick(selectedNode.url!)}>
                GitHub Source <ExternalLink className="size-3.5" />
              </InspectorAction>
            )}

            <InspectorAction variant="outline" to={`/navigator?q=${encodeURIComponent(selectedNode.name)}`}>
              <Compass className="size-3.5 text-white" /> Query Navigator
            </InspectorAction>
            <InspectorAction
              variant="subtle"
              to={`/omni?q=${encodeURIComponent("Show architecture for " + selectedNode.name)}`}
            >
              Open in Omni-Command
            </InspectorAction>
          </div>
        </aside>
      )}

      {/* GitHub Auth Required Modal */}
      {GitHubAuthModal}
    </div>
  );
}
