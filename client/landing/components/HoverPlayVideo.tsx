import { useEffect, useRef, useState } from 'react';

interface HoverPlayVideoProps {
  src?: string;
  poster: string;
  alt: string;
  isActive?: boolean;
  motionPaused?: boolean;
  className?: string;
}

export function HoverPlayVideo({ src, poster, alt, isActive = false, motionPaused = false, className = 'h-full w-full object-cover' }: HoverPlayVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inViewport, setInViewport] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInViewport(entry.isIntersecting), { rootMargin: '120px', threshold: 0.05 });
    observer.observe(video);
    return () => observer.disconnect();
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    const shouldPlay = !motionPaused && inViewport && (isActive || hovered || focused);
    if (shouldPlay) void video.play().catch(() => undefined);
    else video.pause();
  }, [src, motionPaused, inViewport, isActive, hovered, focused]);

  if (!src) return <img src={poster} alt={alt} className={className} loading="lazy" />;
  return <video
    ref={videoRef}
    src={inViewport ? src : undefined}
    poster={poster}
    muted
    loop
    playsInline
    preload="none"
    aria-label={alt}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)}
    onBlur={() => setFocused(false)}
    className={className}
  />;
}
