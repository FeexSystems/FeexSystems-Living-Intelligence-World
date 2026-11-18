/**
 * FEEX Embodied Intelligence Layer — Interaction Event Contract
 *
 * Gestures are proposals. High-impact actions require explicit confirmation.
 * Animation tables are documentation; the state machine is authoritative.
 */

export const IMPACT_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

/** First-release gesture vocabulary. Extend only after usability testing. */
export const FIRST_RELEASE_GESTURES = [
  "OPEN_PALM",
  "CLOSED_FIST",
  "INDEX_POINT",
  "TWO_FINGER",
  "PALM_ROTATION",
  "BOTH_HANDS_OPEN",
] as const;
export type FirstReleaseGesture = (typeof FIRST_RELEASE_GESTURES)[number];

export interface InteractionEvent {
  eventId: string;
  timestamp: string; // ISO 8601 UTC
  gesture: FirstReleaseGesture | string;
  impactLevel: ImpactLevel;
  /** True only when the gesture passed confidence + debounce + mode gates. */
  accepted: boolean;
  correlationId?: string;
  evidenceRefs: string[];
}

/**
 * Routing table from gesture to intended interaction intent.
 * High-impact intents must never be executed from gesture alone.
 */
export const GESTURE_INTENT_MAP: Readonly<
  Record<FirstReleaseGesture, { intent: string; impact: ImpactLevel }>
> = {
  OPEN_PALM: { intent: "ACTIVATE_INTERACTION", impact: "LOW" },
  CLOSED_FIST: { intent: "PAUSE_INTERACTION", impact: "LOW" },
  INDEX_POINT: { intent: "SELECT_OBJECT", impact: "MEDIUM" },
  TWO_FINGER: { intent: "NAVIGATE", impact: "MEDIUM" },
  PALM_ROTATION: { intent: "ROTATE_SCENE", impact: "LOW" },
  BOTH_HANDS_OPEN: { intent: "EXPAND_SPATIAL_UI", impact: "MEDIUM" },
} as const;

/**
 * Documentation table mapping agent state to visual animation.
 * The renderer must treat this as guidance; state events are authoritative.
 */
export const AGENT_STATE_ANIMATION: Readonly<
  Record<
    | "IDLE"
    | "LISTENING"
    | "PERCEIVING"
    | "THINKING"
    | "RESPONDING"
    | "SPEAKING"
    | "EXECUTING"
    | "ERROR"
    | "OFFLINE",
    string
  >
> = {
  IDLE: "restrained breathing / ambient motion",
  LISTENING: "audio-reactive listening indicator",
  PERCEIVING: "tracking indicators with permission status",
  THINKING: "restrained neural/particle circulation",
  RESPONDING: "response transition",
  SPEAKING: "speech-synchronized facial animation",
  EXECUTING: "task-specific animation only after execution event",
  ERROR: "explicit error indicator",
  OFFLINE: "subdued static state",
} as const;

export function requiresConfirmation(event: InteractionEvent): boolean {
  return event.impactLevel === "HIGH";
}
