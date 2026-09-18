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

describe("Landing Page (Index.tsx) Verification", () => {
  it("renders Hero headline, sub-headline and primary CTA", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Index />
        </MemoryRouter>
      );
    });

    expect(screen.getByText(/Building the Systems Behind/i)).toBeInTheDocument();
    // "Tomorrow's Intelligence." is rendered through TextScrambleMorph, so the
    // sub-headline thesis is the stable assertion for this stage.
    expect(screen.getByText(/We engineer intelligent digital ecosystems/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore FeexSystems/i)).toBeInTheDocument();
    expect(screen.getByText(/100% Deterministic Grounding/i)).toBeInTheDocument();
  });

  it("renders Section // Our Core Principle framing", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Index />
        </MemoryRouter>
      );
    });

    expect(screen.getByText(/We Build Systems, Not Just Applications/i)).toBeInTheDocument();
    expect(screen.getByText(/OUR CORE PRINCIPLE/i)).toBeInTheDocument();
  });

  it("renders Section // 01 Philosophy and Section // 02 Architecture", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Index />
        </MemoryRouter>
      );
    });

    expect(screen.getByText(/Intelligence Is an Ecosystem/i)).toBeInTheDocument();
    expect(screen.getByText(/The Spectrum of Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText("Canonical Databases")).toBeInTheDocument();
    expect(screen.getByText("Evidence Fabrics")).toBeInTheDocument();
  });

  it("renders pricing tiers and enterprise plans", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Index />
        </MemoryRouter>
      );
    });

    expect(screen.getByText("Community Explorer")).toBeInTheDocument();
    expect(screen.getByText("Engineer Pro")).toBeInTheDocument();
    expect(screen.getByText("Enterprise Sovereign")).toBeInTheDocument();
  });

  it("renders FAQ section with anti-hallucination answers", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Index />
        </MemoryRouter>
      );
    });

    expect(
      screen.getByText(/How does FeexSystems prevent AI hallucinations\?/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Does FeexSystems train AI models on our proprietary source code\?/i)
    ).toBeInTheDocument();
  });

  it("renders final CTA block with FeexSystems dual-mode routing links", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Index />
        </MemoryRouter>
      );
    });

    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));

    expect(hrefs).toContain("/world");
    expect(hrefs).toContain("/omni");
    expect(hrefs).toContain("/projects");
    expect(hrefs).toContain("/register");
  });
});
