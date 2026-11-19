import type { AgentStateEvent } from "../contracts/agent-state";
import { adaptAgentStateEvent, type HumanoidAnimationState } from "./HumanoidStateAdapter";
import { ParticleHumanoid } from "./ParticleHumanoid";
import { MechanicalHumanoid } from "./MechanicalHumanoid";

export type HumanoidStyle = "particle" | "mechanical";

export interface HumanoidSceneProps {
  /** Must be a validated AgentStateEvent from the EIL state machine. */
  event: AgentStateEvent;
  style?: HumanoidStyle;
  reducedMotion?: boolean;
  accentColor?: string;
}

/**
 * A scene fragment for an existing React Three Fiber Canvas.
 * Deliberately does not create Canvas/WebGLRenderer or own agent state.
 */
export function HumanoidScene({
  event,
  style = "particle",
  reducedMotion = false,
  accentColor,
}: HumanoidSceneProps) {
  const animation: HumanoidAnimationState = adaptAgentStateEvent(event);

  return (
    <group name="feex-eil-humanoid-scene">
      {style === "mechanical" ? (
        <MechanicalHumanoid animation={animation} reducedMotion={reducedMotion} accentColor={accentColor} />
      ) : (
        <ParticleHumanoid animation={animation} reducedMotion={reducedMotion} accentColor={accentColor} />
      )}
    </group>
  );
}
