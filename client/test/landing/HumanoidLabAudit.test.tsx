import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Landing Scene 01 — humanoid + FEEX-SORL laboratory audit regressions.
 *
 * Covers the four deterministic defects raised by the 2026-11-26 audit:
 *
 * 1. Control names in the scene must be unambiguous: the LAB dock's
 *    `COMMAND` zone was matching the same `/command/i` accessible-name query
 *    as the global launcher button, which broke every landing routing test.
 * 2. The lab manifest must not point at files that do not exist, and must not
 *    assert provenance hashes it has not verified.
 * 3. The character loader must resolve to the approved/rollback asset — the
 *    untextured Tripo candidate must never be `active`.
 * 4. The navigation travel origin must equal the camera's initial pose.
 */

const here = dirname(fileURLToPath(import.meta.url));
// `here` is `<repo>/client/test/landing`.
const repoRoot = resolve(here, "../../..");

// Ambient surfaces that touch audio / canvas / GSAP.
vi.mock("@/landing/components/ScrollytellingManager", () => ({
  ScrollytellingManager: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scrollytelling-manager">{children}</div>
  ),
}));
vi.mock("@/landing/components/SoundscapeController", () => ({
  SoundscapeController: () => null,
}));
vi.mock("@/landing/cinematic/AssetPreloader", () => ({
  AssetPreloader: () => null,
}));
vi.mock("@/landing/scenes/HeroScene", () => ({ HeroScene: () => <div /> }));
vi.mock("@/landing/scenes/GalaxySequenceScene", () => ({
  GalaxySequenceScene: () => <div />,
}));
vi.mock("@/landing/scenes/Section03CoreArchitecture", () => ({
  Section03CoreArchitecture: () => <div />,
}));
vi.mock("@/landing/scenes/MissionCapabilityScene", () => ({
  MissionCapabilityScene: () => <div />,
}));
vi.mock("@/landing/scenes/ConvergenceScene", () => ({
  ConvergenceScene: () => <div />,
}));
vi.mock("@/landing/scenes/UILoopsScene", () => ({ UILoopsScene: () => <div /> }));
vi.mock("@/landing/scenes/SectionArchitectOrigin", () => ({
  SectionArchitectOrigin: () => <div />,
}));
vi.mock("@/landing/scenes/WorldsScene", () => ({ WorldsScene: () => <div /> }));
vi.mock("@/landing/scenes/NoirPrimitivesScene", () => ({
  NoirPrimitivesScene: () => <div />,
}));
vi.mock("@/landing/scenes/NoirWebGLScene", () => ({
  NoirWebGLScene: () => <div />,
}));
vi.mock("@/landing/scenes/NoirCapabilitiesScene", () => ({
  NoirCapabilitiesScene: () => <div />,
}));
// Scene 01's WebGL stage is excluded from these assertions on purpose.
vi.mock("@/landing/components/humanoid/HumanoidStage", () => ({
  HumanoidStage: () => <div data-testid="humanoid-stage-stub" />,
}));
// The global Command launcher entry point, as the real overlay renders it.
vi.mock("@/landing/components/NavigationOverlay", () => ({
  NavigationOverlay: ({ onCommandClick }: { onCommandClick: () => void }) => (
    <button type="button" onClick={onCommandClick}>
      Command
    </button>
  ),
}));

describe("Scene 01 — lab dock accessible names", () => {
  beforeEach(() => {
    // HumanoidHeroScene owns IntersectionObserver-driven visibility.
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      }
    );
  });
  afterEach(() => {
    // Matches the stub above, so no implementation leaks to other files.
    vi.unstubAllGlobals();
  });

  it("keeps the launcher's /command/i query unique despite the LAB dock", async () => {
    const { HumanoidHeroScene } = await import("@/landing/scenes/HumanoidHeroScene");
    render(
      <MemoryRouter>
        <HumanoidHeroScene />
      </MemoryRouter>
    );

    // The global launcher is the only control matching /command/i.
    const commandButtons = screen.getAllByRole("button", { name: /command/i });
    expect(commandButtons).toHaveLength(1);

    // The lab dock exposes the zone with a scoped, explicit name.
    const zone = screen.getByRole("button", { name: /^LAB Sovereign Command Centre$/ });
    expect(zone).toHaveAttribute("aria-pressed", "false");
  });

  it("scopes overview and humanoid travel controls too", async () => {
    const { HumanoidHeroScene } = await import("@/landing/scenes/HumanoidHeroScene");
    render(
      <MemoryRouter>
        <HumanoidHeroScene />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "LAB OVERVIEW" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "LAB HUMANOID" })).toBeInTheDocument();
  });

  it("labels OBSERVE as an inspection intent that holds Idle", async () => {
    const { HumanoidHeroScene } = await import("@/landing/scenes/HumanoidHeroScene");
    render(
      <MemoryRouter>
        <HumanoidHeroScene />
      </MemoryRouter>
    );

    const observe = screen.getByRole("button", { name: /observe/i });
    expect(observe).toHaveTextContent(/INSPECT/i);
    expect(observe).toHaveAttribute("title", expect.stringMatching(/no dedicated Observe clip/i));
  });
});

