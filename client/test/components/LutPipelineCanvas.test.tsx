import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import * as THREE from "three";
import {
  LutPipelineCanvas,
  computeCoverTransform,
} from "@/components/LutPipelineCanvas";

/**
 * Shared store so tests can inspect the ShaderMaterial/uniforms that the
 * mocked `shaderMaterial` intrinsic creates.
 */
const { shaderMaterialStore } = vi.hoisted(() => ({
  shaderMaterialStore: { entries: [] as Array<{ uniforms: any; material: any }> },
}));

/**
 * Mock @react-three/fiber for the jsdom context.
 *
 * `useFrame` is a no-op (there is no WebGL loop in jsdom) and `useThree`
 * returns a fixed viewport. The R3F intrinsics (`mesh`, `planeGeometry`,
 * `shaderMaterial`) are re-implemented here because the real ones only exist
 * inside a WebGL reconciler: `shaderMaterial` creates a *real*
 * `THREE.ShaderMaterial` and disposes it on unmount, which is what lets the
 * cleanup test assert `ShaderMaterial.prototype.dispose()`.
 */
vi.mock("@react-three/fiber", async () => {
  const React = await import("react");
  const THREE = await import("three");

  return {
    Canvas: ({ children, className, frameloop }: any) => (
      <div
        data-testid="r3f-canvas"
        data-frameloop={frameloop}
        className={className}
      >
        {children}
      </div>
    ),
    useFrame: vi.fn(),
    useThree: vi.fn(() => ({ viewport: { width: 800, height: 600 } })),
    mesh: ({ children }: any) => React.createElement("group", null, children),
    planeGeometry: () => null,
    shaderMaterial: (props: any) => {
      React.useEffect(() => {
        const material = new THREE.ShaderMaterial({
          vertexShader: props.vertexShader,
          fragmentShader: props.fragmentShader,
          uniforms: props.uniforms,
        });
        if (props.ref) props.ref.current = material;
        shaderMaterialStore.entries.push({
          uniforms: props.uniforms,
          material,
        });
        return () => material.dispose();
      }, []);
      return null;
    },
  };
});

/**
 * IntersectionObserver double that records instances so a test can drive the
 * callback with a synthetic entry.
 */
