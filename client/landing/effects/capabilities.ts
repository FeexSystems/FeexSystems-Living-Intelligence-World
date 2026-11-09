import { useEffect, useState } from "react";

/**
 * Device/browser capability detection for cinematic effects.
 * Everything here is best-effort and SSR-safe.
 */

export interface EffectCapabilities {
  /** User prefers reduced motion (WCAG). */
  reducedMotion: boolean;
  /** Browser is asking to conserve data. */
  saveData: boolean;
  /** Primary pointer is coarse (touch-first device). */
  coarsePointer: boolean;
  /** Conservative hardware heuristic (low core count / memory). */
  lowPower: boolean;
  /** A WebGL context can actually be created. */
  webgl: boolean;
}

let webglCache: boolean | null = null;

export function probeWebGL(): boolean {
  if (webglCache !== null) return webglCache;
  if (typeof document === "undefined") return (webglCache = false);
  try {
    const canvas = document.createElement("canvas");
    webglCache = !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    webglCache = false;
  }
  return webglCache;
}

function readCapabilities(): EffectCapabilities {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      reducedMotion: true,
      saveData: true,
      coarsePointer: true,
      lowPower: true,
      webgl: false,
    };
  }
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  return {
    reducedMotion:
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    saveData: nav.connection?.saveData ?? false,
    coarsePointer:
      window.matchMedia?.("(pointer: coarse)").matches ?? false,
    lowPower:
      (nav.hardwareConcurrency ?? 8) <= 4 ||
      (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4),
    webgl: probeWebGL(),
  };
}

/** Non-hook snapshot for one-off checks (event handlers, effects). */
export function getCapabilities(): EffectCapabilities {
  return readCapabilities();
}

/** Reactive capabilities — re-reads on media-query / connection changes. */
export function useEffectCapabilities(): EffectCapabilities {
  const [caps, setCaps] = useState<EffectCapabilities>(readCapabilities);

  useEffect(() => {
    const update = () => setCaps(readCapabilities());
    const queries = [
      "(prefers-reduced-motion: reduce)",
      "(pointer: coarse)",
      "(pointer: fine)",
    ];
    const mqls = queries
      .map((q) => window.matchMedia?.(q))
      .filter((m): m is MediaQueryList => !!m);
    mqls.forEach((m) => m.addEventListener?.("change", update));
    const conn = (
      navigator as Navigator & { connection?: EventTarget }
    ).connection;
    conn?.addEventListener?.("change", update);
    return () => {
      mqls.forEach((m) => m.removeEventListener?.("change", update));
      conn?.removeEventListener?.("change", update);
    };
  }, []);

  return caps;
}
