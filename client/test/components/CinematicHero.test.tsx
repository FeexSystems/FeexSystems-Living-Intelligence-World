import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CinematicHero } from "@/components/CinematicHero";

const VIDEO_SRC = "/media/feex/feex-robotics.mp4";
const POSTER = "/media/feex/feex-robotics-poster.webp";

/**
 * IntersectionObserver double that records its instances so a test can assert
 * the real options object (`{ threshold: 0.25 }`) and the observed element,
 * and can drive the callback with a synthetic entry.
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

  /** Drive the observer callback with a synthetic intersection entry. */
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

/**
 * Controllable `prefers-reduced-motion` query. `setReduced()` flips the
 * matched value and notifies listeners, which is how the real
 * `MediaQueryList` behaves.
 */
function installMatchMedia(initialReduced: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mql = {
    matches: initialReduced,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: vi.fn((type: string, cb: (event: MediaQueryListEvent) => void) => {
      if (type === "change") listeners.add(cb);
    }),
    removeEventListener: vi.fn((type: string, cb: (event: MediaQueryListEvent) => void) => {
      if (type === "change") listeners.delete(cb);
    }),
    addListener: vi.fn((cb: (event: MediaQueryListEvent) => void) => listeners.add(cb)),
    removeListener: vi.fn((cb: (event: MediaQueryListEvent) => void) => listeners.delete(cb)),
    dispatchEvent: vi.fn(),
  };

  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;

  return {
    setReduced(value: boolean) {
      mql.matches = value;
      const event = { matches: value, media: mql.media } as MediaQueryListEvent;
      listeners.forEach((cb) => cb(event));
    },
  };
}

