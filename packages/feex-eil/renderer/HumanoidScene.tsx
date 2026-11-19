import { useEffect, useState } from "react";
import type { AgentStateEvent } from "../contracts/agent-state";
import {
  isNewerAgentStateEvent,
  mapAgentStateToHumanoid,
  parseHumanoidStateEvent,
} from "./HumanoidStateAdapter";
import { ParticleHumanoid } from "./ParticleHumanoid";
import { MechanicalHumanoid } from "./MechanicalHumanoid";

export type HumanoidStyle = "particle" | "mechanical";

export interface HumanoidSceneProps {
  /** AgentStateEvent from the EIL state machine; runtime-validated here. */
  event: AgentStateEvent;
  style?: HumanoidStyle;
  /** Overrides the OS preference when explicitly supplied. */
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

  // Agent changes start a fresh stream immediately. Delayed same-agent events
  // remain validated but cannot roll the visible state back.
  const displayedEvent =
    incoming.agentId !== currentEvent.agentId ? incoming : currentEvent;
  const animation = mapAgentStateToHumanoid(displayedEvent);

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
