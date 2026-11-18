/**
 * FEEX EIL — Embodied Intelligence Layer
 * Contract: Interaction Event  v0.1.0
 *
 * Events flowing across the Interaction layer (EventBus).
 *
 * Rules:
 *   - Every event is immutable after emission.
 *   - HIGH_IMPACT events must not route if `authorized === false`.
 *   - Routing decisions are made by InteractionMachine, not the renderer.
 */

import type { AgentState } from "./agent-state";

export type InteractionChannel =
  | "voice" // Speech input from VoiceGateway
  | "gesture" // Classified gesture from GestureRouter
  | "keyboard" // Accessibility fallback
  | "system" // Internal state machine transitions
  | "telemetry"; // Incoming World Model or robotics events

export const INTERACTION_CHANNELS = [
  "voice",
  "gesture",
  "keyboard",
  "system",
  "telemetry",
] as const satisfies readonly InteractionChannel[];

export type ImpactLevel =
  | "LOW" // Visual state change, navigation, cosmetic
  | "MEDIUM" // Data query, context switch, session action
  | "HIGH"; // Tool execution, external API call, robotic command

export const IMPACT_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const satisfies readonly ImpactLevel[];

export interface InteractionEvent {
  eventId: string; // UUID v4
  timestamp: string; // ISO 8601 UTC
  channel: InteractionChannel;
  /**
   * Semantic intent in dot-notation verb.noun format.
   * Examples: "select.entity", "navigate.world", "expand.interface"
   */
  intent: string;
  payload?: Record<string, unknown>;
  impactLevel: ImpactLevel;
  /**
   * Whether the interaction pipeline has permission to execute this event.
   * HIGH_IMPACT events MUST NOT route if this is false.
   */
  authorized: boolean;
  sourceEventId?: string; // from Perception layer
  correlationId?: string; // links to AgentStateEvent chain
}

// ---------------------------------------------------------------------------
// Gesture vocabulary — first release
// ---------------------------------------------------------------------------

export const FIRST_RELEASE_GESTURES = [
  "OPEN_PALM",
  "CLOSED_FIST",
  "INDEX_POINT",
  "TWO_FINGER",
  "PALM_ROTATION",
  "BOTH_HANDS_OPEN",
] as const;
export type FirstReleaseGesture = (typeof FIRST_RELEASE_GESTURES)[number];

export const REGISTERED_GESTURES = [
  "open_palm", // Activate interaction
  "closed_fist", // Pause interaction
  "index_point", // Select visible object
  "two_finger", // Navigate interface
  "palm_rotation", // Rotate 3D scene
  "both_hands_open", // Expand spatial interface
] as const;
export type RegisteredGesture = (typeof REGISTERED_GESTURES)[number];

/** Canonical (lowercase) gesture → intent map per briefing §7. */
export const GESTURE_INTENT_MAP: Readonly<
  Record<RegisteredGesture, { intent: string; impactLevel: ImpactLevel }>
> = {
  open_palm: { intent: "interaction.activate", impactLevel: "LOW" },
  closed_fist: { intent: "interaction.pause", impactLevel: "LOW" },
  index_point: { intent: "select.entity", impactLevel: "MEDIUM" },
  two_finger: { intent: "navigate.interface", impactLevel: "LOW" },
  palm_rotation: { intent: "rotate.scene", impactLevel: "LOW" },
  both_hands_open: { intent: "expand.spatial-interface", impactLevel: "MEDIUM" },
};

/**
 * Uppercase aliases kept for earlier drafts and MediaPipe-style labels.
 */
export const GESTURE_INTENT_MAP_UPPER: Readonly<
  Record<FirstReleaseGesture, { intent: string; impact: ImpactLevel }>
> = {
  OPEN_PALM: { intent: "ACTIVATE_INTERACTION", impact: "LOW" },
  CLOSED_FIST: { intent: "PAUSE_INTERACTION", impact: "LOW" },
  INDEX_POINT: { intent: "SELECT_OBJECT", impact: "MEDIUM" },
  TWO_FINGER: { intent: "NAVIGATE", impact: "MEDIUM" },
  PALM_ROTATION: { intent: "ROTATE_SCENE", impact: "LOW" },
  BOTH_HANDS_OPEN: { intent: "EXPAND_SPATIAL_UI", impact: "MEDIUM" },
};

export function requiresConfirmation(event: InteractionEvent): boolean {
  return event.impactLevel === "HIGH";
}

/**
 * Documentation table mapping agent state to visual animation.
 * The renderer must treat this as guidance; state events are authoritative.
 */
export const AGENT_STATE_ANIMATION: Readonly<Record<AgentState, string>> = {
  IDLE: "slow_particle_breathing",
  LISTENING: "audio_reactive_facial_waves",
  PERCEIVING: "tracking_indicators",
  THINKING: "neural_particle_circulation",
  RESPONDING: "facial_chest_illumination",
  SPEAKING: "lip_synchronization",
  EXECUTING: "task_specific_animation",
  ERROR: "amber_red_warning_state",
  OFFLINE: "static_subdued_appearance",
};
