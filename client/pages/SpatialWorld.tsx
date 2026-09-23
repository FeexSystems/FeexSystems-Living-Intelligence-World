import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { Loader } from "@react-three/drei";
import {
  Boxes,
  Globe,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCw,
  Search,
  Sparkles,
  Smartphone,
  X,
} from "lucide-react";
import { FeexHorizontalLockup, FeexWorldBadge } from "@/components/FeexLogo";
import { GalaxyScene } from "@/components/galaxy/GalaxyScene";
import type { GalaxyQuality, GraphNode } from "@/components/galaxy/types";
import { QUALITY_PRESETS } from "@/components/galaxy/types";
import { useGitHubAuthGuard } from "@/components/GitHubAuthGuard";
import { NodeInspector } from "./spatial-world/NodeInspector";
import {
  useKnowledgeGalaxy,
  type GalaxyOrientation,
  type Orientation,
} from "./spatial-world/useKnowledgeGalaxy";

// Re-exported for backwards compatibility with the previous in-page declarations.
export type { TemporalEvent } from "./spatial-world/useKnowledgeGalaxy";
export type { Orientation, GalaxyOrientation };

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
        {/* The drei Loader only belongs to the live canvas — it must not cover the
            context-lost recovery panel below. */}
        {!contextLost && (
          <Loader
            containerStyles={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
            innerStyles={{ backgroundColor: "#FFFFFF" }}
            barStyles={{ backgroundColor: "#71717A" }}
            dataStyles={{ color: "#FFFFFF", fontFamily: "monospace", fontSize: 11 }}
            dataInterpolation={(p) => `GALAXY_BOOT ${(p * 100).toFixed(0)}%`}
          />
        )}
      </div>

      {/* Responsive Node Inspector */}
      {selectedNode && (
        <NodeInspector
          node={selectedNode}
          isMobile={isMobile}
          temporalEvents={temporalEvents}
          selectedCommit={selectedCommit}
          loadingTemporal={loadingTemporal}
          onSelectCommit={setSelectedCommit}
          onClose={() => setSelectedNode(null)}
          onGitHubClick={handleGitHubClick}
        />
      )}

      {/* GitHub Auth Required Modal */}
      {GitHubAuthModal}
    </div>
  );
}
