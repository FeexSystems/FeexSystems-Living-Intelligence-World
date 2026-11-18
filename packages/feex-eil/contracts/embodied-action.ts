/**
 * FEEX Embodied Intelligence Layer — Embodied Action Contract
 *
 * Typed request/observation boundary between cognition and embodiment.
 * No LLM output may reach this contract unvalidated. Physical execution is
 * disabled until simulation, safety review and operator authorization pass.
 * The deterministic safety gateway — not the model — has final authority.
 */

export const ACTION_CATEGORIES = [
  "PERCEPTION_QUERY",
  "COGNITION_QUERY",
  "SIMULATION_COMMAND",
  "PHYSICAL_COMMAND",
  "OBSERVATION_READ",
] as const;
export type ActionCategory = (typeof ACTION_CATEGORIES)[number];

export const ACTION_AUTHORIZATION_STATES = [
  "UNREQUESTED",
  "REQUESTED",
  "AUTHORIZED",
  "DENIED",
  "REVOKED",
  "EXPIRED",
] as const;
export type ActionAuthorizationState =
  (typeof ACTION_AUTHORIZATION_STATES)[number];

export interface EmbodiedActionRequest {
  requestId: string;
  timestamp: string; // ISO 8601 UTC
  agentId: string;
  category: ActionCategory;
  /** Opaque, versioned action payload. Interpreted only by the embodiment adapter. */
  payload: Record<string, unknown>;
  /** Declared impact ceiling. The safety gateway may only tighten, never loosen. */
  maxImpactLevel: "LOW" | "MEDIUM" | "HIGH";
  correlationId?: string;
  evidenceRefs: string[];
  /** Authorization state as known at request time; never assumed granted. */
  authorization: ActionAuthorizationState;
}

export interface EmbodiedActionObservation {
  observationId: string;
  requestId: string;
  timestamp: string; // ISO 8601 UTC
  /** Terminal or interim result. Never inferred from request submission. */
  outcome:
    | "ACCEPTED"
    | "REJECTED_BY_SAFETY"
    | "REJECTED_BY_AUTH"
    | "SIMULATED"
    | "EXECUTED"
    | "FAILED"
    | "UNAVAILABLE";
  /** Machine-readable reason code; required for every non-ACCEPTED outcome. */
  reasonCode?: string;
  detail?: string;
  correlationId?: string;
}

/**
 * Safety-gateway decision. `allowPhysical` can only be true when every
 * precondition is explicitly satisfied — it is never defaulted to true.
 */
export interface SafetyGatewayDecision {
  decisionId: string;
  requestId: string;
  timestamp: string; // ISO 8601 UTC
  allowSimulation: boolean;
  allowPhysical: boolean;
  reasons: string[];
}

/**
 * Invariant helpers. Callers must not bypass these checks.
 */
export function isPhysicalExecutionPermitted(
  request: EmbodiedActionRequest,
  decision: SafetyGatewayDecision,
): boolean {
  return (
    request.category === "PHYSICAL_COMMAND" &&
    request.authorization === "AUTHORIZED" &&
    decision.allowPhysical === true &&
    request.maxImpactLevel !== "HIGH"
  );
}

export function requiresOperatorAuthorization(
  request: EmbodiedActionRequest,
): boolean {
  return (
    request.category === "PHYSICAL_COMMAND" ||
    request.maxImpactLevel === "HIGH"
  );
}
