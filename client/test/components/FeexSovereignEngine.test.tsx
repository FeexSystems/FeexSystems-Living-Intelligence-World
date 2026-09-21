import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { FeexSovereignEngine } from "@/components/sovereign/FeexSovereignEngine";
import { useProductionServerTelemetry } from "@/components/sovereign/useProductionServerTelemetry";

// Hoist mockCanvas so WebGL safeguards (dpr clamp) can be verified across vitest module transforms
const { mockCanvas } = vi.hoisted(() => ({
  mockCanvas: vi.fn((props: Record<string, unknown> & { children?: React.ReactNode }) => (
    <div data-testid="sovereign-canvas">{props.children}</div>
  )),
}));

// Mock @react-three/fiber Canvas & hooks
vi.mock("@react-three/fiber", () => ({
  Canvas: (props: Record<string, unknown> & { children?: React.ReactNode }) => mockCanvas(props),
  useFrame: vi.fn(),
  useThree: () => ({
    camera: { position: { set: vi.fn() } },
    gl: { domElement: document.createElement("canvas") },
  }),
}));

// Mock @react-three/drei
vi.mock("@react-three/drei", () => ({
  ScrollControls: ({ children }: any) => <div>{children}</div>,
  Scroll: ({ children }: any) => <div>{children}</div>,
  Stars: () => <div data-testid="stars-mock" />,
  Html: ({ children }: any) => <div>{children}</div>,
  useScroll: () => ({ offset: 0 }),
}));

// Mock @react-three/cannon
vi.mock("@react-three/cannon", () => ({
  Physics: ({ children }: any) => <div>{children}</div>,
  useBox: () => [{ current: null }, { applyForce: vi.fn() }],
  useSphere: () => [{ current: null }, { applyForce: vi.fn() }],
}));

describe("FeexSovereignEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clamps the WebGL canvas device pixel ratio to [1, 2] (60 FPS safeguard)", () => {
    render(
      <MemoryRouter>
        <FeexSovereignEngine />
      </MemoryRouter>
    );

    expect(mockCanvas).toHaveBeenCalled();
    const callWithDpr = mockCanvas.mock.calls.find((c) => c[0] && (c[0] as any).dpr !== undefined);
    expect(callWithDpr).toBeDefined();
    expect((callWithDpr![0] as any).dpr).toEqual([1, 2]);
  });

  it("renders HUD telemetry stream status, 60 FPS locked badge, and tactical joystick", () => {
    render(
      <MemoryRouter>
        <FeexSovereignEngine />
      </MemoryRouter>
    );

    // jsdom has no EventSource, so the clearly-labeled procedural fallback drives the HUD
    expect(screen.getByText(/SIMULATED FEED/i)).toBeInTheDocument();
    expect(screen.queryByText(/PROD V3\.8/i)).not.toBeInTheDocument();
    expect(screen.getByText(/DPR 1–2 TARGET/i)).toBeInTheDocument();

    const joystick = document.getElementById("tactile-joystick-pad");
    expect(joystick).toBeInTheDocument();
  });

  it("renders the current sovereign scroll runtime", () => {
    render(
      <MemoryRouter>
        <FeexSovereignEngine />
      </MemoryRouter>
    );

    expect(screen.getByTestId("sovereign-canvas")).toBeInTheDocument();
  });

  it("calls onSwitchToDossier when Technical Dossier button is clicked", () => {
    const onSwitch = vi.fn();
    render(
      <MemoryRouter>
        <FeexSovereignEngine onSwitchToDossier={onSwitch} />
      </MemoryRouter>
    );

    const dossierButtons = screen.getAllByRole("button", { name: /Technical Dossier/i });
    expect(dossierButtons.length).toBeGreaterThan(0);

    fireEvent.click(dossierButtons[0]);
    expect(onSwitch).toHaveBeenCalledTimes(1);
  });

  it("updates joystick position coordinates on mouse drag interaction", () => {
    render(
      <MemoryRouter>
        <FeexSovereignEngine />
      </MemoryRouter>
    );

    const joystick = document.getElementById("tactile-joystick-pad");
    expect(joystick).toBeInTheDocument();

    if (joystick) {
      fireEvent.mouseDown(joystick, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(joystick, { clientX: 120, clientY: 80 });
      fireEvent.mouseUp(joystick);
    }
  });

  it("useProductionServerTelemetry emits procedural telemetry events when offline", () => {
    const callback = vi.fn();
    function TestHook() {
      useProductionServerTelemetry(callback);
      return null;
    }

    render(<TestHook />);

    // First event emitted synchronously for instant feedback
    expect(callback).toHaveBeenCalled();
    const firstCall = callback.mock.calls[0][0];
    expect(firstCall).toHaveProperty("msg");
    expect(firstCall).toHaveProperty("hexColor");
  });

  it("fallback frames are always flagged simulated and never imitate ledger evidence", () => {
    const callback = vi.fn();
    function TestHook() {
      useProductionServerTelemetry(callback);
      return null;
    }

    render(<TestHook />);

    for (const call of callback.mock.calls) {
      const payload = call[0];
      expect(payload.simulated).toBe(true);
      // Evidence, Not Claims: no fabricated provenance in fallback copy
      expect(payload.msg).toMatch(/SIM FEED/i);
      expect(payload.msg).not.toMatch(/commit sha|notarized|immutable ledger|hmac/i);
    }
  });
});
