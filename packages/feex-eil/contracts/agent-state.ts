/**
 * FEEX EIL — Embodied Intelligence Layer
 * Contract: Agent State  v0.1.0
 *
 * Canonical state machine shared by FEEX WORLD and HOLOKAI.
 *
 * Rules:
 *   - State transitions MUST follow VALID_TRANSITIONS.
 *   - `confidence` MUST be omitted when no calibrated source provides it.
 *   - `evidenceRefs` MUST be non-empty when state is RESPONDING or EXECUTING.
 *   - EXECUTING state must reflect actual task execution, never LLM token generation.
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

export type AgentState =
  | "IDLE"
  | "LISTENING"
  | "PERCEIVING"
  | "THINKING"
  | "RESPONDING"
  | "SPEAKING"
  | "EXECUTING"
  | "ERROR"
  | "OFFLINE";

export const VALID_TRANSITIONS: Record<AgentState, AgentState[]> = {
  IDLE: ["LISTENING", "PERCEIVING", "OFFLINE", "ERROR"],
  LISTENING: ["THINKING", "IDLE", "ERROR"],
  PERCEIVING: ["THINKING", "IDLE", "ERROR"],
  THINKING: ["RESPONDING", "EXECUTING", "IDLE", "ERROR"],
  RESPONDING: ["SPEAKING", "EXECUTING", "IDLE", "ERROR"],
  SPEAKING: ["IDLE", "LISTENING", "ERROR"],
  EXECUTING: ["RESPONDING", "IDLE", "ERROR"],
  ERROR: ["IDLE", "OFFLINE"],
  OFFLINE: ["IDLE"],
};

/** Backwards-compatible alias used by earlier drafts. */
export const VALID_AGENT_STATE_TRANSITIONS = VALID_TRANSITIONS;

export function isValidAgentStateTransition(
  from: AgentState,
  to: AgentState,
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/** States that require evidenceRefs to be non-empty on entry. */
export const EVIDENCE_REQUIRED_STATES: readonly AgentState[] = [
  "RESPONDING",
  "EXECUTING",
];

export function transitionRequiresEvidence(to: AgentState): boolean {
  return EVIDENCE_REQUIRED_STATES.includes(to);
}

export interface AgentStateEvent {
  /** UUID v4 — unique per transition */
  eventId: string;
  /** Identifies the agent instance */
  agentId: string;
  state: AgentState;
  /** Previous state — receiver must validate transition */
  previousState: AgentState;
  /** ISO 8601 UTC */
  timestamp: string;
  source:
    | "voice"
    | "perception"
    | "cognition"
    | "world-model"
    | "robotics"
    | "system";
  /**
   * Evidence IDs supporting the transition.
   * MUST be non-empty when state is RESPONDING or EXECUTING.
   */
  evidenceRefs: string[];
  correlationId?: string;
  /**
   * Calibrated confidence in [0, 1].
   * MUST be omitted when not from a calibrated source. Never default.
   */
  confidence?: number;
  /** Optional human-readable reason (never used as authority). */
  reason?: string;
  debug?: Record<string, unknown>;
}

export interface AgentStateMachine {
  currentState(): AgentState;
  transition(
    to: AgentState,
    source: AgentStateEvent["source"],
    meta?: Partial<
      Pick<
        AgentStateEvent,
        "evidenceRefs" | "correlationId" | "confidence" | "debug" | "reason"
      >
    >,
  ): AgentStateEvent;
  subscribe(handler: (event: AgentStateEvent) => void): () => void;
}

// ---------------------------------------------------------------------------
// DataSourceLabel — replaces fabricated fallback pattern in HoloKaiVoiceModal
// ---------------------------------------------------------------------------

export type DataSourceLabel =
  | "LIVE" // Data from a live API call confirmed this tick
  | "CACHED" // Previously fetched; still within TTL
  | "FALLBACK" // Live unavailable; using last known good
  | "UNAVAILABLE" // No data; render absent state, not fake state
  | "ERROR" // Fetch attempted and failed
  | "SIMULATED"; // Explicitly synthetic; must be labeled in UI

export const DATA_SOURCE_LABELS = [
  "LIVE",
  "CACHED",
  "FALLBACK",
  "UNAVAILABLE",
  "ERROR",
  "SIMULATED",
] as const satisfies readonly DataSourceLabel[];

export interface LabeledDatum<T> {
  value: T;
  sourceLabel: DataSourceLabel;
  /** ISO 8601 — when this datum was last confirmed from source */
  fetchedAt?: string;
  /** Service or endpoint that produced this datum */
  sourceId?: string;
}
