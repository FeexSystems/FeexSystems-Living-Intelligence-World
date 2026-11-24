import { useEffect, useState } from "react";

export interface SceneVisibility {
  /** Within ~1 viewport of the section — assets may preload. */
  near: boolean;
  /** At least half the section is on screen — full render/media allowed. */
  visible: boolean;
}

/**
 * useSceneVisibility
 *
 * Cheap IntersectionObserver wrapper mirroring the contract CinematicScene
 * already uses: `near` warms deferred assets, `visible` authorises the
 * expensive render loop. Observes against the snap-scroll container when the
 * section lives inside one.
 */
export function useSceneVisibility<T extends HTMLElement>() {
  const [ref, setRef] = useState<T | null>(null);
  const [visibility, setVisibility] = useState<SceneVisibility>({
    near: false,
    visible: false,
  });

  useEffect(() => {
    if (!ref || typeof IntersectionObserver === "undefined") return;
    const root = ref.closest<HTMLElement>(".snap-y") ?? undefined;
    const nearbyObserver = new IntersectionObserver(
      ([entry]) => {
        setVisibility((current) =>
          current.near === entry.isIntersecting
            ? current
            : { ...current, near: entry.isIntersecting }
        );
      },
      { root, rootMargin: "100% 0px" }
    );
    const visibleObserver = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        setVisibility((current) =>
          current.visible === isVisible ? current : { ...current, visible: isVisible }
        );
      },
      { root, threshold: [0, 0.5] }
    );
    nearbyObserver.observe(ref);
    visibleObserver.observe(ref);
    return () => {
      nearbyObserver.disconnect();
      visibleObserver.disconnect();
    };
  }, [ref]);

  return { ref: setRef, ...visibility };
}
