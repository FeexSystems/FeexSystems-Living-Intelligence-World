import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LutPipelineCanvas } from "@/components/LutPipelineCanvas";

// Mock @react-three/fiber Canvas for jsdom context
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children, className }: any) => (
    <div data-testid="r3f-canvas" className={className}>
      {children}
    </div>
  ),
  useFrame: vi.fn(),
}));

describe("LutPipelineCanvas Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = vi.fn();
    HTMLMediaElement.prototype.load = vi.fn();
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("never mounts R3F Canvas or video when prefers-reduced-motion: reduce is active", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(
      <LutPipelineCanvas
        src="/media/feex/feex-robotics.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
        ariaLabel="Reduced Motion Primary Hero"
      />
    );

    // Canvas must NOT be mounted
    expect(screen.queryByTestId("r3f-canvas")).not.toBeInTheDocument();

    // Static poster fallback must be rendered
    const posterStatic = container.querySelector(".hero-poster-static");
    expect(posterStatic).toBeInTheDocument();
    expect(posterStatic).toHaveStyle({
      backgroundImage: "url(/media/feex/feex-robotics-poster.webp)",
    });
    expect(screen.getByRole("img", { name: "Reduced Motion Primary Hero" })).toBeInTheDocument();
  });

  it("mounts canvas with 16³ LUT pipeline under standard motion", () => {
    const { container } = render(
      <LutPipelineCanvas
        src="/media/feex/feex-robotics.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
        lutSrc="/media/feex/lut-cinematic-16.png"
        defaultIntensity={0.65}
        mask="radial"
      />
    );

    // Check that canvas is mounted
    const canvas = screen.getByTestId("r3f-canvas");
    expect(canvas).toBeInTheDocument();

    // Check radial mask and vignette overlay
    const heroCanvas = container.querySelector(".hero-canvas");
    expect(heroCanvas).toHaveClass("hero-mask-radial");
    const vignette = container.querySelector(".bg-vignette-cinema");
    expect(vignette).toBeInTheDocument();
  });

  it("supports linear mask option", () => {
    const { container } = render(
      <LutPipelineCanvas
        src="/media/feex/feex-robotics.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
        mask="linear"
      />
    );

    const heroCanvas = container.querySelector(".hero-canvas");
    expect(heroCanvas).toHaveClass("hero-mask-linear");
  });

  it("cleans up video resources on unmount", () => {
    const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const loadSpy = vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});

    const { unmount } = render(
      <LutPipelineCanvas
        src="/media/feex/feex-robotics.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
      />
    );

    unmount();

    expect(pauseSpy).toHaveBeenCalled();
    expect(loadSpy).toHaveBeenCalled();

    pauseSpy.mockRestore();
    loadSpy.mockRestore();
  });
});
