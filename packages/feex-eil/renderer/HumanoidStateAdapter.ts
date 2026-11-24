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

export type HumanoidIndicator =
  | "none"
  | "attention"
  | "perception"
  | "cognition"
  | "response"
  | "speech"
  | "task"
  | "error"
  | "offline";

export interface HumanoidAnimationState {
  state: AgentState;
  motion: HumanoidMotion;
  /** Normalized visual emphasis. Not a confidence score. */
  intensity: number;
  /** Continuous body motion is disabled when this is false. */
  animated: boolean;
  indicator: HumanoidIndicator;
}

const STATE_PRESENTATION: Record<
  AgentState,
  Pick<HumanoidAnimationState, "motion" | "intensity" | "indicator">
> = {
  IDLE: { motion: "idle", intensity: 0.18, indicator: "none" },
  LISTENING: { motion: "listening", intensity: 0.42, indicator: "attention" },
  PERCEIVING: { motion: "perceiving", intensity: 0.5, indicator: "perception" },
  THINKING: { motion: "thinking", intensity: 0.38, indicator: "cognition" },
  RESPONDING: { motion: "responding", intensity: 0.48, indicator: "response" },
  SPEAKING: { motion: "speaking", intensity: 0.55, indicator: "speech" },
  EXECUTING: { motion: "executing", intensity: 0.62, indicator: "task" },
  ERROR: { motion: "error", intensity: 0.7, indicator: "error" },
  OFFLINE: { motion: "offline", intensity: 0, indicator: "offline" },
};

/** Private mapper: callers must cross the runtime contract boundary first. */
function toHumanoidAnimationState(event: AgentStateEvent): HumanoidAnimationState {
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

/** Validate the complete event before mapping it to presentation state. */
export function mapAgentStateToHumanoid(value: unknown): HumanoidAnimationState {
  return toHumanoidAnimationState(parseHumanoidStateEvent(value));
}

/** Backwards-compatible descriptive alias for the validated mapper. */
export function adaptAgentStateEvent(value: unknown): HumanoidAnimationState {
  return mapAgentStateToHumanoid(value);
}

/**
 * The contract currently provides timestamps, not monotonic sequence numbers.
 * For one agent, accept only strictly newer timestamps. A different agent
 * starts a separate presentation stream.
 */
export function isNewerAgentStateEvent(
  incoming: AgentStateEvent,
  current: AgentStateEvent,
): boolean {
  if (incoming.agentId !== current.agentId) return true;
  return Date.parse(incoming.timestamp) > Date.parse(current.timestamp);
}
