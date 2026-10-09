import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Index from "@/pages/Index";

/**
 * The landing (`Index.tsx`) composes the cinematic scrollytelling scenes from
 * `client/landing/`. The scroll manager, ambient navigation and audio engine are
 * stubbed so assertions target the landing composition rather than jsdom-less
 * WebGL canvases or audio side effects.
 */
vi.mock("@/landing/components/ScrollytellingManager", () => ({
  ScrollytellingManager: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scrollytelling-manager">{children}</div>
  ),
}));

vi.mock("@/landing/components/NavigationOverlay", () => ({
  NavigationOverlay: ({ onCommandClick }: { onCommandClick: () => void }) => (
    <button type="button" onClick={onCommandClick}>
      Command
    </button>
  ),
}));

vi.mock("@/landing/components/SoundscapeController", () => ({
  SoundscapeController: () => <div data-testid="soundscape-controller" />,
}));

vi.mock("@/landing/scenes/HeroScene", () => ({
  HeroScene: () => <section data-testid="scene-hero" />,
}));
vi.mock("@/landing/scenes/GalaxySequenceScene", () => ({
  GalaxySequenceScene: () => <section data-testid="scene-galaxy" />,
}));
vi.mock("@/landing/scenes/CoreSystemsScene", () => ({
  CoreSystemsScene: () => <section data-testid="scene-systems" />,
}));
vi.mock("@/landing/scenes/WorldsScene", () => ({
  WorldsScene: () => <section data-testid="scene-worlds" />,
}));
vi.mock("@/landing/scenes/MissionCapabilityScene", () => ({
  MissionCapabilityScene: () => <section data-testid="scene-missions" />,
}));
vi.mock("@/landing/scenes/ConvergenceScene", () => ({
  ConvergenceScene: () => <section data-testid="scene-convergence" />,
}));
vi.mock("@/landing/scenes/UILoopsScene", () => ({
  UILoopsScene: () => <section data-testid="scene-ui-loops" />,
}));

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Index />
    </MemoryRouter>
  );
}

describe("Landing Page (Index.tsx) Verification", () => {
  it("renders the scene boundaries in canonical authoring order", () => {
    renderLanding();

    const sceneOrder = [
      "scene-hero",
      "scene-galaxy",
      "scene-systems",
      "scene-worlds",
      "scene-missions",
      "scene-convergence",
      "scene-ui-loops",
    ];

    const manager = screen.getByTestId("scrollytelling-manager");
    const rendered = Array.from(
      manager.querySelectorAll("[data-testid^='scene-']")
    ).map((node) => node.getAttribute("data-testid"));

    expect(rendered).toEqual(sceneOrder);
  });

  it("mounts the ambient navigation and soundscape surfaces", () => {
    renderLanding();

    expect(screen.getByRole("button", { name: /command/i })).toBeInTheDocument();
    expect(screen.getByTestId("soundscape-controller")).toBeInTheDocument();
  });

  it("opens the command launcher from the navigation overlay", async () => {
    renderLanding();

    // Launcher is closed until the command surface is invoked.
    expect(screen.queryByPlaceholderText(/type \/world/i)).not.toBeInTheDocument();

    await act(async () => {
      screen.getByRole("button", { name: /command/i }).click();
    });

    expect(screen.getByPlaceholderText(/type \/world/i)).toBeInTheDocument();
    expect(screen.getByText(/FEEX COMMAND LAUNCHER/i)).toBeInTheDocument();
  });

  it("exposes router-backed command shortcuts for preserved routes", async () => {
    renderLanding();

    await act(async () => {
      screen.getByRole("button", { name: /command/i }).click();
    });

    // Router-backed navigation only: the launcher must not fabricate output.
    expect(
      screen.getByText(/Router-backed navigation only\. No simulated infrastructure output\./i)
    ).toBeInTheDocument();

    for (const route of ["/world", "/navigator", "/omni", "/evidence"]) {
      expect(screen.getByRole("option", { name: route })).toBeInTheDocument();
    }
  });

  it("closes the command launcher", async () => {
    renderLanding();

    await act(async () => {
      screen.getByRole("button", { name: /command/i }).click();
    });
    expect(screen.getByPlaceholderText(/type \/world/i)).toBeInTheDocument();

    await act(async () => {
      screen.getByLabelText(/close command launcher/i).click();
    });
    expect(screen.queryByPlaceholderText(/type \/world/i)).not.toBeInTheDocument();
  });
});
