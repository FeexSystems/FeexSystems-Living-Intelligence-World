import { useCallback, useEffect, useState } from "react";
import type { GalaxyQuality, GraphData, GraphNode } from "@/components/galaxy/types";

/**
 * A single temporal lens event sourced from the World Model commit history.
 */
export interface TemporalEvent {
  commit: string;
  message?: string;
  timestamp: string;
}

/**
 * Canonical screen orientation, shared by the hook state and its consumers.
 */
export type Orientation = "portrait" | "landscape";

/** Alias kept for galaxy-specific call sites. */
export type GalaxyOrientation = Orientation;

/**
 * Minimal navigator surface for non-standard, loosely-typed browser APIs.
 */
interface NavigatorWithDeviceMemory extends Navigator {
  deviceMemory?: number;
}

/**
 * Canonical bootstrap graph, used until the World Model graph endpoint answers
 * (and as the permanent fallback when it cannot be reached).
 */
export const CANONICAL_INITIAL_GRAPH: GraphData = {
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

/**
 * Picks a starting render quality from the device's coarse capabilities.
 * Small screens always start in `performance` so the first frame is cheap.
 */
export function detectDefaultQuality(): GalaxyQuality {
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

export interface KnowledgeGalaxyState {
  graphData: GraphData;
  loading: boolean;
  loadGraph: () => Promise<void>;
  quality: GalaxyQuality;
  setQuality: (quality: GalaxyQuality) => void;
  isMobile: boolean;
  orientation: GalaxyOrientation;
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
export function useKnowledgeGalaxy(selectedNode: GraphNode | null): KnowledgeGalaxyState {
  const [graphData, setGraphData] = useState<GraphData>(CANONICAL_INITIAL_GRAPH);
  const [loading, setLoading] = useState(false);
  const [quality, setQuality] = useState<GalaxyQuality>(() => detectDefaultQuality());
  const [isMobile, setIsMobile] = useState(false);
  const [orientation, setOrientation] = useState<GalaxyOrientation>("landscape");
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