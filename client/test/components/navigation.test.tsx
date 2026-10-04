import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthNav, BackButton, Breadcrumbs, PageNav, WorldReturnBar } from "@/components/navigation";

// The global setup (client/test/setup.ts) stubs react-router-dom's location and
// navigation hooks. Override them locally with controllable spies, matching the
// pattern used by the other page suites in this repo.
const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockUseLocation(),
  };
});

const withRouter = (ui: ReactNode) => <MemoryRouter>{ui}</MemoryRouter>;

describe("navigation primitives", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue({ pathname: "/dashboard/devops", search: "", hash: "", state: null });
  });

  describe("Breadcrumbs", () => {
    it("renders ancestor return links plus the current page", () => {
      render(withRouter(<Breadcrumbs />));

      expect(screen.getByText("Home").closest("a")).toHaveAttribute("href", "/");
      expect(screen.getByText("Dashboard").closest("a")).toHaveAttribute("href", "/dashboard");
      expect(screen.getByText("DevOps")).toHaveAttribute("aria-current", "page");
    });

    it("renders nothing on the site root", () => {
      mockUseLocation.mockReturnValue({ pathname: "/", search: "", hash: "", state: null });
      const { container } = render(withRouter(<Breadcrumbs />));

      expect(container.firstChild).toBeNull();
    });
  });

  describe("BackButton", () => {
    it("routes to the fallback target when there is no in-app history", () => {
      mockUseLocation.mockReturnValue({ pathname: "/current", search: "", hash: "", state: null });
      render(withRouter(<BackButton to="/target" label="Back" />));

      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      expect(mockNavigate).toHaveBeenCalledWith("/target");
    });
  });

  describe("PageNav", () => {
    it("combines breadcrumbs with an explicit return control", () => {
      mockUseLocation.mockReturnValue({ pathname: "/profile", search: "", hash: "", state: null });
      render(withRouter(<PageNav backTo="/dashboard" backLabel="Dashboard" />));

      expect(screen.getByText("Home").closest("a")).toHaveAttribute("href", "/");
      expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
    });
  });

  describe("AuthNav", () => {
    it("exposes the brand, public surfaces and a return-to-home link", () => {
      render(withRouter(<AuthNav />));

      expect(screen.getByRole("link", { name: "FEEXSYSTEMS home" })).toHaveAttribute("href", "/");
      expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects");
      expect(screen.getByRole("link", { name: "Navigator" })).toHaveAttribute("href", "/navigator");
      expect(screen.getByRole("link", { name: "World" })).toHaveAttribute("href", "/world");
      expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    });
  });

  describe("WorldReturnBar", () => {
    it("guarantees an exit back to the overview plus lateral surface links", () => {
      render(withRouter(<WorldReturnBar />));

      expect(screen.getByRole("link", { name: /Return to Overview/i })).toHaveAttribute("href", "/");
      expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects");
      expect(screen.getByRole("link", { name: "Navigator" })).toHaveAttribute("href", "/navigator");
      expect(screen.getByRole("link", { name: "Omni" })).toHaveAttribute("href", "/omni");
      expect(screen.getByRole("link", { name: "Evidence" })).toHaveAttribute("href", "/evidence");
    });
  });
});

