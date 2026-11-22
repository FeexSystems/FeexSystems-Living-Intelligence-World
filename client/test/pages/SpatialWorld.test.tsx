import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import SpatialWorld from "@/pages/SpatialWorld";

// SpatialWorld mounts a real R3F Canvas plus heavy scene/HUD children.
// Stub the render boundary and sibling surfaces so the EIL projection
// contract can be asserted in jsdom.
vi.mock("@react-three/fiber", () => ({
  Canvas: (props: Record<string, unknown> & { children?: React.ReactNode }) => (
    <div data-testid="world-canvas">{props.children}</div>
  ),
}));
vi.mock("@react-three/drei", () => ({ Loader: () => null }));
vi.mock("@/components/galaxy/GalaxyScene", () => ({ GalaxyScene: () => null }));
vi.mock("@/components/GlobeView", () => ({ GlobeView: () => null }));
vi.mock("@/components/sovereign/SovereignHUD", () => ({ SovereignHUD: () => null }));
vi.mock("@/components/sovereign/SovereignTelemetry", () => ({ SovereignTelemetry: () => null }));
vi.mock("@/components/sovereign/HoloKaiInterface", () => ({ HoloKaiInterface: () => null }));
vi.mock("@/components/GitHubAuthGuard", () => ({
  useGitHubAuthGuard: () => ({ GitHubAuthModal: () => null }),
}));
vi.mock("@/lib/sonikAudio", () => ({
  sonikAudio: {
    isMuted: () => false,
    unlockAudio: vi.fn(),
    toggleMute: vi.fn(),
    playCyberClick: vi.fn(),
    triggerHaptic: vi.fn(),
  },
}));
vi.mock("../../../packages/feex-eil/renderer/HumanoidScene", () => ({
  HumanoidScene: () => <div data-testid="eil-humanoid-scene" />,
}));

describe("SpatialWorld EIL projection rollback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { nodes: [], edges: [] } }),
    });
  });

  it("mounts the EIL humanoid projection inside the world Canvas when enabled", async () => {
    render(
      <MemoryRouter>
        <SpatialWorld />
      </MemoryRouter>,
    );

    // The ephemeral runtime commits its OFFLINE→IDLE boot event on mount.
    await waitFor(() => {
      expect(screen.getByTestId("eil-humanoid-scene")).toBeInTheDocument();
    });
    expect(screen.getByTestId("world-canvas")).toBeInTheDocument();
  });

  it("hides the EIL projection when eilProjectionEnabled is false", async () => {
    render(
      <MemoryRouter>
        <SpatialWorld eilProjectionEnabled={false} />
      </MemoryRouter>,
    );

    // Flush mount effects (graph fetch + runtime boot event), then assert
    // the projection never mounts — the world scene is identical to the
    // pre-EIL path. This disables rendering only; the ephemeral runtime
    // may still process local signals.
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId("eil-humanoid-scene")).not.toBeInTheDocument();
    expect(screen.getByTestId("world-canvas")).toBeInTheDocument();
  });
});
