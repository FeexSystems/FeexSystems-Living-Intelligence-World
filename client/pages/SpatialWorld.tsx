import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Loader } from "@react-three/drei";
import { GalaxyScene } from "@/components/galaxy/GalaxyScene";
import type { GalaxyQuality, GraphData, GraphNode } from "@/components/galaxy/types";
import { QUALITY_PRESETS } from "@/components/galaxy/types";
import { useGitHubAuthGuard } from "@/components/GitHubAuthGuard";
import { sonikAudio } from "../lib/sonikAudio";
import { SovereignHUD } from "@/components/sovereign/SovereignHUD";
import { SovereignTelemetry, type SovereignTelemetryState } from "@/components/sovereign/SovereignTelemetry";
import { HoloKaiInterface } from "@/components/sovereign/HoloKaiInterface";
import { WorldReturnBar } from "@/components/navigation";

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

  // HUD & Telemetry State
  const [telemetry, setTelemetry] = useState<SovereignTelemetryState>({
    hudTerminalLog: "SYSTEM READY // Exploring World Model",
    isSimulated: true,
    activeServerIndex: null,
    hexCrawl: "0xF211",
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  useEffect(() => {
    setIsMuted(sonikAudio.isMuted());
  }, []);

  const handleMuteToggle = useCallback(() => {
    sonikAudio.unlockAudio();
    const nextMuted = sonikAudio.toggleMute();
    setIsMuted(nextMuted);
    sonikAudio.playCyberClick(nextMuted ? 0.8 : 1.3);
  }, []);

  const handleSelectNode = useCallback((node: GraphNode | null) => {
    setSelectedNode(node);
    if (!node) return;
    sonikAudio.playCyberClick(1.3);
    sonikAudio.triggerHaptic(18);
    setTelemetry((current) => ({ ...current, hudTerminalLog: "TARGET LOCK // " + node.name }));
  }, []);

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
    <div className="relative h-screen w-screen bg-[#080a0c] text-[#e0e6ed] overflow-hidden select-none font-mono">
      <div className="scanlines" data-canonical-world-count={graphData.nodes.length} /><div className="vignette" />
      <div className="absolute inset-0 pointer-events-none z-10" style={{ backgroundImage: "linear-gradient(rgba(0, 255, 102, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 102, 0.04) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full border border-white/5 pointer-events-none z-20 flex items-center justify-center opacity-70">
        <div className="absolute w-[calc(100%+40px)] h-[1px] bg-white/10" /><div className="absolute h-[calc(100%+40px)] w-[1px] bg-white/10" /><div className="w-1.5 h-1.5 rounded-full bg-[#00ff66] shadow-[0_0_8px_#00ff66] z-30" />
      </div>

      <SovereignTelemetry onChange={setTelemetry} />

      {/* 3D WebGL Canvas Viewport */}
      <div className="absolute inset-0 z-0">
        {contextLost ? (
          <div className="h-full w-full flex flex-col items-center justify-center bg-black text-white p-6 font-mono text-center">
            <p className="text-sm text-white/70 mb-4">
              WebGL context paused. Tap below to resume 3D rendering.
            </p>
            <button
              onClick={() => setContextLost(false)}
              className="px-4 py-2 bg-white text-black text-xs font-semibold rounded-lg pointer-events-auto"
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
                onSelectNode={handleSelectNode}
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

      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col">
        <SovereignHUD 
          selectedNode={selectedNode} 
          nodes={graphData.nodes} 
          telemetry={telemetry} 
          isMuted={isMuted} 
          onMuteToggle={handleMuteToggle} 
          onVoiceOpen={() => setIsVoiceModalOpen(true)} 
          onSelectNode={handleSelectNode} 
        />
      </div>

      <HoloKaiInterface isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} activeEcosystem={selectedNode?.name || "Galaxy"} />

      {/* Guaranteed exit / re-entry navigation for the full-screen 3D runtime */}
      <WorldReturnBar />

      {/* GitHub Auth Required Modal */}
      {GitHubAuthModal}
    </div>
  );
}
