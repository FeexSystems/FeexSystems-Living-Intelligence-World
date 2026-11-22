import type { PresentationIntent } from "../../../packages/feex-eil/renderer/presentation-state";

/**
 * Phase 4 — bounded cursor-presence intent for the landing hero.
 *
 * Returns an `aware` intent only while the pointer is inside a bounded
 * central focal zone (|nx| <= 0.5, |ny| <= 0.6 in normalized device
 * coords). Outside the zone the intent clears — the humanoid never
 * tracks the cursor unrestrictedly. Pure function; the caller owns the
 * listener lifecycle.
 */
export function heroAwareIntent(
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): PresentationIntent | null {
  if (width <= 0 || height <= 0) return null;
  const nx = (clientX / width) * 2 - 1;
  const ny = (clientY / height) * 2 - 1;
  if (Math.abs(nx) <= 0.5 && Math.abs(ny) <= 0.6) return { kind: "aware" };
  return null;
}
