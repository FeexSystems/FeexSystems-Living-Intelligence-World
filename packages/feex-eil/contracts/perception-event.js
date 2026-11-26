/**
 * FEEX EIL — Embodied Intelligence Layer
 * Contract: Perception Event  v0.1.0
 *
 * MediaPipe-based perception layer events.
 *
 * Rules:
 *   - `interactionAllowed` MUST be set by PermissionManager. Never default to true.
 *   - Raw camera frames MUST NOT be transmitted to any LLM or external service.
 *   - Confidence is REQUIRED for perceptual events (MediaPipe provides it).
 */

 

export const PERCEPTION_MODALITIES = [
  "hand",
  "face",
  "pose",
  "audio",
] ;

































































export const PERMISSION_STATES = [
  "GRANTED",
  "DENIED",
  "PROMPT",
  "REVOKED",
  "ERROR",
] ;

/** Backwards-compatible alias for earlier drafts. */
export const PERMISSION_STATUSES = PERMISSION_STATES;
 









export function isPermissionRevoked(status) {
  // ERROR means permission state is unknown — treat as not permitted.
  return status === "REVOKED" || status === "DENIED" || status === "ERROR";
}
