import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { GraphNode } from "@/components/galaxy/types";
import {
  CANONICAL_INITIAL_GRAPH,
  detectDefaultQuality,
  useKnowledgeGalaxy,
} from "@/pages/spatial-world/useKnowledgeGalaxy";

const PROJECT_NODE: GraphNode = {
  id: "github:FeexSystems/HoloKai-Systems-Labs",
  name: "HoloKai Systems Labs",
  type: "project",
  repository: "FeexSystems/HoloKai-Systems-Labs",
};

const TECH_NODE: GraphNode = {
  id: "tech:threejs",
  name: "Three.js",
  type: "technology",
};

const TECH_GRAPH_RESPONSE = {
  success: true,
  data: {
    nodes: [{ id: "tech:threejs", name: "Three.js", type: "technology" }],
    links: [],
    stats: { totalProjects: 0, totalTechnologies: 1, totalLinks: 0 },
  },
};

const TEMPORAL_RESPONSE = {
  success: true,
  data: [
    { commit: "ad50759a", message: "Notarize world model", timestamp: "2026-01-02T00:00:00.000Z" },
    { commit: "beef1234", message: "Ingest artifacts", timestamp: "2026-01-01T00:00:00.000Z" },
  ],
};

/** Minimal fetch stub that routes by URL and records the calls made. */
function mockFetch(handlers: Record<string, () => Promise<unknown>>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    const match = Object.keys(handlers).find((key) => url.includes(key));
    if (!match) return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    return handlers[match]();
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Sets the viewport size used by both detectDefaultQuality and the resize listener. */
function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: height });
}

/** Reports a device with enough cores/memory to start in cinematic quality. */
function setCapableDevice() {
  Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, value: 12 });
  Object.defineProperty(navigator, "deviceMemory", { configurable: true, value: 16 });
}

describe("useKnowledgeGalaxy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setViewport(1440, 900);
    setCapableDevice();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("boots from the canonical graph and swaps in the live graph on success", async () => {
    const fetchMock = mockFetch({
      "/api/world-model/graph": async () => ({ ok: true, json: async () => TECH_GRAPH_RESPONSE }),
    });

    const { result } = renderHook(() => useKnowledgeGalaxy(null));

    expect(fetchMock).toHaveBeenCalledWith("/api/world-model/graph");
    await waitFor(() => expect(result.current.graphData).toEqual(TECH_GRAPH_RESPONSE.data));
    expect(result.current.loading).toBe(false);
  });

  it("keeps the canonical fallback graph when the graph endpoint fails", async () => {
    mockFetch({
      "/api/world-model/graph": async () => {
        throw new Error("network down");
      },
    });

    const { result } = renderHook(() => useKnowledgeGalaxy(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.graphData).toBe(CANONICAL_INITIAL_GRAPH);
  });

  it("loads temporal events for a project node and auto-selects the newest commit", async () => {
    mockFetch({
      "/api/world-model/graph": async () => ({ ok: true, json: async () => TECH_GRAPH_RESPONSE }),
      "/events": async () => ({ ok: true, json: async () => TEMPORAL_RESPONSE }),
    });

    const { result } = renderHook(() => useKnowledgeGalaxy(PROJECT_NODE));

    await waitFor(() => expect(result.current.temporalEvents).toHaveLength(2));
    expect(result.current.selectedCommit).toBe("ad50759a");
    expect(result.current.loadingTemporal).toBe(false);
  });

  it("discards a resolved temporal response after the selection switches away", async () => {
    let resolveTemporal: (value: unknown) => void = () => {};
    const pending = new Promise((resolve) => {
      resolveTemporal = resolve;
    });

    mockFetch({
      "/api/world-model/graph": async () => ({ ok: true, json: async () => TECH_GRAPH_RESPONSE }),
      "/events": () => pending,
    });

    const { result, rerender } = renderHook(({ node }) => useKnowledgeGalaxy(node), {
      initialProps: { node: PROJECT_NODE as GraphNode | null },
    });

    // Switch to a non-project node before the in-flight request settles.
    rerender({ node: TECH_NODE });

    await act(async () => {
      resolveTemporal({ ok: true, json: async () => TEMPORAL_RESPONSE });
      await pending;
    });

    // The cancelled effect must not hydrate the stale commits.
    expect(result.current.temporalEvents).toEqual([]);
    expect(result.current.selectedCommit).toBeNull();
    expect(result.current.loadingTemporal).toBe(false);
  });

  it("downgrades cinematic quality to performance when the viewport shrinks to mobile", async () => {
    mockFetch({
      "/api/world-model/graph": async () => ({ ok: true, json: async () => TECH_GRAPH_RESPONSE }),
    });

    setViewport(1440, 900);
    const { result } = renderHook(() => useKnowledgeGalaxy(null));
    expect(result.current.quality).toBe("cinematic");
    expect(result.current.isMobile).toBe(false);

    await act(async () => {
      setViewport(390, 844);
      window.dispatchEvent(new Event("resize"));
    });

    await waitFor(() => expect(result.current.isMobile).toBe(true));
    expect(result.current.quality).toBe("performance");
    expect(result.current.orientation).toBe("portrait");
  });

  it("detectDefaultQuality starts small screens at performance", () => {
    setViewport(390, 844);
    expect(detectDefaultQuality()).toBe("performance");

    setViewport(1440, 900);
    setCapableDevice();
    expect(detectDefaultQuality()).toBe("cinematic");
  });
});