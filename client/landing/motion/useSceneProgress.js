 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }import { useEffect, useRef, useState } from "react";

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



















export function useSceneProgress({
  sceneIds,
  container,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const sceneIdsRef = useRef(sceneIds);
  sceneIdsRef.current = sceneIds;

  useEffect(() => {
    if (!container || typeof IntersectionObserver === "undefined") return;

    const visibility = new Map();
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
          const ratio = _nullishCoalesce(visibility.get(id), () => ( 0));
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
      .map((id) => container.querySelector(`#${CSS.escape(id)}`))
      .filter((el) => Boolean(el));

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [container, sceneIds.length]);

  const total = sceneIds.length;
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(total - 1, 0));

  return {
    activeIndex: safeIndex,
    total,
    ratio: total > 1 ? safeIndex / (total - 1) : 0,
    activeSceneId: _nullishCoalesce(sceneIds[safeIndex], () => ( null)),
  };
}
