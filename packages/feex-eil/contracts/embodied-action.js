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
] ;
 

export const ACTION_AUTHORIZATION_STATES = [
  "UNREQUESTED",
  "REQUESTED",
  "AUTHORIZED",
  "DENIED",
  "REVOKED",
  "EXPIRED",
] ;
 

















































/**
 * Invariant helpers. Callers must not bypass these checks.
 */
export function isPhysicalExecutionPermitted(
  request,
  decision,
) {
  return (
    request.category === "PHYSICAL_COMMAND" &&
    request.authorization === "AUTHORIZED" &&
    // The safety decision must belong to THIS request — a decision issued
    // for a different requestId never authorizes this one.
    decision.requestId === request.requestId &&
    // HIGH-impact physical commands are never auto-permitted: they require
    // a dedicated, scoped operator grant that this contract does not yet
    // define. The deterministic safety gateway alone cannot unlock them.
    request.maxImpactLevel !== "HIGH" &&
    decision.allowPhysical === true
  );
}

export function requiresOperatorAuthorization(
  request,
) {
  return (
    request.category === "PHYSICAL_COMMAND" ||
    request.maxImpactLevel === "HIGH"
  );
}
