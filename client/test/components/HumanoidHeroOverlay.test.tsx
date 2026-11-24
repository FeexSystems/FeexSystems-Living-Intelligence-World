import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { HumanoidHeroOverlay } from "@/landing/components/HumanoidHeroOverlay";
import { SceneVisibilityContext } from "@/landing/effects/SceneVisibilityContext";

// FEEX-SORL Phase 1: the overlay is DOM-only disclosure. There is no
// WebGL layer — the suite verifies mount gating and required copy.

let mockProjectionEnabled = true;
vi.mock("@/lib/eil/projectionConfig", () => ({
  get EIL_PROJECTION_ENABLED() {
    return mockProjectionEnabled;
  },
}));

const wrap = (ui: React.ReactElement, visible = true) =>
  render(
    <SceneVisibilityContext.Provider value={{ near: visible, visible }}>
      {ui}
    </SceneVisibilityContext.Provider>,
  );

describe("HumanoidHeroOverlay DOM disclosure", () => {
  beforeEach(() => {
    mockProjectionEnabled = true;
  });

  it("renders the OpenJarvis adoption panel and SIMULATED badge when visible", () => {
    wrap(<HumanoidHeroOverlay />);
    expect(screen.getByTestId("openjarvis-adoption-panel")).toBeInTheDocument();
    expect(screen.getAllByText(/NOT CONNECTED/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/NO LIVE AGENT REQUESTS/),
    ).toBeInTheDocument();
  });

  it("renders nothing when the scene is not visible", () => {
    wrap(<HumanoidHeroOverlay />, false);
    expect(screen.queryByTestId("openjarvis-adoption-panel")).not.toBeInTheDocument();
  });

  it("renders nothing when EIL_PROJECTION_ENABLED is false", () => {
    mockProjectionEnabled = false;
    wrap(<HumanoidHeroOverlay />);
    expect(screen.queryByTestId("openjarvis-adoption-panel")).not.toBeInTheDocument();
  });
});
