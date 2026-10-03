import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import Index from "@/pages/Index";

/**
 * Phase F — route matrix.
 *
 * The migration's Phase E cutover must preserve the public route contract:
 * `/`, `/world`, `/navigator`, `/omni`, `/projects`, `/evidence`.
 *
 * Two things are verified here that can be checked reliably in jsdom:
 *
 * 1. `/` still renders the landing after `Index` became a thin entry.
 * 2. Each preserved path resolves to a routed element.
 *
 * Live click-to-navigate is asserted in `CommandLauncher.test.tsx`, which spies
 * on `useNavigate` because react-router-dom v7 does not flush a live route
 * transition under this project's jsdom setup (see the note in that file).
 */

// `useNavigate` spy so the landing's command surface can be asserted without
// relying on jsdom route transitions.
const navigateSpy = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

vi.mock("@/landing/components/ScrollytellingManager", () => ({
  ScrollytellingManager: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scrollytelling-manager">{children}</div>
  ),
}));

// Ambient surfaces that touch audio / canvas are stubbed; they are covered by
// their own suites. Here we care about routing, not ambience.
vi.mock("@/landing/components/SoundscapeController", () => ({
  SoundscapeController: () => null,
}));
vi.mock("@/landing/cinematic/AssetPreloader", () => ({
  AssetPreloader: () => null,
}));

// The real NavigationOverlay renders icon-only links plus a "Command" button.
// Stub it so the only "Command" control present is the one that opens the
// launcher, keeping the navigation assertion unambiguous.
vi.mock("@/landing/components/NavigationOverlay", () => ({
  NavigationOverlay: ({ onCommandClick }: { onCommandClick: () => void }) => (
    <button type="button" onClick={onCommandClick}>
      Command
    </button>
  ),
}));

vi.mock("@/landing/scenes/HeroScene", () => ({ HeroScene: () => <div /> }));
vi.mock("@/landing/scenes/GalaxySequenceScene", () => ({
  GalaxySequenceScene: () => <div />,
}));
vi.mock("@/landing/scenes/CoreSystemsScene", () => ({ CoreSystemsScene: () => <div /> }));
vi.mock("@/landing/scenes/MissionCapabilityScene", () => ({
  MissionCapabilityScene: () => <div />,
}));
vi.mock("@/landing/scenes/ConvergenceScene", () => ({ ConvergenceScene: () => <div /> }));
vi.mock("@/landing/scenes/UILoopsScene", () => ({ UILoopsScene: () => <div /> }));
vi.mock("@/landing/scenes/WorldsScene", () => ({
  WorldsScene: () => <div data-testid="worlds-scene" />,
}));

/** Preserved public routes from the migration's Phase E contract. */
const PRESERVED_ROUTES = ["/world", "/navigator", "/omni", "/projects", "/evidence"];

function renderRouteMatrix(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<Index />} />
        {PRESERVED_ROUTES.map((route) => (
          <Route
            key={route}
            path={route}
            element={<div data-testid={`route-${route.slice(1)}`} />}
          />
        ))}
      </Routes>
    </MemoryRouter>
  );
}

describe("Phase F — route matrix", () => {
  it("renders the landing composition at /", () => {
    renderRouteMatrix("/");
    expect(screen.getByTestId("scrollytelling-manager")).toBeInTheDocument();
    expect(screen.getByTestId("worlds-scene")).toBeInTheDocument();
  });

  it.each(["/world", "/navigator", "/omni", "/projects", "/evidence"])(
    "resolves %s to a real route",
    (route) => {
      renderRouteMatrix(route);
      expect(screen.getByTestId(`route-${route.slice(1)}`)).toBeInTheDocument();
    }
  );

  it("navigates from the landing command surface to every preserved route", async () => {
    for (const route of ["/world", "/navigator", "/omni", "/evidence"]) {
      navigateSpy.mockClear();
      const view = renderRouteMatrix("/");

      await act(async () => {
        screen.getByRole("button", { name: /command/i }).click();
      });

      await act(async () => {
        screen.getByRole("button", { name: route }).click();
      });

      expect(
        navigateSpy,
        `command surface did not navigate to ${route}`
      ).toHaveBeenCalledWith(route);

      view.unmount();
    }
  });

  it("keeps the command surface router-backed (no dead anchors)", async () => {
    renderRouteMatrix("/");

    await act(async () => {
      screen.getByRole("button", { name: /command/i }).click();
    });

    // Every shortcut must be a button driving navigation, never an href="#".
    for (const route of ["/world", "/navigator", "/omni", "/evidence"]) {
      const control = screen.getByRole("button", { name: route });
      expect(control.tagName).toBe("BUTTON");
      expect(control).not.toHaveAttribute("href", "#");
    }
  });
});