describe("CinematicHero Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = vi.fn();
    // Default: reduced motion false
    installMatchMedia(false);
    MockIntersectionObserver.instances = [];
    Object.defineProperty(window, "IntersectionObserver", {
      writable: true,
      configurable: true,
      value: MockIntersectionObserver,
    });
  });

  it("always supplies poster and renders preload=metadata", () => {
    const { container } = render(
      <CinematicHero
        src="/media/feex/feex-robotics.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
        ariaLabel="Robotics Loop"
      />
    );

    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute("poster", "/media/feex/feex-robotics-poster.webp");
    expect(video).toHaveAttribute("preload", "metadata");
    expect(video).toHaveAttribute("src", "/media/feex/feex-robotics.mp4");
    expect(video).toHaveAttribute("playsinline");
    expect(video?.muted).toBe(true);
    expect(video).toHaveAttribute("loop");

    // Check first-paint poster background on container
    const heroVideo = container.querySelector(".hero-video");

  afterEach(() => {
    MockIntersectionObserver.instances = [];
  });

    expect(heroVideo).toBeInTheDocument();
    expect(heroVideo).toHaveStyle({
      backgroundImage: "url(/media/feex/feex-robotics-poster.webp)",
    });
  });

  it("applies radial mask by default and vignette cinema overlay", () => {
    const { container } = render(
      <CinematicHero
        src="/media/feex/feex-robotics.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
        mask="radial"
      />
    );

    const heroVideo = container.querySelector(".hero-video");
    expect(heroVideo).toHaveClass("hero-mask-radial");

    const vignette = container.querySelector(".bg-vignette-cinema");
    expect(vignette).toBeInTheDocument();
  });

  it("applies linear mask when requested", () => {
    const { container } = render(
      <CinematicHero
        src="/media/feex/feex-robotics.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
        mask="linear"
      />
    );

    const heroVideo = container.querySelector(".hero-video");
    expect(heroVideo).toHaveClass("hero-mask-linear");
  });

  it("constructs the IntersectionObserver with threshold 0.25 and observes the video element", () => {
    const { container } = render(
      <CinematicHero
        src="/media/feex/feex-robotics.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
      />
    );

    const observer = MockIntersectionObserver.instances.at(-1);
    expect(observer).toBeDefined();
    expect(observer?.options).toEqual({ threshold: 0.25 });

    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();
    expect(observer?.observed).toContain(video);
  });

  it("switches gracefully to static poster when play() rejects", async () => {
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = vi.fn().mockRejectedValue(new Error("Autoplay blocked"));

    const { container } = render(
      <CinematicHero
        src="/media/feex/feex-robotics.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
        ariaLabel="Robotics Fallback"
      />
    );

    // Wait for the play promise rejection to trigger setFailed
    await vi.waitFor(() => {
      const posterStatic = container.querySelector(".hero-poster-static");
      expect(posterStatic).toBeInTheDocument();
    });

    const video = container.querySelector("video");
    expect(video).not.toBeInTheDocument();

    HTMLMediaElement.prototype.play = originalPlay;
  });

  it("switches gracefully to static poster when video onError triggers", async () => {
    const { container } = render(
      <CinematicHero
        src="/media/feex/feex-nonexistent.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
      />
    );

    const video = container.querySelector("video");
    if (video) {
      fireEvent.error(video);
    }

    await vi.waitFor(() => {
      const posterStatic = container.querySelector(".hero-poster-static");
      expect(posterStatic).toBeInTheDocument();
      expect(posterStatic).toHaveStyle({
        backgroundImage: "url(/media/feex/feex-robotics-poster.webp)",
      });
    });
  });

  it("never mounts <video> when prefers-reduced-motion: reduce is active", () => {
    installMatchMedia(true);

    const { container } = render(
      <CinematicHero
        src="/media/feex/feex-robotics.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
        ariaLabel="Reduced Motion Hero"
      />
    );

    const video = container.querySelector("video");
    expect(video).not.toBeInTheDocument();

    const posterStatic = container.querySelector(".hero-poster-static");
    expect(posterStatic).toBeInTheDocument();
    expect(posterStatic).toHaveStyle({
      backgroundImage: "url(/media/feex/feex-robotics-poster.webp)",
    });
    expect(screen.getByRole("img", { name: "Reduced Motion Hero" })).toBeInTheDocument();
  });

  it("mounts the video and attaches an observer when reduced-motion flips off after mount", () => {
    const media = installMatchMedia(true);

    const { container } = render(
      <CinematicHero
        src={VIDEO_SRC}
        poster={POSTER}
        ariaLabel="Motion Flip Hero"
      />
    );

    // While reduced motion is active the hero renders the static poster only.
    expect(container.querySelector("video")).not.toBeInTheDocument();
    expect(container.querySelector(".hero-poster-static")).toBeInTheDocument();
    expect(MockIntersectionObserver.instances).toHaveLength(0);

    act(() => {
      media.setReduced(false);
    });

    // The <video> mounts only now, and the observer must be attached to it.
    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();

    const observer = MockIntersectionObserver.instances.at(-1);
    expect(observer).toBeDefined();
    expect(observer?.observed).toContain(video);
  });

  it("does not call play() when the intersection ratio is below 0.25", () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play");

    render(
      <CinematicHero
        src={VIDEO_SRC}
        poster={POSTER}
      />
    );

    const observer = MockIntersectionObserver.instances.at(-1);
    expect(observer).toBeDefined();

    playSpy.mockClear();

    act(() => {
      observer?.trigger({ isIntersecting: true, intersectionRatio: 0.1 });
    });

    expect(playSpy).not.toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it("calls play() when the intersection ratio reaches the 0.25 threshold", () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play");

    render(
      <CinematicHero
        src={VIDEO_SRC}
        poster={POSTER}
      />
    );

    const observer = MockIntersectionObserver.instances.at(-1);
    playSpy.mockClear();

    act(() => {
      observer?.trigger({ isIntersecting: true, intersectionRatio: 0.25 });
    });

    expect(playSpy).toHaveBeenCalled();
  });

  it("renders a keyboard-operable pause control that pauses playback", () => {
    const { container } = render(
      <CinematicHero
        src={VIDEO_SRC}
        poster={POSTER}
      />
    );

    const toggle = screen.getByRole("button", { name: /pause background motion/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    // A native <button> is focusable and activates on Enter/Space.
    toggle.focus();
    expect(toggle).toHaveFocus();

    fireEvent.click(toggle);

    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /play background motion/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(container.querySelector("video")).toBeInTheDocument();
  });

  it("does not resume playback on scroll re-entry after the user paused", () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play");

    render(
      <CinematicHero
        src={VIDEO_SRC}
        poster={POSTER}
      />
    );

    const observer = MockIntersectionObserver.instances.at(-1);

    // The user pauses via the accessible control.
    fireEvent.click(screen.getByRole("button", { name: /pause background motion/i }));
    playSpy.mockClear();

    // The hero scrolls out of view and back in.
    act(() => {
      observer?.trigger({ isIntersecting: false, intersectionRatio: 0 });
    });
    act(() => {
      observer?.trigger({ isIntersecting: true, intersectionRatio: 0.9 });
    });

    expect(playSpy).not.toHaveBeenCalled();
  });

  it("falls back to the static poster on a late media error after a successful play", async () => {
    const { container } = render(
      <CinematicHero
        src={VIDEO_SRC}
        poster={POSTER}
        ariaLabel="Late Error Hero"
      />
    );

    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();

    await act(async () => {
      fireEvent.error(video as HTMLVideoElement);
    });

    await vi.waitFor(() => {
      expect(container.querySelector(".hero-poster-static")).toBeInTheDocument();
    });
    expect(container.querySelector("video")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Late Error Hero" })).toBeInTheDocument();
  });
});
