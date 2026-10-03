import { describe, it, expect, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CommandLauncher } from "@/landing/components/CommandLauncher";

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
      screen.getByRole("button", { name: route }).click();
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
      screen.getByRole("button", { name: "/world" }).click();
    });

    expect(onClose).toHaveBeenCalled();
  });
});
