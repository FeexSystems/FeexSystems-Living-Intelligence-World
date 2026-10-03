/**
 * MotionSystem
 *
 * Shared, dependency-free motion tokens and helpers for the landing experience.
 *
 * The landing previously relied on per-component magic durations spread across
 * cinematic primitives. This module centralises them so scene transitions stay
 * coherent and `prefers-reduced-motion` is honoured in one place.
 *
 * Canonical Principle 9 (60 FPS safeguards): durations favour transform/opacity
 * only — no layout-triggering animation properties.
 */

import type { CSSProperties } from "react";

export interface MotionToken {
  /** Duration in milliseconds. */
  duration: number;
  /** CSS easing function. */
  easing: string;
}

export const MOTION_TOKENS = {
  sceneEnter: { duration: 620, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  sceneExit: { duration: 420, easing: "cubic-bezier(0.4, 0, 1, 1)" },
  overlay: { duration: 260, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  inspector: { duration: 320, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
} as const satisfies Record<string, MotionToken>;

export type MotionTokenName = keyof typeof MOTION_TOKENS;

/** Resolved motion for the active environment. */
export interface ResolvedMotion extends MotionToken {
  /** True when the user asked for reduced motion; duration collapses to 0. */
  reduced: boolean;
}

export function prefersReducedMotion(): boolean {
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
  name: MotionTokenName,
  reduced: boolean = prefersReducedMotion()
): ResolvedMotion {
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
  name: MotionTokenName,
  properties: string[] = ["opacity", "transform"],
  reduced?: boolean
): CSSProperties {
  const motion = resolveMotion(name, reduced);
  return {
    transitionProperty: properties.join(", "),
    transitionDuration: `${motion.duration}ms`,
    transitionTimingFunction: motion.easing,
  };
}

/** 0..1 progress → opacity, clamped for safe interpolation. */
export function progressToOpacity(progress: number): number {
  return Math.min(Math.max(progress, 0), 1);
}

/**
 * 0..1 progress → a subtle vertical offset. Purely decorative; capped at a few
 * pixels so it never affects scene layout metrics.
 */
export function progressToOffset(progress: number, maxPx = 12): number {
  const clamped = Math.min(Math.max(progress, 0), 1);
  return (1 - clamped) * maxPx;
}
