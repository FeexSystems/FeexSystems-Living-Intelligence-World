













 




 // Incoming World Model or robotics events

export const INTERACTION_CHANNELS = [
  "voice",
  "gesture",
  "keyboard",
  "system",
  "telemetry",
] ;

 


 // Tool execution, external API call, robotic command

export const IMPACT_LEVELS = ["LOW", "MEDIUM", "HIGH"] ;





















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
] ;
 

export const REGISTERED_GESTURES = [
  "open_palm", // Activate interaction
  "closed_fist", // Pause interaction
  "index_point", // Select visible object
  "two_finger", // Navigate interface
  "palm_rotation", // Rotate 3D scene
  "both_hands_open", // Expand spatial interface
] ;
 

/** Canonical (lowercase) gesture → intent map per briefing §7. */
export const GESTURE_INTENT_MAP

 = {
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
export const GESTURE_INTENT_MAP_UPPER

 = {
  OPEN_PALM: { intent: "ACTIVATE_INTERACTION", impact: "LOW" },
  CLOSED_FIST: { intent: "PAUSE_INTERACTION", impact: "LOW" },
  INDEX_POINT: { intent: "SELECT_OBJECT", impact: "MEDIUM" },
  TWO_FINGER: { intent: "NAVIGATE", impact: "MEDIUM" },
  PALM_ROTATION: { intent: "ROTATE_SCENE", impact: "LOW" },
  BOTH_HANDS_OPEN: { intent: "EXPAND_SPATIAL_UI", impact: "MEDIUM" },
};

export function requiresConfirmation(event) {
  return event.impactLevel === "HIGH";
}

/**
 * Documentation table mapping agent state to visual animation.
 * The renderer must treat this as guidance; state events are authoritative.
 */
export const AGENT_STATE_ANIMATION = {
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
