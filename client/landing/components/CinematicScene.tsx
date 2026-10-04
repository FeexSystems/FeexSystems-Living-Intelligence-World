import React, { useEffect, useRef, useState } from 'react';
import { SCENE_ASSETS } from '../registry/landingAssets';

export interface CinematicSceneProps {
  id: string;
  videoSrc: string;
  posterSrc?: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

export function CinematicScene({ id, videoSrc, posterSrc, title, subtitle, children }: CinematicSceneProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [nearby, setNearby] = useState(false);
  const [visible, setVisible] = useState(false);
  const poster = posterSrc ?? SCENE_ASSETS.find((scene) => scene.id === id)?.posterSrc;
  const allowVideo = typeof window !== 'undefined' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

  useEffect(() => {
    const element = sectionRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const nearbyObserver = new IntersectionObserver(([entry]) => {
      setNearby(entry.isIntersecting);
    }, { rootMargin: '100% 0px' });
    const visibleObserver = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5);
    }, { threshold: [0, 0.5] });
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
    } else if (!video.paused) {
      video.pause();
    }
  }, [visible, nearby]);

  return (
    <section ref={sectionRef} id={id} aria-label={`Scene ${SCENE_ASSETS.findIndex((scene) => scene.id === id) + 1} of ${SCENE_ASSETS.length}: ${title}`} className="relative h-screen w-full snap-start snap-always flex items-center justify-center overflow-hidden bg-black bg-cover bg-center" style={{ backgroundImage: poster ? `url("${poster}")` : undefined }}>
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="none"
        poster={poster}
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      >
        {nearby && allowVideo && <source src={videoSrc} type="video/webm" />}
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
      <div className="relative z-10 w-full max-w-[1500px] px-5 pb-28 pt-24 text-white flex-col justify-end h-full overflow-y-auto sm:px-8 lg:pr-56">
        <span className="mb-4 font-mono text-[10px] tracking-[.24em] text-white/60">WORLD MODEL / {String(SCENE_ASSETS.findIndex((scene) => scene.id === id) + 1).padStart(2, '0')}</span>
        <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-none tracking-tight mb-4 uppercase">{title}</h2>
        <p className="font-mono text-sm tracking-widest text-white/50 uppercase">{subtitle}</p>
        {children}
      </div>
    </section>
  );
}
