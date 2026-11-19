import { useEffect, useState } from "react";
import type { AgentStateEvent } from "../contracts/agent-state";
import {
  isNewerAgentStateEvent,
  parseHumanoidStateEvent,
  type HumanoidAnimationState,
} from "./HumanoidStateAdapter";
import { ParticleHumanoid } from "./ParticleHumanoid";
import { MechanicalHumanoid } from "./MechanicalHumanoid";

export type HumanoidStyle = "particle" | "mechanical";

export interface HumanoidSceneProps {
  /** AgentStateEvent from the EIL state machine; runtime-validated here. */
  event: AgentStateEvent;
  style?: HumanoidStyle;
  reducedMotion?: boolean;
  accentColor?: string;
}

/**
 * A scene fragment for an existing React Three Fiber Canvas.
 * Deliberately does not create Canvas/WebGLRenderer or own agent state.
 * Events for one agent are applied in strictly increasing timestamp order.
 */
export function HumanoidScene({
  event,
  style = "particle",
  reducedMotion,
  accentColor,
}: HumanoidSceneProps) {
  const incoming = parseHumanoidStateEvent(event);
  const [currentEvent, setCurrentEvent] = useState(incoming);

  useEffect(() => {
    setCurrentEvent((current) =>
      isNewerAgentStateEvent(incoming, current) ? incoming : current,
    );
  }, [incoming.eventId, incoming.agentId, incoming.timestamp]);

  // Switch agents immediately; same-agent delayed events cannot roll state back.
  const displayedEvent =
    incoming.agentId !== currentEvent.agentId ? incoming : currentEvent;

  const animation: HumanoidAnimationState = {
    state: displayedEvent.state,
    motion: displayedEvent.state.toLowerCase() as HumanoidAnimationState["motion"],
    intensity: displayedEvent.state === "ERROR" ? 0.7
      : displayedEvent.state === "EXECUTING" ? 0.62
      : displayedEvent.state === "SPEAKING" ? 0.55
      : displayedEvent.state === "RESPONDING" ? 0.48
      : displayedEvent.state === "PERCEIVING" ? 0.5
      : displayedEvent.state === "LISTENING" ? 0.42
      : displayedEvent.state === "THINKING" ? 0.38
      : displayedEvent.state === "IDLE" ? 0.18 : 0,
    animated: displayedEvent.state !== "OFFLINE",
    indicator: displayedEvent.state === "LISTENING" ? "attention"
      : displayedEvent.state === "PERCEIVING" ? "perception"
      : displayedEvent.state === "THINKING" ? "cognition"
      : displayedEvent.state === "RESPONDING" ? "response"
      : displayedEvent.state === "SPEAKING" ? "speech"
      : displayedEvent.state === "EXECUTING" ? "task"
      : displayedEvent.state === "ERROR" ? "error"
      : displayedEvent.state === "OFFLINE" ? "offline" : "none",
  };

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