class MockIntersectionObserver implements IntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  disconnected = false;
  observed: Element[] = [];

  constructor(
    private readonly callback: IntersectionObserverCallback,
    public readonly options?: IntersectionObserverInit
  ) {
    MockIntersectionObserver.instances.push(this);
  }

  observe(el: Element) {
    this.observed.push(el);
  }

  unobserve(el: Element) {
    this.observed = this.observed.filter((entry) => entry !== el);
  }

  disconnect() {
    this.disconnected = true;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  trigger(entry: Partial<IntersectionObserverEntry>) {
    const target = this.observed[0] ?? document.body;
    this.callback(
      [
        {
          isIntersecting: false,
          intersectionRatio: 0,
          time: 0,
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRect: target.getBoundingClientRect(),
          rootBounds: null,
          target,
          ...entry,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver
    );
  }
}

describe("LutPipelineCanvas Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
    MockIntersectionObserver.instances = [];
    Object.defineProperty(window, "IntersectionObserver", {
      writable: true,
      configurable: true,
      value: MockIntersectionObserver,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
        lutMap="/media/feex/lut-cinematic-16.webp"
        lutIntensity={0.65}
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

  it("computes a cover transform that crops the overflowing axis", () => {
    // Container wider than the video (16:9 vs 9:16) -> Y is scaled, X untouched.
    expect(computeCoverTransform(1920, 1080, 1080, 1920)).toEqual({
      sx: 1,
      sy: 0.31640625,
      ox: 0,
      oy: 0.341796875,
    });

    // Container taller than the video (9:16 vs 16:9) -> X is scaled, Y untouched.
    expect(computeCoverTransform(1080, 1920, 1920, 1080)).toEqual({
      sx: 0.31640625,
      sy: 1,
      ox: 0.341796875,
      oy: 0,
    });

    // Identical aspect ratios -> identity transform.
    expect(computeCoverTransform(1000, 500, 2000, 1000)).toEqual({
      sx: 1,
      sy: 1,
      ox: 0,
      oy: 0,
    });

    // Degenerate input must not produce NaN.
    const degenerate = computeCoverTransform(0, 0, 0, 0);
    expect(degenerate).toEqual({ sx: 1, sy: 1, ox: 0, oy: 0 });
    expect(Number.isNaN(degenerate.sx)).toBe(false);
    expect(Number.isNaN(degenerate.sy)).toBe(false);
  });

  it("observes the container with a 0.25 threshold and gates the frameloop on visibility", () => {
    render(
      <LutPipelineCanvas
        src="/media/feex/feex-robotics.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
      />
    );

    const observer = MockIntersectionObserver.instances.at(-1);
    expect(observer).toBeDefined();
    expect(observer?.options).toEqual({ threshold: 0.25 });
    expect(observer?.observed).toHaveLength(1);

    // The frameloop is "always" while the hero is on screen.
    expect(screen.getByTestId("r3f-canvas")).toHaveAttribute(
      "data-frameloop",
      "always"
    );

    // Scrolling the hero out of view stops the render loop.
    act(() => {
      observer?.trigger({ isIntersecting: false, intersectionRatio: 0 });
    });

    expect(screen.getByTestId("r3f-canvas")).toHaveAttribute(
      "data-frameloop",
      "never"
    );
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

  it("pauses the video when the hero leaves the viewport and resumes it on re-entry", () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play");
    const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, "pause");

    render(
      <LutPipelineCanvas
        src="/media/feex/feex-robotics.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
      />
    );

    const observer = MockIntersectionObserver.instances.at(-1);
    playSpy.mockClear();
    pauseSpy.mockClear();

    act(() => {
      observer?.trigger({ isIntersecting: false, intersectionRatio: 0 });
    });
    expect(pauseSpy).toHaveBeenCalled();

    act(() => {
      observer?.trigger({ isIntersecting: true, intersectionRatio: 0.8 });
    });
    expect(playSpy).toHaveBeenCalled();
  });

  it("does not resume playback when the hero re-enters after the user paused", () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play");

    render(
      <LutPipelineCanvas
        src="/media/feex/feex-robotics.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
      />
    );

    const observer = MockIntersectionObserver.instances.at(-1);

    // The user pauses via the accessible control.
    fireEvent.click(screen.getByRole("button", { name: /pause background motion/i }));
    playSpy.mockClear();

    act(() => {
      observer?.trigger({ isIntersecting: false, intersectionRatio: 0 });
    });
    act(() => {
      observer?.trigger({ isIntersecting: true, intersectionRatio: 0.9 });
    });

    expect(playSpy).not.toHaveBeenCalled();
  });

  it("renders an accessible motion toggle that flips the pause state", () => {
    render(
      <LutPipelineCanvas
        src="/media/feex/feex-robotics.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
        controlsLabel="Cinematic background"
      />
    );

    const toggle = screen.getByRole("button", { name: "Pause Cinematic background" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);

    const resume = screen.getByRole("button", { name: "Play Cinematic background" });
    expect(resume).toHaveAttribute("aria-pressed", "true");
  });

  it("hides the motion toggle when showPauseControl is false", () => {
    render(
      <LutPipelineCanvas
        src="/media/feex/feex-robotics.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
        showPauseControl={false}
      />
    );

    expect(
      screen.queryByRole("button", { name: /background motion/i })
    ).not.toBeInTheDocument();
  });

  it("falls back to the static poster when the video element raises an error", () => {
    // The <video> is created imperatively (document.createElement) and used as a
    // texture source, so it is never appended to the React tree. Capture it by
    // intercepting the factory.
    let captured: HTMLVideoElement | null = null;
    const originalCreateElement = document.createElement.bind(document);
    const createSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tag: any, options?: any) => {
        const el = originalCreateElement(tag, options);
        if (tag === "video") captured = el as HTMLVideoElement;
        return el;
      });

    const { container } = render(
      <LutPipelineCanvas
        src="/media/feex/feex-robotics.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
        ariaLabel="LUT Error Hero"
      />
    );

    createSpy.mockRestore();

    expect(captured).not.toBeNull();
    expect(container.querySelector(".hero-poster-static")).not.toBeInTheDocument();

    act(() => {
      captured?.dispatchEvent(new Event("error"));
    });

    expect(container.querySelector(".hero-poster-static")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "LUT Error Hero" })).toBeInTheDocument();
  });
});
