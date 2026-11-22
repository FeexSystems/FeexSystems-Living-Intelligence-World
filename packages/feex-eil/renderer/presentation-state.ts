/**
 * FEEX EIL — Humanoid presentation-state contract (Blueprint v2 Phase 2).
 *
 * This is a PRESENTATION-layer vocabulary only. It never creates, stores,
 * or mutates agent state: canonical state remains the EIL AgentState
 * contract in ../contracts/agent-state.ts, and renderer animation mapping
 * remains HumanoidStateAdapter.ts. This module maps validated EIL events
 * (and explicit visitor/application intents) onto the 9-state humanoid
 * presentation model used by showcase surfaces.
 *
 * Boundaries:
 * - AWARE / INSPECTING / GESTURING have NO AgentState source; they are
 *   reachable only through explicit visitor/application intents.
 * - UNAVAILABLE is fail-closed: ERROR/OFFLINE always wins over intents.
 * - EvidenceStatus is separate from DataSourceLabel provenance — missing
 *   evidence resolves to UNAVAILABLE, never VERIFIED or SIMULATED.
 */
import type { AgentState } from "../contracts/agent-state";

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
] as const;

export type HumanoidPresentationState =
  (typeof HUMANOID_PRESENTATION_STATES)[number];

/** Who originated a presentation intent — never implies evidence. */
export type PresentationOrigin =
  | "eil"
  | "visitor"
  | "application"
  | "simulation"
  | "holokai";

/**
 * Scene-presentation evidence tier. Distinct from DataSourceLabel
 * (LIVE/CACHED/FALLBACK/...) which describes API data freshness.
 */
export const EVIDENCE_STATUSES = [
  "VERIFIED",
  "SIMULATED",
  "UNAVAILABLE",
] as const;

export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

/** Fail-closed: absent or unrecognized evidence is UNAVAILABLE. */
export function resolveEvidenceStatus(
  value: unknown,
): EvidenceStatus {
  return value === "VERIFIED" || value === "SIMULATED" ? value : "UNAVAILABLE";
}

/**
 * Visitor/application presentation intents — the only source for states
 * that have no AgentState counterpart. `inspecting` requires a systemId;
 * `gesturing` and `aware` are ambient intents.
 */
export type PresentationIntent =
  | { kind: "aware" }
  | { kind: "gesturing" }
  | { kind: "inspecting"; systemId: string };

/**
 * AgentState → presentation mapping. RESPONDING maps to THINKING because
 * the 9-state model has no "generating response" pose and SPEAKING must
 * only be entered on confirmed playback. EXECUTING maps to GESTURING
 * (task-execution gesture); ERROR/OFFLINE collapse to UNAVAILABLE.
 */
const AGENT_TO_PRESENTATION: Record<AgentState, HumanoidPresentationState> = {
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

const INTENT_TO_STATE: Record<PresentationIntent["kind"], HumanoidPresentationState> = {
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
  agentState: AgentState | null | undefined,
  intent?: PresentationIntent | null,
): HumanoidPresentationState {
  if (!agentState) return "UNAVAILABLE";
  const base = AGENT_TO_PRESENTATION[agentState];
  if (base === "UNAVAILABLE") return "UNAVAILABLE";

  const agentDriven = new Set<HumanoidPresentationState>([
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
  value: unknown,
): value is HumanoidPresentationState {
  return (
    typeof value === "string" &&
    (HUMANOID_PRESENTATION_STATES as readonly string[]).includes(value)
  );
}
