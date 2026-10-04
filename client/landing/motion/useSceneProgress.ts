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
 * Scene observation is independent of motion preferences; reduced motion only
 * changes transitions and media playback, never the active scene.
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

export function useSceneProgress({
  sceneIds,
  container,
}: UseSceneProgressOptions): SceneProgress {
  const [activeIndex, setActiveIndex] = useState(0);
  const sceneIdsRef = useRef(sceneIds);
  sceneIdsRef.current = sceneIds;

  useEffect(() => {
    if (!container || typeof IntersectionObserver === "undefined") return;

    const visibility = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        // IntersectionObserver reports only changed targets. Retain the last
        // ratio of every scene so a partial batch cannot select a stale scene.
        for (const entry of entries) {
          visibility.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let bestIndex = -1;
        let bestRatio = 0;
        sceneIdsRef.current.forEach((id, index) => {
          const ratio = visibility.get(id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIndex = index;
          }
        });
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
