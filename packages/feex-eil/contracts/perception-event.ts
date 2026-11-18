/**
 * FEEX Embodied Intelligence Layer — Perception Event Contract
 *
 * Local-by-default. Raw frames never leave the device.
 * interactionAllowed is never defaulted; only PermissionManager may set it.
 */

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  /** Visibility / confidence of this landmark in [0, 1]. Omit rather than invent. */
  visibility?: number;
}

export const PERCEPTION_MODALITIES = ["hand", "face", "pose", "audio"] as const;
export type PerceptionModality = (typeof PERCEPTION_MODALITIES)[number];

export const PERMISSION_STATUSES = [
  "GRANTED",
  "DENIED",
  "PROMPT",
  "REVOKED",
] as const;
export type PermissionStatus = (typeof PERMISSION_STATUSES)[number];

export interface PermissionSnapshot {
  camera: PermissionStatus;
  microphone: PermissionStatus;
  /** Explicit flag. Must be set by PermissionManager; never defaulted. */
  interactionAllowed: boolean;
  updatedAt: string; // ISO 8601 UTC
}

export interface PerceptionEvent {
  eventId: string;
  timestamp: string; // ISO 8601 UTC
  modality: PerceptionModality;
  /** Calibrated confidence in [0, 1]. Required for this event type. */
  confidence: number;
  landmarks?: Landmark[];
  gesture?: string;
  /** Must be copied from a PermissionSnapshot produced by PermissionManager. */
  interactionAllowed: boolean;
  permissionSnapshot?: PermissionSnapshot;
  correlationId?: string;
}

export interface GestureEvent {
  eventId: string;
  timestamp: string; // ISO 8601 UTC
  gesture: string;
  /** Duration the gesture was held, in milliseconds (for debounce audit). */
  durationMs: number;
  confidence: number;
  interactionAllowed: boolean;
  correlationId?: string;
}

export function isPermissionRevoked(status: PermissionStatus): boolean {
  return status === "REVOKED" || status === "DENIED";
}
