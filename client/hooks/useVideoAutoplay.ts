import { useState, useEffect, type RefObject } from "react";

export function useVideoAutoplay(
  videoRef: RefObject<HTMLVideoElement | null>,
  disabled = false
): { hasFailed: boolean; isPlaying: boolean } {
  const [hasFailed, setHasFailed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (disabled) return;
    const el = videoRef.current;
    if (!el) return;

    let isMounted = true;

    const attemptPlay = () => {
      if (!el || document.hidden) return;
      el.play()
        .then(() => {
          if (isMounted) {
            setIsPlaying(true);
            setHasFailed(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setHasFailed(true);
            setIsPlaying(false);
          }
        });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        el.pause();
        if (isMounted) setIsPlaying(false);
      } else {
        attemptPlay();
      }
    };

    attemptPlay();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [videoRef, disabled]);

  return { hasFailed, isPlaying };
}

export default useVideoAutoplay;
