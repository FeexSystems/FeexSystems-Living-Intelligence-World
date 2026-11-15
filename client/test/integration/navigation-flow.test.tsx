import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TestWrapper } from "../utils/test-utils";
import Projects from "@/pages/Projects";
import OmniCommandPage from "@/pages/OmniCommand";
import Navigator from "@/pages/Navigator";
import EvidenceExplorer from "@/pages/EvidenceExplorer";

// Mock the R3F runtime itself. `@react-three/fiber@8` bundles
// react-reconciler@0.27, which reads React 18 internals and throws
// "Cannot read properties of undefined (reading 'ReactCurrentOwner')" on
// import under React 19. That happens at module-evaluation time, before any
// component-level mock can help, so the package itself has to be stubbed.
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: () => undefined,
  useThree: () => ({ gl: {}, scene: {}, camera: {}, size: { width: 0, height: 0 } }),
  createPortal: (children: React.ReactNode) => children,
  extend: () => undefined,
}));

vi.mock("@react-three/drei", () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return {
    OrbitControls: () => null,
    Float: Stub,
    Edges: () => null,
    Stars: () => null,
    Html: Stub,
    Sparkles: () => null,
    Trail: () => null,
    PresentationControls: Stub,
    Sphere: Stub,
    Line: () => null,
    Billboard: Stub,
  };
});

// Mock WebGL components for jsdom environment
vi.mock("@/components/webgl/DreiProjectsHero", () => ({
  default: () => <div data-testid="drei-projects-hero-mock" />,
  DreiProjectsHero: () => <div data-testid="drei-projects-hero-mock" />,
}));

vi.mock("@/components/webgl/DreiNavigatorHero", () => ({
  default: () => <div data-testid="drei-navigator-hero-mock" />,
  DreiNavigatorHero: () => <div data-testid="drei-navigator-hero-mock" />,
}));

vi.mock("@/components/webgl/ProjectMini3DCard", () => ({
  default: () => <div data-testid="project-mini-3d-mock" />,
  ProjectMini3DCard: () => <div data-testid="project-mini-3d-mock" />,
}));

describe("Public Dual-Mode Navigation Flow & Design System", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/api/world-model/projects")) {
          return {
            ok: true,
            json: async () => ({ success: true, projects: [] }),
          };
        }
        if (url.includes("/api/world-model/navigator")) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: {
                query: "test",
                explanation: "Mock grounded retrieval explanation",
                projects: [],
                technologies: [],
                artifacts: [],
              },
            }),
          };
        }
        if (url.includes("/api/world-model/evidence/projects")) {
          return {
            ok: true,
            json: async () => ({ success: true, data: [] }),
          };
        }
        if (url.includes("/api/world-model/evidence/detail")) {
          return {
            ok: true,
            json: async () => ({ success: true, data: { artifacts: [], evidence: [], events: [], technologies: [] } }),
          };
        }
        if (url.includes("/api/world-model/evidence/content")) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: {
                content: "// verified content",
                verified: true,
                expectedSha: "sha-test",
              },
            }),
          };
        }
        if (url.includes("/health")) {
          return {
            ok: true,
            json: async () => ({ status: "healthy", uptime: 100 }),
          };
        }
        return {
          ok: true,
          json: async () => ({ success: true }),
        };
      })
    );
  });

  it("renders Omni Command link in Projects navigation header", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/projects"]}>
          <TestWrapper>
            <Projects />
          </TestWrapper>
        </MemoryRouter>
      );
    });

    const omniLinks = screen.getAllByRole("link").filter((l) => l.getAttribute("href") === "/omni");
    expect(omniLinks.length).toBeGreaterThan(0);
    expect(omniLinks[0].textContent).toContain("Omni Command");
  });

  it("renders deep-link action to Omni-Command on project items", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/projects"]}>
          <TestWrapper>
            <Projects />
          </TestWrapper>
        </MemoryRouter>
      );
    });

    const deepLinks = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("href")?.startsWith("/omni?q="));
    expect(deepLinks.length).toBeGreaterThan(0);
  });

  it("renders OmniCommandPage with Signal design tokens and navigation links", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/omni"]}>
          <TestWrapper>
            <OmniCommandPage />
          </TestWrapper>
        </MemoryRouter>
      );
    });

    // Check header links
    const projectLink = screen.getAllByRole("link").find((l) => l.getAttribute("href") === "/projects");
    expect(projectLink).toBeDefined();

    const navLink = screen.getAllByRole("link").find((l) => l.getAttribute("href") === "/navigator");
    expect(navLink).toBeDefined();

    const worldLink = screen.getAllByRole("link").find((l) => l.getAttribute("href") === "/world");
    expect(worldLink).toBeDefined();

    // Check empty stage rendered with technical category marker
    expect(screen.getByText(/ORCHESTRATION STAGE/i)).toBeInTheDocument();
  });

  it("renders Navigator with Signal typography and dual mode navigation", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/navigator"]}>
          <TestWrapper>
            <Navigator />
          </TestWrapper>
        </MemoryRouter>
      );
    });

    expect(screen.getByText(/AI Navigator/i)).toBeInTheDocument();
    const omniLinks = screen.getAllByRole("link").filter((l) => l.getAttribute("href") === "/omni");
    expect(omniLinks.length).toBeGreaterThan(0);
  });

  it("renders EvidenceExplorer with 3-column workbench and verified provenance headers", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/evidence"]}>
          <TestWrapper>
            <EvidenceExplorer />
          </TestWrapper>
        </MemoryRouter>
      );
    });

    expect(screen.getAllByText(/\/\/ EVIDENCE FABRIC/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/\/\/ Evidence Ledger/i)).toBeInTheDocument();
  });
});