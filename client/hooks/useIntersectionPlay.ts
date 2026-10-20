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

  // Sync the observed element after mount and whenever the ref points at a
  // different node.
  //
  // This effect intentionally has NO dependency array. The observed element
  // can change without any prop/state change of this hook: e.g. a hero that
  // renders a static poster while `prefers-reduced-motion: reduce` is active
  // mounts its <video> only *after* the preference flips back, and the ref
  // object identity stays the same the whole time. A dependency list of
  // [ref, element] would therefore never re-run, and the IntersectionObserver
  // would stay detached from the freshly mounted element.
  //
  // The functional updater returns the previous state when nothing changed,
  // so React bails out of the re-render instead of looping (the previous
  // implementation used a bare `setElement(ref.current)` with a dependency
  // list, which spun forever whenever `ref.current !== element`).
  useEffect(() => {
    const current = ref.current ?? null;
    setElement((prev) => (prev === current ? prev : current));
  });

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
