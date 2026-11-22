import { Suspense, lazy } from "react";
import { useEffectCapabilities } from "../effects/capabilities";
import { useMotionPaused } from "./useMotionPaused";
import { useSceneVisibility } from "../effects/SceneVisibilityContext";
import { EIL_PROJECTION_ENABLED } from "../../lib/eil/projectionConfig";

/**
 * G5 landing showcase gate — decides whether the lazy humanoid WebGL
 * layer may mount. The overlay is a read-only projection of ephemeral
 * local EIL state; it never touches the network, storage, or hardware.
 *
 * Mount requires ALL of:
 *  - scene `visible` (≥50% in view — not merely near)
 *  - WebGL available
 *  - no prefers-reduced-motion, no saveData, not a low-power device,
 *    not a coarse-pointer (mobile) device
 *  - global motion toggle not paused
 *
 * Any failure leaves the cinematic video/poster untouched — the
 * humanoid is decorative and strictly optional.
 */

const HumanoidHeroCanvas = lazy(() => import("./HumanoidHeroCanvas"));

export function HumanoidHeroOverlay() {
  const visibility = useSceneVisibility();
  const caps = useEffectCapabilities();
  const motionPaused = useMotionPaused();

  const allowed =
    EIL_PROJECTION_ENABLED &&
    visibility?.visible === true &&
    caps.webgl &&
    !caps.reducedMotion &&
    !caps.saveData &&
    !caps.lowPower &&
    !caps.coarsePointer &&
    !motionPaused;

  if (!allowed) return null;

  return (
    <Suspense fallback={null}>
      <HumanoidHeroCanvas reducedMotion={caps.reducedMotion} />
    </Suspense>
  );
}