describe("lab manifest — runtime contract", () => {
  it("never points an evidence entry at a missing GLB", async () => {
    const { LAB_ASSETS } = await import("@/lib/lab/lab-manifest");
    const offenders: string[] = [];
    for (const entry of Object.values(LAB_ASSETS)) {
      if (!entry.src) continue;
      if (!existsSync(resolve(repoRoot, "public", entry.src.replace(/^\//, "")))) {
        offenders.push(`${entry.id}: ${entry.src}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("does not claim provenance for entries without a verified digest", async () => {
    const { LAB_ASSETS } = await import("@/lib/lab/lab-manifest");
    for (const entry of Object.values(LAB_ASSETS)) {
      if (entry.src && !entry.sha256) {
        throw new Error(`${entry.id} has a src but no sha256 — provenance would be claimed`);
      }
    }
    expect(LAB_ASSETS.lab_shell.src).toBeNull();
    expect(LAB_ASSETS.humanoid.src).toBeNull();
  });

  it("zone asset bindings all resolve to tracked prop GLBs", async () => {
    const { LAB_ZONE_ASSETS, LAB_ASSET_FILES } = await import("@/lib/lab/lab-manifest");
    for (const [zoneId, assetId] of Object.entries(LAB_ZONE_ASSETS)) {
      expect(assetId, `${zoneId} has no asset binding`).toBeTruthy();
      const file = LAB_ASSET_FILES[assetId as string];
      expect(file, `${zoneId} → ${assetId} not in LAB_ASSET_FILES`).toBeDefined();
      expect(existsSync(resolve(repoRoot, "public", file.src.replace(/^\//, "")))).toBe(true);
    }
  });

  it("marks exactly one character asset active, and it is not the Tripo candidate", async () => {
    const { LAB_CHARACTER_ASSETS } = await import("@/lib/lab/lab-manifest");
    const active = LAB_CHARACTER_ASSETS.filter((asset) => asset.active);
    expect(active).toHaveLength(1);
    expect(active[0].kind).toBe("rollback-synthetic");
    for (const asset of LAB_CHARACTER_ASSETS) {
      expect(existsSync(resolve(repoRoot, "public", asset.src.replace(/^\//, "")))).toBe(true);
    }
  });

  it("resolves the loader source from the manifest's active character", async () => {
    const { HUMANOID_MODEL } = await import("@/landing/config/humanoid.config");
    const { LAB_CHARACTER_ASSETS } = await import("@/lib/lab/lab-manifest");
    const active = LAB_CHARACTER_ASSETS.find((asset) => asset.active);
    expect(HUMANOID_MODEL.src).toBe(active!.src);
    expect(HUMANOID_MODEL.src).toBe("/models/feex-sovereign-synthetic.glb");
  });
});

describe("lab navigation — initial origin", () => {
  it("seeds the travel origin at the camera's initial node", async () => {
    const { LAB_INITIAL_NODE, LAB_WAYPOINTS, resolveWaypointPath } = await import(
      "@/lib/lab/lab-zone-graph"
    );
    const { useLabNavigation } = await import("@/hooks/lab/useLabNavigation");

    // WaypointRig parks the camera on LAB_INITIAL_NODE; the logical origin must
    // agree, otherwise the first route is built from a pose never rendered.
    expect(LAB_WAYPOINTS[LAB_INITIAL_NODE]).toBeDefined();

    const { result } = renderHook(() => useLabNavigation({ reducedMotion: true }));
    await act(async () => {
      result.current.navigate("ai-research");
    });

    const expected = resolveWaypointPath(LAB_INITIAL_NODE, "ai-research");
    expect(result.current.path).toEqual(expected);
    // Origin was the humanoid, so travel must transit the atrium first.
    expect(result.current.path).toHaveLength(2);
    expect(result.current.state.targetZone).toBe("ai-research");
  });

  it("reset returns the origin to the initial node", async () => {
    const { LAB_INITIAL_NODE, resolveWaypointPath } = await import("@/lib/lab/lab-zone-graph");
    const { useLabNavigation } = await import("@/hooks/lab/useLabNavigation");

    const { result } = renderHook(() => useLabNavigation({ reducedMotion: true }));
    await act(async () => {
      result.current.navigate("bio-research");
    });
    await act(async () => {
      result.current.reset();
    });
    await act(async () => {
      result.current.navigate("bio-research");
    });
    expect(result.current.path).toEqual(resolveWaypointPath(LAB_INITIAL_NODE, "bio-research"));
  });
});
