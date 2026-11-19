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

export type PerceptionModality = "hand" | "face" | "pose" | "audio";

export const PERCEPTION_MODALITIES = [
  "hand",
  "face",
  "pose",
  "audio",
] as const satisfies readonly PerceptionModality[];

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  /** MediaPipe visibility score [0, 1] */
  visibility?: number;
}

export interface PerceptionEvent {
  /** UUID v4 */
  eventId: string;
  /** ISO 8601 UTC */
  timestamp: string;
  modality: PerceptionModality;
  /**
   * MediaPipe detection confidence [0, 1].
   * Always available for perception events — required, not optional.
   */
  confidence: number;
  landmarks?: Landmark[];
  /** Classified gesture label, if applicable */
  gesture?: string;
  /**
   * Whether the interaction pipeline is currently permitted to act on this event.
   * MUST be set by PermissionManager.
   * NEVER default to true.
   */
  interactionAllowed: boolean;
  /** Camera or microphone device identifier */
  deviceId?: string;
  /** For audio modality — Hz */
  dominantFrequency?: number;
  /** For audio modality — normalized [0, 1] */
  amplitude?: number;
  correlationId?: string;
}

export interface GestureEvent {
  /** UUID v4 */
  eventId: string;
  /** ISO 8601 UTC */
  timestamp: string;
  /** Classified gesture label */
  gesture: string;
  /** MediaPipe classification confidence [0, 1] */
  confidence: number;
  /** Whether both hands contributed to this gesture */
  bimanual: boolean;
  /** References the PerceptionEvent that triggered classification */
  sourceEventId: string;
  /** Inherited from source PerceptionEvent */
  interactionAllowed: boolean;
  /** Duration of the gesture in ms — used for debounce validation */
  durationMs: number;
  correlationId?: string;
}

export type PermissionState =
  | "GRANTED"
  | "DENIED"
  | "PROMPT"
  | "REVOKED"
  | "ERROR";

export const PERMISSION_STATES = [
  "GRANTED",
  "DENIED",
  "PROMPT",
  "REVOKED",
  "ERROR",
] as const satisfies readonly PermissionState[];

/** Backwards-compatible alias for earlier drafts. */
export const PERMISSION_STATUSES = PERMISSION_STATES;
export type PermissionStatus = PermissionState;

export interface PermissionSnapshot {
  camera: PermissionState;
  microphone: PermissionState;
  /** Explicit flag. Must be set by PermissionManager; never defaulted. */
  interactionAllowed: boolean;
  updatedAt: string; // ISO 8601 UTC
}

export function isPermissionRevoked(status: PermissionState): boolean {
  // ERROR means permission state is unknown — treat as not permitted.
  return status === "REVOKED" || status === "DENIED" || status === "ERROR";
}
