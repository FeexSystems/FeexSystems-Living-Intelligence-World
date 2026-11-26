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
] ;

 










const TRANSITION_TABLE = {
  IDLE: ["LISTENING", "PERCEIVING", "OFFLINE", "ERROR"],
  LISTENING: ["THINKING", "IDLE", "ERROR"],
  PERCEIVING: ["THINKING", "IDLE", "ERROR"],
  THINKING: ["RESPONDING", "EXECUTING", "IDLE", "ERROR"],
  RESPONDING: ["SPEAKING", "EXECUTING", "IDLE", "ERROR"],
  SPEAKING: ["IDLE", "LISTENING", "ERROR"],
  EXECUTING: ["RESPONDING", "IDLE", "ERROR"],
  ERROR: ["IDLE", "OFFLINE"],
  OFFLINE: ["IDLE"],
} ;

/**
 * Frozen at module load: consumers must not be able to mutate transition
 * policy at runtime. Read-only views only — mutate via a contract revision,
 * never in place.
 */
export const VALID_TRANSITIONS

 = Object.freeze(
  Object.fromEntries(
    (Object.keys(TRANSITION_TABLE) ).map((state) => [
      state,
      Object.freeze([...TRANSITION_TABLE[state]]),
    ]),
  ),
) ;

/** Backwards-compatible alias used by earlier drafts. */
export const VALID_AGENT_STATE_TRANSITIONS = VALID_TRANSITIONS;

export function isValidAgentStateTransition(
  from,
  to,
) {
  return VALID_TRANSITIONS[from].includes(to);
}

/** States that require evidenceRefs to be non-empty on entry. */
export const EVIDENCE_REQUIRED_STATES = [
  "RESPONDING",
  "EXECUTING",
];

export function transitionRequiresEvidence(to) {
  return EVIDENCE_REQUIRED_STATES.includes(to);
}



























































 // Explicitly synthetic; must be labeled in UI

export const DATA_SOURCE_LABELS = [
  "LIVE",
  "CACHED",
  "FALLBACK",
  "UNAVAILABLE",
  "ERROR",
  "SIMULATED",
] ;









