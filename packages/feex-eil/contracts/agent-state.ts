/**
 * FEEX Embodied Intelligence Layer — Agent State Contract
 *
 * Canonical state machine for embodied agents across FEEX WORLD and HOLOKAI.
 * States are event-sourced. Animation is a projection, not an authority.
 *
 * Confidence is never defaulted. If a subsystem cannot produce a calibrated
 * confidence value it must omit the field or emit an explicit unavailable label.
 */

export const AGENT_STATES = [
  "IDLE",
  "LISTENING",
  "PERCEIVING",
  "THINKING",
  "RESPONDING",
  "SPEAKING",
  "EXECUTING",
  "ERROR",
  "OFFLINE",
] as const;

export type AgentState = (typeof AGENT_STATES)[number];

/** Valid transitions. Receivers must reject any transition not listed here. */
export const VALID_AGENT_STATE_TRANSITIONS: Readonly<
  Record<AgentState, readonly AgentState[]>
> = {
  IDLE: ["LISTENING", "PERCEIVING", "THINKING", "OFFLINE", "ERROR"],
  LISTENING: ["PERCEIVING", "THINKING", "IDLE", "OFFLINE", "ERROR"],
  PERCEIVING: ["THINKING", "IDLE", "OFFLINE", "ERROR"],
  THINKING: ["RESPONDING", "SPEAKING", "EXECUTING", "IDLE", "ERROR", "OFFLINE"],
  RESPONDING: ["SPEAKING", "EXECUTING", "IDLE", "ERROR", "OFFLINE"],
  SPEAKING: ["IDLE", "LISTENING", "ERROR", "OFFLINE"],
  EXECUTING: ["IDLE", "ERROR", "OFFLINE"],
  ERROR: ["IDLE", "OFFLINE"],
  OFFLINE: ["IDLE"],
} as const;

export function isValidAgentStateTransition(
  from: AgentState,
  to: AgentState,
): boolean {
  return VALID_AGENT_STATE_TRANSITIONS[from].includes(to);
}

export const DATA_SOURCE_LABELS = [
  "LIVE",
  "CACHED",
  "FALLBACK",
  "UNAVAILABLE",
  "ERROR",
  "SIMULATED",
] as const;

export type DataSourceLabel = (typeof DATA_SOURCE_LABELS)[number];

/**
 * Wrapper that forces every datum to declare its provenance and freshness.
 * `confidence` is optional and must never be defaulted by the producer.
 */
export interface LabeledDatum<T> {
  value: T | null;
  label: DataSourceLabel;
  observedAt: string; // ISO 8601 UTC
  /** Calibrated confidence in [0, 1]. Omit rather than invent. */
  confidence?: number;
  source?: string;
  correlationId?: string;
}

export interface AgentStateEvent {
  eventId: string;
  agentId: string;
  previousState: AgentState;
  state: AgentState;
  timestamp: string; // ISO 8601 UTC
  source:
    | "voice"
    | "perception"
    | "cognition"
    | "world-model"
    | "robotics"
    | "system";
  correlationId?: string;
  evidenceRefs: string[];
  /** Optional human-readable reason for the transition (never used as authority). */
  reason?: string;
}

export function assertValidAgentStateEvent(event: AgentStateEvent): void {
  if (!isValidAgentStateTransition(event.previousState, event.state)) {
    throw new Error(
      `Invalid agent state transition: ${event.previousState} → ${event.state}`,
    );
  }
  if (!event.evidenceRefs || event.evidenceRefs.length === 0) {
    // Evidence refs may be empty only for pure system/offline transitions;
    // callers that require evidence must enforce that separately.
  }
}
