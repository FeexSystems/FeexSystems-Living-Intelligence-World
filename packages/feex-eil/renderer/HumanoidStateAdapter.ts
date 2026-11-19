/**
 * FEEX EIL — Humanoid state adapter.
 *
 * The renderer consumes validated AgentStateEvents. It does not create agent
 * state, infer perception, or treat model generation as task execution.
 */
import type { AgentState, AgentStateEvent } from "../contracts/agent-state";
import { parseAgentStateEvent } from "../contracts/validation";

export type HumanoidMotion =
  | "idle"
  | "listening"
  | "perceiving"
  | "thinking"
  | "responding"
  | "speaking"
  | "executing"
  | "error"
  | "offline";

export interface HumanoidAnimationState {
  state: AgentState;
  motion: HumanoidMotion;
  /** Normalized visual emphasis. Not a confidence score. */
  intensity: number;
  /** Continuous body motion is disabled when this is false. */
  animated: boolean;
  indicator: "none" | "attention" | "perception" | "cognition" | "speech" | "task" | "error";
}

const STATE_PRESENTATION: Record<
  AgentState,
  Pick<HumanoidAnimationState, "motion" | "intensity" | "indicator">
> = {
  IDLE: { motion: "idle", intensity: 0.18, indicator: "none" },
  LISTENING: { motion: "listening", intensity: 0.42, indicator: "attention" },
  PERCEIVING: { motion: "perceiving", intensity: 0.5, indicator: "perception" },
  THINKING: { motion: "thinking", intensity: 0.38, indicator: "cognition" },
  RESPONDING: { motion: "responding", intensity: 0.48, indicator: "cognition" },
  SPEAKING: { motion: "speaking", intensity: 0.55, indicator: "speech" },
  EXECUTING: { motion: "executing", intensity: 0.62, indicator: "task" },
  ERROR: { motion: "error", intensity: 0.7, indicator: "error" },
  OFFLINE: { motion: "offline", intensity: 0, indicator: "none" },
};

/** Convert an already-validated event into a deterministic visual state. */
export function mapAgentStateToHumanoid(event: AgentStateEvent): HumanoidAnimationState {
  const presentation = STATE_PRESENTATION[event.state];
  return {
    state: event.state,
    ...presentation,
    animated: event.state !== "OFFLINE",
  };
}

/** Runtime boundary for data arriving from adapters, storage, or transport. */
export function parseHumanoidStateEvent(value: unknown): AgentStateEvent {
  return parseAgentStateEvent(value);
}

/** Validate first, then map. Invalid or forged transitions never reach visuals. */
export function adaptAgentStateEvent(value: unknown): HumanoidAnimationState {
  return mapAgentStateToHumanoid(parseHumanoidStateEvent(value));
}
