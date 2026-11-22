import type { AgentStateEvent } from "../../../packages/feex-eil/contracts/agent-state";
import { HumanoidScene } from "../../../packages/feex-eil/renderer/HumanoidScene";

export interface EILProjectionSlotProps {
  /** Latest validated EIL AgentStateEvent; null/undefined renders nothing. */
  event: AgentStateEvent | null | undefined;
  /** Kill switch — false renders nothing (pre-EIL scene). */
  enabled: boolean;
  position?: [number, number, number];
  accentColor?: string;
  /** Overrides the OS reduced-motion preference when supplied. */
  reducedMotion?: boolean;
}

/**
 * G5 Stage 3 — shared EIL humanoid projection slot.
 *
 * Mount inside an existing React Three Fiber Canvas only. Renders
 * nothing when disabled or when no event exists yet — the host scene
 * is byte-identical to the pre-EIL path in both cases.
 *
 * Rollback semantics (precise): this flag hides the renderer only.
 * The ephemeral runtime may still process local signals; it holds no
 * canonical state, performs no I/O, and is garbage-collected with the
 * component. Full EIL disablement = also stop passing eilRuntime.
 */
export function EILProjectionSlot({
  event,
  enabled,
  position = [0, -0.6, -2.4],
  accentColor = "#8cf5d2",
  reducedMotion,
}: EILProjectionSlotProps) {
  if (!enabled || !event) return null;
  return (
    <group name="feex-eil-projection" position={position}>
      <HumanoidScene event={event} accentColor={accentColor} reducedMotion={reducedMotion} />
    </group>
  );
}
