import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MarketingCommandCenter from "@/pages/dashboard/marketing";

// DashboardLayout pulls in auth/notification/realtime providers that are not
// relevant to this page's behaviour — render children only.
vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

const getMock = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MarketingCommandCenter />
    </QueryClientProvider>
  );
}

describe("MarketingCommandCenter", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("renders the heading and engine summary cards", () => {
    getMock.mockResolvedValue({ success: true, data: [] });
    renderPage();

    expect(screen.getByText("Marketing Command Center")).toBeInTheDocument();
    expect(screen.getByText("Content Gaps")).toBeInTheDocument();
    expect(screen.getByText("Decaying Assets")).toBeInTheDocument();
    // "Opportunities" appears as both a summary card title and a tab trigger.
    expect(screen.getAllByText("Opportunities").length).toBeGreaterThan(0);
  });

  it("calls all three intelligence endpoints", async () => {
    getMock.mockResolvedValue({ success: true, data: [] });
    renderPage();

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/marketing/intelligence/gaps");
      expect(getMock).toHaveBeenCalledWith(
        "/marketing/intelligence/decay?thresholdDays=30"
      );
      expect(getMock).toHaveBeenCalledWith(
        "/marketing/intelligence/opportunities"
      );
    });
  });

  it("unwraps the { success, data } envelope and renders gap results", async () => {
    getMock.mockImplementation((endpoint: string) => {
      if (endpoint === "/marketing/intelligence/gaps") {
        return Promise.resolve({
          success: true,
          data: [
            {
              productId: "prod_1",
              productName: "HoloKai Systems",
              projectId: "proj_1",
              featuresCount: 3,
              gapScore: 0.85,
            },
          ],
        });
      }
      return Promise.resolve({ success: true, data: [] });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("HoloKai Systems")).toBeInTheDocument();
    });
    expect(screen.getByText("Score 0.85")).toBeInTheDocument();
    expect(screen.getByText(/3 features with no marketing assets/)).toBeInTheDocument();
  });

  it("shows the gap empty state when no gaps are returned", async () => {
    getMock.mockResolvedValue({ success: true, data: [] });
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("No content gaps detected. Every product has coverage.")
      ).toBeInTheDocument();
    });
  });

  it("surfaces an error state when the endpoint fails", async () => {
    getMock.mockRejectedValue(new Error("Graph fetch failed: 500"));
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("Graph fetch failed: 500").length).toBeGreaterThan(0);
    });
  });
});
