





















export const MOTION_TOKENS = {
  sceneEnter: { duration: 620, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  sceneExit: { duration: 420, easing: "cubic-bezier(0.4, 0, 1, 1)" },
  overlay: { duration: 260, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  inspector: { duration: 320, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
} ;

 







export function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Resolve a motion token for the current environment. When reduced motion is
 * requested the duration becomes 0 so consumers can still apply the final state
 * without animating into it.
 */
export function resolveMotion(
  name,
  reduced = prefersReducedMotion()
) {
  const token = MOTION_TOKENS[name];
  return {
    ...token,
    duration: reduced ? 0 : token.duration,
    reduced,
  };
}

/**
 * Build an inline transition style for a token. Consumers spread this onto an
 * element rather than re-declaring durations locally.
 */
export function motionStyle(
  name,
  properties = ["opacity", "transform"],
  reduced
) {
  const motion = resolveMotion(name, reduced);
  return {
    transitionProperty: properties.join(", "),
    transitionDuration: `${motion.duration}ms`,
    transitionTimingFunction: motion.easing,
  };
}

/** 0..1 progress → opacity, clamped for safe interpolation. */
export function progressToOpacity(progress) {
  return Math.min(Math.max(progress, 0), 1);
}

/**
 * 0..1 progress → a subtle vertical offset. Purely decorative; capped at a few
 * pixels so it never affects scene layout metrics.
 */
export function progressToOffset(progress, maxPx = 12) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  return (1 - clamped) * maxPx;
}
