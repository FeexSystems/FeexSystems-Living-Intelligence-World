import { useEffect } from "react";
import { SCENE_ASSETS } from "../registry/landingAssets";

/**
 * AssetPreloader
 *
 * Warms only the current and next poster; video loading belongs to the visible scene.
 *
 * Canonical Principle 8 (non-blocking infrastructure): preloading must NEVER
 * block first paint or interaction. This component performs no gating — it
 * renders nothing and reports progress through an optional callback. Scenes
 * render immediately with their poster images regardless of preload state.
 *
 * No video fetch is initiated here. Distant 4K media must remain deferred.
 */

export interface AssetPreloaderProps {
  activeIndex?: number;
  onProgress?: (state: { loaded: number; failed: number; total: number }) => void;
}

export function AssetPreloader({ activeIndex = 0, onProgress }: AssetPreloaderProps) {

  useEffect(() => {
    if (typeof window === "undefined" || typeof Image === "undefined") return;

    const posters = SCENE_ASSETS.slice(activeIndex, activeIndex + 2).map((scene) => scene.posterSrc);
    let loaded = 0;
    let failed = 0;
    let cancelled = false;
    onProgress?.({ loaded, failed, total: posters.length });
    const images = posters.map((url) => {
      const image = new Image();
      image.onload = () => {
        if (!cancelled) onProgress?.({ loaded: ++loaded, failed, total: posters.length });
      };
      image.onerror = () => {
        if (!cancelled) onProgress?.({ loaded, failed: ++failed, total: posters.length });
      };
      image.src = url;
      return image;
    });
    return () => {
      cancelled = true;
      images.forEach((image) => { image.onload = null; image.onerror = null; });
    };
  }, [activeIndex, onProgress]);

  // Pure side effect: never gates the first paint.
  return null;
}
