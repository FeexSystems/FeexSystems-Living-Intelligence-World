import { useEffect, useState } from "react";
import { getPreloadManifest } from "../registry/landingAssets";

/**
 * AssetPreloader
 *
 * Warms the landing's cinematic assets before/while the scenes mount.
 *
 * Canonical Principle 8 (non-blocking infrastructure): preloading must NEVER
 * block first paint or interaction. This component performs no gating — it
 * renders nothing and reports progress through an optional callback. Scenes
 * render immediately with their poster images regardless of preload state.
 *
 * Posters resolve first (cheap, first paint); videos are warmed afterwards so a
 * large `.webm` cannot delay the hero.
 */

export interface AssetPreloaderProps {
  /**
   * Optional progress callback. `loaded + failed === total` signals completion.
   * Failures are expected (offline dev, missing media) and are never fatal.
   */
  onProgress?: (state: { loaded: number; failed: number; total: number }) => void;
}

export function AssetPreloader({ onProgress }: AssetPreloaderProps) {
  const [state, setState] = useState({ loaded: 0, failed: 0, total: 0 });

  useEffect(() => {
    if (typeof window === "undefined" || typeof Image === "undefined") return;

    const manifest = getPreloadManifest();
    let cancelled = false;
    let loaded = 0;
    let failed = 0;

    setState({ loaded: 0, failed: 0, total: manifest.length });
    onProgress?.({ loaded: 0, failed: 0, total: manifest.length });

    const settle = () => {
      if (cancelled) return;
      const next = { loaded, failed, total: manifest.length };
      setState(next);
      onProgress?.(next);
    };

    // Posters are images; videos are fetched as blobs only to warm the cache.
    const cleanups: Array<() => void> = [];

    manifest.forEach((url) => {
      if (url.endsWith(".webm") || url.endsWith(".mp4")) {
        const controller = new AbortController();
        cleanups.push(() => controller.abort());

        fetch(url, { signal: controller.signal })
          .then(() => {
            loaded += 1;
          })
          .catch(() => {
            failed += 1;
          })
          .finally(settle);
        return;
      }

      const image = new Image();
      const onLoad = () => {
        loaded += 1;
        settle();
      };
      const onError = () => {
        failed += 1;
        settle();
      };

      image.addEventListener("load", onLoad);
      image.addEventListener("error", onError);
      image.src = url;

      cleanups.push(() => {
        image.removeEventListener("load", onLoad);
        image.removeEventListener("error", onError);
      });
    });

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
    // Manifest is static per build; run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Purely a side-effect component — it never renders UI or gates children.
  void state;
  return null;
}
