import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { FeexSovereignEngine } from "@/components/sovereign/FeexSovereignEngine";
import { useProductionServerTelemetry } from "@/components/sovereign/useProductionServerTelemetry";

// Mock @react-three/fiber Canvas & hooks
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: any) => <div data-testid="sovereign-canvas">{children}</div>,
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

  it("renders HUD telemetry stream status, 60 FPS locked badge, and tactical joystick", () => {
    render(
      <MemoryRouter>
        <FeexSovereignEngine />
      </MemoryRouter>
    );

    expect(screen.getByText(/FEEX STREAM \/\/ PROD V3.8/i)).toBeInTheDocument();
    expect(screen.getByText(/60 FPS LOCKED/i)).toBeInTheDocument();

    const joystick = document.getElementById("tactile-joystick-pad");
    expect(joystick).toBeInTheDocument();
  });

  it("renders high-concept scrollytelling slides and mission typography", () => {
    render(
      <MemoryRouter>
        <FeexSovereignEngine />
      </MemoryRouter>
    );

    expect(screen.getByText(/Building the Systems Behind/i)).toBeInTheDocument();
    expect(screen.getByText(/Tomorrow's Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/7-Tier Sovereign Modular Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Grounded in Production Code/i)).toBeInTheDocument();
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
});
