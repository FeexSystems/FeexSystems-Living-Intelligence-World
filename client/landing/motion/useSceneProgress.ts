import { useEffect, useRef, useState } from "react";

/**
 * useSceneProgress
 *
 * Tracks the landing's active scene as the user scrolls the snap container.
 *
 * This is PRESENTATION state only (migration Phase D: "Scene state must remain
 * presentation state"). It observes which `<section>` is in view; it never
 * derives or mutates canonical World Model data.
 *
 * Accessibility: honours `prefers-reduced-motion` by skipping the scroll-observer
 * subscription entirely — progress simply stays at scene 0 rather than animating.
 */

export interface SceneProgress {
  /** Zero-based index of the scene currently in view. */
  activeIndex: number;
  /** Total number of registered scenes. */
  total: number;
  /** 0..1 position of the active scene within the whole composition. */
  ratio: number;
  /** The active scene's DOM id, when known. */
  activeSceneId: string | null;
}

export interface UseSceneProgressOptions {
  /** Scene ids in authoring order. */
  sceneIds: string[];
  /** The scrolling container holding the scenes. */
  container: HTMLElement | null;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useSceneProgress({
  sceneIds,
  container,
}: UseSceneProgressOptions): SceneProgress {
  const [activeIndex, setActiveIndex] = useState(0);
  const sceneIdsRef = useRef(sceneIds);
  sceneIdsRef.current = sceneIds;

  useEffect(() => {
    if (!container) return;
    if (prefersReducedMotion()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the most-visible intersecting scene rather than the last event,
        // so fast scrolls don't leave a stale active index.
        let bestIndex = -1;
        let bestRatio = 0;

        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = sceneIdsRef.current.indexOf(entry.target.id);
          if (index === -1) continue;
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIndex = index;
          }
        }

        if (bestIndex !== -1) setActiveIndex(bestIndex);
      },
      { root: container, threshold: [0.25, 0.5, 0.75] }
    );

    const elements = sceneIdsRef.current
      .map((id) => container.querySelector<HTMLElement>(`#${CSS.escape(id)}`))
      .filter((el): el is HTMLElement => Boolean(el));

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [container, sceneIds.length]);

  const total = sceneIds.length;
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(total - 1, 0));

  return {
    activeIndex: safeIndex,
    total,
    ratio: total > 1 ? safeIndex / (total - 1) : 0,
    activeSceneId: sceneIds[safeIndex] ?? null,
  };
}
