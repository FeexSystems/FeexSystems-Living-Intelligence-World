import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CommandLauncher } from "@/landing/components/CommandLauncher";
import { resetAnnouncementRegions } from "@/lib/announcements";

/**
 * Phase F — command surface navigation (isolated).
 *
 * Verifies the launcher performs REAL router navigation rather than just closing
 * itself.
 *
 * NOTE ON APPROACH: react-router-dom v7's `useNavigate` does not flush a live
 * route transition under this project's jsdom + RTL setup (a minimal
 * `MemoryRouter` + `useNavigate` probe fails to re-render `<Routes>`). The
 * project's own integration suite works around the same limitation by asserting
 * navigation intent rather than live navigation — see
 * `client/test/integration/navigation-flow.test.tsx`, which asserts on `href`.
 *
 * The launcher renders `<button>` controls (not anchors), so we spy on
 * `useNavigate` and assert the target path. That verifies the contract that
 * actually matters: every shortcut maps to a real route string.
 */

const navigateSpy = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

/** Routes the launcher is contracted to reach. */
const PRESERVED_ROUTES = ["/world", "/navigator", "/omni", "/evidence"];

describe("CommandLauncher navigation", () => {
  function renderLauncher(onClose = () => {}) {
    return render(
      <MemoryRouter initialEntries={["/"]}>
        <CommandLauncher open onClose={onClose} />
      </MemoryRouter>
    );
  }

  it.each(PRESERVED_ROUTES)("navigates to %s when its shortcut is used", async (route) => {
    navigateSpy.mockClear();
    renderLauncher();

    await act(async () => {
      screen.getByRole("option", { name: route }).click();
    });

    expect(navigateSpy).toHaveBeenCalledWith(route);
  });

  it.each(["world", "/world", "WORLD"]) (
    "resolves the typed command %s to /world",
    async (typed) => {
      navigateSpy.mockClear();
      renderLauncher();

      const input = screen.getByLabelText(/command input/i);
      await act(async () => {
        fireEvent.change(input, { target: { value: typed } });
      });

      await act(async () => {
        fireEvent.submit(input);
      });

      expect(navigateSpy).toHaveBeenCalledWith("/world");
    }
  );

  it("does not navigate on an unrecognized command", async () => {
    navigateSpy.mockClear();
    renderLauncher();

    const input = screen.getByLabelText(/command input/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: "not-a-route" } });
    });

    await act(async () => {
      fireEvent.submit(input);
    });

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("closes itself after navigating", async () => {
    navigateSpy.mockClear();
    const onClose = vi.fn();
    renderLauncher(onClose);

    await act(async () => {
      screen.getByRole("option", { name: "/world" }).click();
    });

    expect(onClose).toHaveBeenCalled();
  });

  it("closes itself when Escape key is pressed", async () => {
    const onClose = vi.fn();
    renderLauncher(onClose);

    await act(async () => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(onClose).toHaveBeenCalled();
  });

  it("closes itself when clicking the backdrop", async () => {
    const onClose = vi.fn();
    renderLauncher(onClose);

    const backdrop = screen.getByTestId("command-launcher");
    await act(async () => {
      fireEvent.click(backdrop);
    });

    expect(onClose).toHaveBeenCalled();
  });
});

/**
 * Task 28 — the launcher closes on execution, so the outcome must be announced
 * for screen-reader users who lose the dialog from focus.
 */
describe("CommandLauncher announcements (Task 28)", () => {
  function renderLauncher() {
    return render(
      <MemoryRouter initialEntries={["/"]}>
        <CommandLauncher open onClose={() => {}} />
      </MemoryRouter>
    );
  }

  const politeRegion = () => document.getElementById("a11y-live-region-polite");
  const assertiveRegion = () => document.getElementById("a11y-live-region-assertive");

  beforeEach(() => {
    resetAnnouncementRegions();
  });

  afterEach(() => {
    resetAnnouncementRegions();
  });

  it("announces the destination when a shortcut is executed", async () => {
    navigateSpy.mockClear();
    renderLauncher();

    await act(async () => {
      screen.getByRole("option", { name: "/world" }).click();
    });

    expect(politeRegion()).toHaveTextContent("Navigating to /world");
  });

  it("announces the destination when a typed command is executed", async () => {
    navigateSpy.mockClear();
    renderLauncher();

    const input = screen.getByLabelText(/command input/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: "/navigator" } });
    });
    await act(async () => {
      fireEvent.submit(input);
    });

    expect(politeRegion()).toHaveTextContent("Navigating to /navigator");
  });

  it("announces an assertive error for an unrecognized command", async () => {
    navigateSpy.mockClear();
    renderLauncher();

    const input = screen.getByLabelText(/command input/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: "not-a-route" } });
    });
    await act(async () => {
      fireEvent.submit(input);
    });

    // Previously a silent no-op: the dialog stayed open with no explanation.
    expect(assertiveRegion()).toHaveTextContent("Unrecognized command: not-a-route");
  });

  it("does not announce when an empty command is submitted", async () => {
    navigateSpy.mockClear();
    renderLauncher();

    // Empty input falls back to the highlighted shortcut, so it navigates.
    const input = screen.getByLabelText(/command input/i);
    await act(async () => {
      fireEvent.submit(input);
    });

    expect(navigateSpy).toHaveBeenCalled();
    expect(assertiveRegion()?.textContent ?? "").toBe("");
  });
});
