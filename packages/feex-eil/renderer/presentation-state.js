


















export const HUMANOID_PRESENTATION_STATES = [
  "IDLE",
  "AWARE",
  "PERCEIVING",
  "THINKING",
  "LISTENING",
  "SPEAKING",
  "GESTURING",
  "INSPECTING",
  "UNAVAILABLE",
] ;

 










/**
 * Scene-presentation evidence tier. Distinct from DataSourceLabel
 * (LIVE/CACHED/FALLBACK/...) which describes API data freshness.
 */
export const EVIDENCE_STATUSES = [
  "VERIFIED",
  "SIMULATED",
  "UNAVAILABLE",
] ;

 

/** Fail-closed: absent or unrecognized evidence is UNAVAILABLE. */
export function resolveEvidenceStatus(
  value,
) {
  return value === "VERIFIED" || value === "SIMULATED" ? value : "UNAVAILABLE";
}

/**
 * Visitor/application presentation intents — the only source for states
 * that have no AgentState counterpart. `inspecting` requires a systemId;
 * `gesturing` and `aware` are ambient intents.
 */
 




/**
 * AgentState → presentation mapping. RESPONDING maps to THINKING because
 * the 9-state model has no "generating response" pose and SPEAKING must
 * only be entered on confirmed playback. EXECUTING maps to GESTURING
 * (task-execution gesture); ERROR/OFFLINE collapse to UNAVAILABLE.
 */
const AGENT_TO_PRESENTATION = {
  IDLE: "IDLE",
  LISTENING: "LISTENING",
  PERCEIVING: "PERCEIVING",
  THINKING: "THINKING",
  RESPONDING: "THINKING",
  SPEAKING: "SPEAKING",
  EXECUTING: "GESTURING",
  ERROR: "UNAVAILABLE",
  OFFLINE: "UNAVAILABLE",
};

const INTENT_TO_STATE = {
  aware: "AWARE",
  gesturing: "GESTURING",
  inspecting: "INSPECTING",
};

/**
 * Resolve the displayed presentation state.
 *
 * Precedence (fail-closed, safety first):
 *  1. ERROR / OFFLINE → UNAVAILABLE (runtime safety beats all intents)
 *  2. SPEAKING / THINKING / LISTENING / PERCEIVING → agent-driven states
 *     (voice lifecycle and cognition are never overridden by ambient intents)
 *  3. IDLE + explicit intent → intent state (AWARE / GESTURING / INSPECTING)
 *  4. otherwise → agent-driven mapping
 */
export function resolvePresentationState(
  agentState,
  intent,
) {
  if (!agentState) return "UNAVAILABLE";
  const base = AGENT_TO_PRESENTATION[agentState];
  if (base === "UNAVAILABLE") return "UNAVAILABLE";

  const agentDriven = new Set([
    "LISTENING",
    "PERCEIVING",
    "THINKING",
    "SPEAKING",
    "GESTURING",
  ]);
  if (agentDriven.has(base)) return base;

  if (intent) {
    if (intent.kind === "inspecting" && !intent.systemId) return "IDLE";
    return INTENT_TO_STATE[intent.kind];
  }
  return base;
}

export function isHumanoidPresentationState(
  value,
) {
  return (
    typeof value === "string" &&
    (HUMANOID_PRESENTATION_STATES ).includes(value)
  );
}
