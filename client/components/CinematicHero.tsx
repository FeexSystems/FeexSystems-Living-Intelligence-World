import React, { useRef, useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useVideoAutoplay } from "@/hooks/useVideoAutoplay";
import { useIntersectionPlay } from "@/hooks/useIntersectionPlay";
import { MotionToggle, DEFAULT_CONTROLS_LABEL } from "./heroTypes";

export interface CinematicHeroProps {
  src: string;
  poster: string;
  className?: string;
  mask?: "radial" | "linear" | "none";
  objectPosition?: string;
  ariaLabel?: string;
  showPauseControl?: boolean;
  controlsLabel?: string;
}

export function CinematicHero({
  src,
  poster,
  className,
  mask = "radial",
  objectPosition = "center",
  ariaLabel = "Hero visual",
  showPauseControl = true,
  controlsLabel = DEFAULT_CONTROLS_LABEL,
}: CinematicHeroProps) {
  const reduced = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [userPaused, setUserPaused] = useState(false);
  const userPausedRef = useRef(false);
  const [hasError, setHasError] = useState(false);

  // Hook into video visibility autoplay and rejection
  const { hasFailed } = useVideoAutoplay(videoRef, reduced || userPaused);

  // Synchronize pausedRef
  useEffect(() => {
    userPausedRef.current = userPaused;
    const el = videoRef.current;
    if (el) {
      if (userPaused) {
        el.pause();
      } else if (!reduced && !hasError && !hasFailed) {
        el.play().catch(() => setHasError(true));
      }
    }
  }, [userPaused, reduced, hasError, hasFailed]);

  // Observer with ratio check and user pause support.
  // Memoised so the ref object identity is stable across renders.
  const playGuards = useMemo(() => ({ pausedRef: userPausedRef }), []);

  // Fall back to the element the intersection hook actually observed: while the
  // poster fallback is mounted `videoRef.current` is null, so without this the
  // IntersectionObserver would never be attached.
  const observedVideo = useIntersectionPlay(videoRef, 0.25, playGuards);
  const videoEl = videoRef.current ?? observedVideo;

  // Listen for late media errors on the mounted element (and on the observed
  // element while the poster fallback is still on screen).
  useEffect(() => {
    const el = videoRef.current ?? observedVideo;
    if (!el) return;

    const handleError = () => setHasError(true);
    el.addEventListener("error", handleError);
    return () => {
      el.removeEventListener("error", handleError);
    };
  }, [src, observedVideo]);

  const togglePause = () => {
    setUserPaused((prev) => !prev);
  };

  // `hasFailed` only describes the initial autoplay attempt. Because the video
  // is also started/stopped by the IntersectionObserver on scroll, the native
  // autoplay element cannot always play at mount time. Latching the poster
  // forever in that case left a black hero at the top of the landing page, so
  // the fallback is driven only by an explicit media/play error.
  const isPosterFallback = reduced || hasError;

  if (isPosterFallback) {
    return (
      <div
        className={cn(
          "hero-poster-static absolute inset-0 bg-cover bg-center overflow-hidden pointer-events-none",
          maskClass(mask),
          className
        )}
        style={{ backgroundImage: `url(${poster})`, backgroundPosition: objectPosition }}
        role="img"
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <div
      className={cn("hero-video absolute inset-0 overflow-hidden", maskClass(mask), className)}
      style={{ backgroundImage: `url(${poster})`, backgroundPosition: objectPosition }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="metadata"
        autoPlay
        muted
        loop
        playsInline
        aria-label={ariaLabel}
        className="w-full h-full object-cover"
        style={{ objectPosition }}
      />

      <div className="bg-vignette-cinema absolute inset-0 pointer-events-none" />

      {showPauseControl && (
        <MotionToggle
          paused={userPaused}
          label={controlsLabel}
          onToggle={togglePause}
        />
      )}
    </div>
  );
}

function maskClass(mask: "radial" | "linear" | "none") {
  if (mask === "radial") {
    return "hero-mask-radial";
  }
  if (mask === "linear") {
    return "hero-mask-linear";
  }
  return "";
}

export default CinematicHero;
