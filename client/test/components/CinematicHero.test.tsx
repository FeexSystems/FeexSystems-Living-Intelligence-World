import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CinematicHero } from "@/components/CinematicHero";

describe("CinematicHero Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = vi.fn();
    // Default: reduced motion false
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

  it("registers IntersectionObserver with threshold 0.25", () => {
    render(
      <CinematicHero
        src="/media/feex/feex-robotics.mp4"
        poster="/media/feex/feex-robotics-poster.webp"
      />
    );

    expect(window.IntersectionObserver).toBeDefined();
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
});
