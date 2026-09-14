import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";

export interface VideoOverlayBackgroundProps {
  src: string;
  poster?: string;
  opacity?: number;
  className?: string;
  position?: "hero" | "footer" | "section";
  label?: string;
  blendMode?: "screen" | "luminosity" | "normal" | "overlay";
  showToggle?: boolean;
}

export function VideoOverlayBackground({
  src,
  poster,
  opacity = 0.55,
  className = "",
  position = "hero",
  label = "Ambient Video Stream",
  blendMode = "normal",
  showToggle = true,
}: VideoOverlayBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // IntersectionObserver: auto-pause when out of viewport to preserve CPU/GPU
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const inView = entry.isIntersecting;
          if (videoRef.current) {
            if (inView) {
              if (isPlaying) {
                videoRef.current.play().catch(() => {
                  // Autoplay policy prevented playback
                });
              }
            } else {
              videoRef.current.pause();
            }
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [isPlaying]);

  const togglePlayback = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  }, [isPlaying]);

  if (hasError) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-0 overflow-hidden pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      {/* Background Video Layer */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onLoadedData={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        style={{
          opacity: isLoaded ? opacity : 0,
          mixBlendMode: blendMode,
          WebkitMaskImage:
            position === "hero"
              ? "linear-gradient(to right, transparent 0%, transparent 45%, rgba(0,0,0,0.6) 70%, black 90%)"
              : undefined,
          maskImage:
            position === "hero"
              ? "linear-gradient(to right, transparent 0%, transparent 45%, rgba(0,0,0,0.6) 70%, black 90%)"
              : undefined,
        }}
        className={`w-full h-full object-cover transition-opacity duration-700 ${
          position === "footer" ? "object-bottom" : "object-right"
        }`}
      />

      {/* Cybernetic Contrast Shield Gradient Overlays (WCAG AAA Compliance) */}
      {position === "hero" ? (
        <>
          {/* Guaranteed pure black shield over left-hand hero text and CTAs */}
          <div className="absolute inset-y-0 left-0 w-full sm:w-3/5 bg-gradient-to-r from-black via-black/90 to-transparent pointer-events-none" />
          {/* Top subtle vignette */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black to-transparent pointer-events-none" />
          {/* Bottom fade into next section */}
          <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />
        </>
      ) : position === "footer" ? (
        <>
          {/* Top fade from previous section */}
          <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black via-black/70 to-transparent pointer-events-none" />
          {/* High-visibility contrast shield: dark enough for crisp typography, transparent enough for vivid robotics video */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/65 pointer-events-none" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/40 to-black/75 pointer-events-none" />
      )}

      {/* Discrete Cyberpunk Play/Pause Toggle Badge */}
      {showToggle && (
        <div
          className={`absolute z-20 pointer-events-auto flex items-center ${
            position === "footer"
              ? "bottom-4 right-4 sm:bottom-6 sm:right-8"
              : "bottom-4 right-4 sm:bottom-6 sm:right-8"
          }`}
        >
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={isPlaying ? `Pause ${label}` : `Play ${label}`}
            className="group flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-[11px] font-mono text-zinc-300 backdrop-blur-md transition-all hover:border-white/40 hover:bg-black/90 hover:text-white focus:outline-none focus:ring-1 focus:ring-white/40 shadow-lg"
          >
            <span className="relative flex h-2 w-2">
              {isPlaying && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isPlaying ? "bg-emerald-500" : "bg-zinc-500"
                }`}
              />
            </span>
            <span className="hidden sm:inline font-medium uppercase tracking-wider text-[10px] text-zinc-300 group-hover:text-white">
              {label}
            </span>
            {isPlaying ? (
              <Pause className="w-3 h-3 text-zinc-300 group-hover:text-white transition-colors" />
            ) : (
              <Play className="w-3 h-3 text-zinc-300 group-hover:text-white transition-colors" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoOverlayBackground;
