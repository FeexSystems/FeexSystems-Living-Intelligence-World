import { createContext, useContext } from "react";

/**
 * SceneVisibilityContext
 *
 * Provided by `CinematicScene` for its subtree. `near` mirrors the scene's
 * 100%-margin IntersectionObserver (preload zone); `visible` mirrors the
 * ≥50%-ratio observer (on-screen). `EffectGate` uses `near` to lazy-mount
 * effects just before they scroll into view, keeping all 75 effect chunks
 * out of the initial bundle and off-screen rAF loops paused.
 */
export interface SceneVisibility {
  near: boolean;
  visible: boolean;
}

export const SceneVisibilityContext = createContext<SceneVisibility | null>(
  null
);

export function useSceneVisibility(): SceneVisibility | null {
  return useContext(SceneVisibilityContext);
}
