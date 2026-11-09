import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { SCENE_ASSETS } from '../registry/landingAssets';
import { SceneVisibilityContext } from '../effects/SceneVisibilityContext';

export interface CinematicSceneProps {
  id: string;
  videoSrc: string;
  posterSrc?: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
  /**
   * Optional replacement for the built-in poster + video layers. When
   * provided, the scene renders this layer (absolutely positioned to fill the
   * section) instead of its own `<video>`, so the media is decoded exactly
   * once. The hero passes the `CinematicHero` here.
   */
  mediaLayer?: React.ReactNode;
  /**
   * Optional full-bleed effects layer rendered inside the section, above the
   * media but below the vignette and foreground content. Wrapped in
   * SceneVisibilityContext so gated effects mount only near visibility.
   */
  fxLayer?: React.ReactNode;
  /** Optional replacement for the inner content of the scene <h2>. */
  titleNode?: React.ReactNode;
  /** Optional replacement for the inner content of the scene <p>. */
  subtitleNode?: React.ReactNode;
  /**
   * When true, skips the poster/video/mediaLayer entirely — the fxLayer
   * becomes the scene background and no video bytes are decoded.
   */
  hideMedia?: boolean;
}

export function CinematicScene({ id, videoSrc, posterSrc, title, subtitle, children, mediaLayer, fxLayer, titleNode, subtitleNode, hideMedia = false }: CinematicSceneProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [nearby, setNearby] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const poster = posterSrc ?? SCENE_ASSETS.find((scene) => scene.id === id)?.posterSrc;
  const allowVideo = typeof window !== 'undefined' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

  useEffect(() => {
    const element = sectionRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const rootContainer = element.closest<HTMLElement>('.snap-y') ?? undefined;
    const nearbyObserver = new IntersectionObserver(([entry]) => {
      setNearby(entry.isIntersecting);
    }, { root: rootContainer, rootMargin: '100% 0px' });
    const visibleObserver = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5);
    }, { root: rootContainer, threshold: [0, 0.5] });
    nearbyObserver.observe(element);
    visibleObserver.observe(element);
    return () => { nearbyObserver.disconnect(); visibleObserver.disconnect(); };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (visible && !reduced && !saveData) {
      video.load();
      void video.play().catch(() => { /* Autoplay can be denied; poster remains visible. */ });
    } else {
      setIsPlaying(false);
      if (!video.paused) {
        video.pause();
      }
    }
  }, [visible, nearby]);

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-label={`Scene ${SCENE_ASSETS.findIndex((scene) => scene.id === id) + 1} of ${SCENE_ASSETS.length}: ${title}`}
      className="relative h-screen w-full snap-start snap-always flex items-center justify-center overflow-hidden bg-black"
    >
      <SceneVisibilityContext.Provider value={{ near: nearby, visible }}>
      {hideMedia ? (
        /* Effect-background scene: no video decode. The poster remains as a
           cheap fallback under the fxLayer for gated-off/low-power clients. */
        poster && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${poster}")` }}
          />
        )
      ) : mediaLayer ? (
        /* Hero media layer: owns its own poster, playback, and
           pause control — the built-in layers below are skipped so the video
           is decoded exactly once. */
        <div className="absolute inset-0">{mediaLayer}</div>
      ) : (
        <>
          {/* Dedicated Poster Layer: fades out cleanly once video begins active playback */}
          {poster && (
            <div
              aria-hidden="true"
              className={cn(
                "absolute inset-0 bg-cover bg-center transition-opacity duration-700 pointer-events-none",
                isPlaying ? "opacity-0" : "opacity-100"
              )}
              style={{ backgroundImage: `url("${poster}")` }}
            />
          )}

          {/* Clean Video Layer: smoothly cross-fades into view with full clarity upon playback */}
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="none"
            onPlaying={() => setIsPlaying(true)}
            onWaiting={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onError={() => setIsPlaying(false)}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
              isPlaying ? "opacity-100" : "opacity-0"
            )}
          >
            {nearby && allowVideo && <source src={videoSrc} type="video/webm" />}
          </video>
        </>
      )}

      {/* Effects layer: gated cinematic effects mount here, above media,
          below vignette/content (content stays at z-10, so scene controls
          remain interactive while background effects can track the pointer). */}
      {fxLayer && (
        <div className="absolute inset-0 z-[5]" aria-hidden="true">
          {fxLayer}
        </div>
      )}

      {/* Ambient Vignette Gradient for Text Contrast */}
      <div className="absolute inset-0 bg-linear-to-b from-black/30 via-transparent to-black/85 pointer-events-none" />

      {/* Foreground Scene Content */}
      <div className="relative z-10 w-full max-w-[1500px] px-5 pb-28 pt-24 text-white flex-col justify-end h-full overflow-y-auto sm:px-8 lg:pr-56">
        <span className="mb-4 font-mono text-[10px] tracking-[.24em] text-white/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">WORLD MODEL / {String(SCENE_ASSETS.findIndex((scene) => scene.id === id) + 1).padStart(2, '0')}</span>
        {titleNode ? (
          <div role="heading" aria-level={2} className="text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-none tracking-tight mb-4 uppercase">
            {titleNode}
          </div>
        ) : (
          <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-none tracking-tight mb-4 uppercase drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">{title}</h2>
        )}
        <p className="font-mono text-sm tracking-widest text-white/80 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{subtitleNode ?? subtitle}</p>
        {children}
      </div>
      </SceneVisibilityContext.Provider>
    </section>
  );
}

