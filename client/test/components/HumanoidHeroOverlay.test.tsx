import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { HumanoidHeroOverlay } from "@/landing/components/HumanoidHeroOverlay";
import { SceneVisibilityContext } from "@/landing/effects/SceneVisibilityContext";
import type { EffectCapabilities } from "@/landing/effects/capabilities";

// The lazy WebGL layer is stubbed: this suite verifies the mount gate,
// not the renderer. The canvas chunk must never load for gated devices.
vi.mock("@/landing/components/HumanoidHeroCanvas", () => ({
  default: () => <div data-testid="humanoid-hero-canvas" />,
}));

const caps = (over: Partial<EffectCapabilities> = {}): EffectCapabilities => ({
  reducedMotion: false,
  saveData: false,
  coarsePointer: false,
  lowPower: false,
  webgl: true,
  ...over,
});

let mockCaps = caps();
let mockPaused = false;

vi.mock("@/landing/effects/capabilities", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/landing/effects/capabilities")>();
  return { ...mod, useEffectCapabilities: () => mockCaps };
});
vi.mock("@/landing/components/useMotionPaused", () => ({
  useMotionPaused: () => mockPaused,
}));

const wrap = (ui: React.ReactElement, visible = true) =>
  render(
    <SceneVisibilityContext.Provider value={{ near: visible, visible }}>
      {ui}
    </SceneVisibilityContext.Provider>,
  );

describe("HumanoidHeroOverlay mount gate", () => {
  beforeEach(() => {
    mockCaps = caps();
    mockPaused = false;
  });

  it("mounts the lazy canvas only when the scene is visible on a capable device", async () => {
    wrap(<HumanoidHeroOverlay />);
    await waitFor(() =>
      expect(screen.getByTestId("humanoid-hero-canvas")).toBeInTheDocument(),
    );
  });

  it("does not mount when the scene is not visible", () => {
    wrap(<HumanoidHeroOverlay />, false);
    expect(screen.queryByTestId("humanoid-hero-canvas")).not.toBeInTheDocument();
  });

  it("does not mount under reduced motion", () => {
    mockCaps = caps({ reducedMotion: true });
    wrap(<HumanoidHeroOverlay />);
    expect(screen.queryByTestId("humanoid-hero-canvas")).not.toBeInTheDocument();
  });

  it("does not mount on low-power, save-data, coarse-pointer, or paused motion", () => {
    for (const over of [
      { lowPower: true },
      { saveData: true },
      { coarsePointer: true },
      { webgl: false },
    ] as const) {
      mockCaps = caps(over);
      const { unmount } = wrap(<HumanoidHeroOverlay />);
      expect(screen.queryByTestId("humanoid-hero-canvas")).not.toBeInTheDocument();
      unmount();
    }
    mockPaused = true;
    wrap(<HumanoidHeroOverlay />);
    expect(screen.queryByTestId("humanoid-hero-canvas")).not.toBeInTheDocument();
  });
});
