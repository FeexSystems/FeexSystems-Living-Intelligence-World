import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Index from "@/pages/Index";

// Mock Three.js / WebGL heavy canvases in jsdom
vi.mock("@/components/webgl/StippledPointillistShape", () => ({
  default: () => <div data-testid="stippled-pointillist-canvas" />,
  StippledPointillistShape: () => <div data-testid="stippled-pointillist-canvas" />,
}));

vi.mock("@/components/webgl/ProjectMini3DCard", () => ({
  default: () => <div data-testid="project-mini-3d-mock" />,
  ProjectMini3DCard: () => <div data-testid="project-mini-3d-mock" />,
}));

vi.mock("@/components/framer/HeroTunnel", () => ({
  HeroTunnel: () => <div data-testid="hero-tunnel-mock" />,
}));

vi.mock("@/components/framer/WarpStarfield", () => ({
  WarpStarfield: () => <div data-testid="warp-starfield-mock" />,
}));

/**
 * The Sovereign Engine is a full-viewport WebGL/R3F scene. In jsdom its canvas
 * has no meaningful DOM, so it is stubbed with a stand-in that still exposes the
 * `onSwitchToDossier` control the page wires up. Without this stub the suite
 * could render the engine but never reach the dossier assertions.
 */
vi.mock("@/components/sovereign", () => ({
  FeexSovereignEngine: ({ onSwitchToDossier }: { onSwitchToDossier?: () => void }) => (
    <div data-testid="sovereign-engine">
      <button type="button" onClick={onSwitchToDossier}>
        Explore Technical Dossier
      </button>
    </div>
  ),
}));

/**
 * `/` now defaults to the 3D Sovereign Engine, so every dossier assertion must
 * first perform the dossier switch — exactly as a real visitor would.
 */
async function renderDossier() {
  const view = render(
    <MemoryRouter initialEntries={["/"]}>
      <Index />
    </MemoryRouter>
  );

  await act(async () => {
    screen.getByRole("button", { name: /Explore Technical Dossier/i }).click();
  });

  return view;
}

/** Renders the dossier through its shareable URL rather than a click. */
async function renderDossierDeepLink() {
  return render(
    <MemoryRouter initialEntries={["/?view=dossier"]}>
      <Index />
    </MemoryRouter>
  );
}

describe("Landing Page (Index.tsx) Verification", () => {
  it("deep-links the dossier via ?view=dossier without clicking through the engine", async () => {
    await act(async () => {
      await renderDossierDeepLink();
    });

    // Straight into the marketing page — the engine must not gate this.
    expect(screen.getByText(/Building the Systems Behind/i)).toBeInTheDocument();
    expect(screen.queryByTestId("sovereign-engine")).not.toBeInTheDocument();
  });

  it("ignores an unrecognized view param and stays on the engine", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/?view=galaxy"]}>
          <Index />
        </MemoryRouter>
      );
    });

    expect(screen.getByTestId("sovereign-engine")).toBeInTheDocument();
  });

  it("opens on the 3D Sovereign Engine by default", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Index />
        </MemoryRouter>
      );
    });

    // Default view is the immersive engine, NOT the marketing dossier.
    expect(screen.getByTestId("sovereign-engine")).toBeInTheDocument();
    expect(screen.queryByText(/Building the Systems Behind/i)).not.toBeInTheDocument();
  });

  it("switches to the dossier landing page and back to the engine", async () => {
    await renderDossier();

    expect(screen.getByText(/Building the Systems Behind/i)).toBeInTheDocument();
    expect(screen.queryByTestId("sovereign-engine")).not.toBeInTheDocument();

    await act(async () => {
      screen.getByRole("button", { name: /Launch 3D Universe/i }).click();
    });

    expect(screen.getByTestId("sovereign-engine")).toBeInTheDocument();
  });

  it("renders Hero headline, sub-headline and primary CTA", async () => {
    await renderDossier();

    expect(screen.getByText(/Building the Systems Behind/i)).toBeInTheDocument();
    // "Tomorrow's Intelligence." is rendered through TextScrambleMorph, so the
    // sub-headline thesis is the stable assertion for this stage.
    expect(screen.getByText(/We engineer intelligent digital ecosystems/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore FeexSystems/i)).toBeInTheDocument();
    expect(screen.getByText(/100% Deterministic Grounding/i)).toBeInTheDocument();
  });

  it("renders Section // Our Core Principle framing", async () => {
    await renderDossier();

    expect(screen.getByText(/We Build Systems, Not Just Applications/i)).toBeInTheDocument();
    expect(screen.getByText(/OUR CORE PRINCIPLE/i)).toBeInTheDocument();
  });

  it("renders Section // 01 Philosophy and Section // 02 Architecture", async () => {
    await renderDossier();

    expect(screen.getByText(/Intelligence Is an Ecosystem/i)).toBeInTheDocument();
    expect(screen.getByText(/The Spectrum of Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText("Canonical Databases")).toBeInTheDocument();
    expect(screen.getByText("Evidence Fabrics")).toBeInTheDocument();
  });

  it("renders pricing tiers and enterprise plans", async () => {
    await renderDossier();

    expect(screen.getByText("Community Explorer")).toBeInTheDocument();
    expect(screen.getByText("Engineer Pro")).toBeInTheDocument();
    expect(screen.getByText("Enterprise Sovereign")).toBeInTheDocument();
  });

  it("renders FAQ section with anti-hallucination answers", async () => {
    await renderDossier();

    expect(
      screen.getByText(/How does FeexSystems prevent AI hallucinations\?/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Does FeexSystems train AI models on our proprietary source code\?/i)
    ).toBeInTheDocument();
  });

  it("renders final CTA block with FeexSystems dual-mode routing links", async () => {
    await renderDossier();

    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));

    expect(hrefs).toContain("/world");
    expect(hrefs).toContain("/omni");
    expect(hrefs).toContain("/projects");
    expect(hrefs).toContain("/register");
  });
});
