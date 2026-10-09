import { useState, useEffect, type RefObject, type MutableRefObject } from "react";

export interface UseIntersectionPlayOptions {
  pausedRef?: MutableRefObject<boolean>;
}

export function useIntersectionPlay(
  ref: RefObject<HTMLVideoElement | null>,
  threshold = 0.25,
  opts?: UseIntersectionPlayOptions
): HTMLVideoElement | null {
  const [element, setElement] = useState<HTMLVideoElement | null>(null);

  // Sync the observed element after mount and whenever the ref identity changes.
  // Previously this effect had NO dependency array, so it ran after every render
  // and called setElement — an infinite render loop whenever ref.current !== element.
  useEffect(() => {
    if (ref.current !== element) {
      setElement(ref.current);
    }
  }, [ref, element]);

  useEffect(() => {
    const el = element || ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          if (opts?.pausedRef && opts.pausedRef.current) {
            // User explicitly paused playback; preserve paused state
            return;
          }
          try {
            const p = el.play();
            if (p && typeof p.catch === "function") {
              p.catch(() => {});
            }
          } catch {}
        } else {
          el.pause();
        }
      },
      { threshold }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [element, ref, threshold, opts?.pausedRef]);

  return element;
}

export default useIntersectionPlay;
