/**
 * humanoid.config
 *
 * Single source of truth for the Scene 01 Humanoid Hero: asset path,
 * animation-clip mapping, camera framing, palette and honest status copy.
 *
 * The character is a LOCAL VISUAL SIMULATION. Nothing in this config may
 * imply live AI reasoning, telemetry, or physical actuation — those claims
 * are forbidden by the EIL boundary (cognition ≠ actuation).
 */

export type HumanoidState =
  | "idle"
  | "attention"
  | "observe"
  | "welcome"
  | "explain"
  | "disabled";

/** Verified animation clips shipped inside public/models/feex-sovereign-synthetic.glb. */
export const HUMANOID_CLIP_NAMES = [
  "Acknowledge",
  "Aware",
  "Explain",
  "Idle",
] as const;

export type HumanoidClipName = (typeof HUMANOID_CLIP_NAMES)[number];

/**
 * State → clip contract. `null` means the state plays no clip (the model
 * holds its last pose — used by `disabled` for the static reduced-motion
 * presentation). Clip names MUST exist in the GLB; HumanoidAnimator falls
 * back to "Idle" when a mapped clip is absent.
 */
export const HUMANOID_STATE_CLIPS: Record<HumanoidState, HumanoidClipName | null> = {
  idle: "Idle",
  attention: "Aware",
  observe: "Idle",
  welcome: "Acknowledge",
  explain: "Explain",
  disabled: null,
};

/** States that hold a one-shot clip, then return to idle automatically. */
export const ONE_SHOT_STATES: ReadonlySet<HumanoidState> = new Set(["welcome", "explain"]);

export const HUMANOID_MODEL = {
  src: "/models/feex-sovereign-synthetic.glb",
  /** Character root offset inside the stage (slightly right of centre). */
  position: [0.55, 0, 0] as [number, number, number],
  /** Gentle three-quarter rest rotation (radians). */
  rotationY: -0.28,
  /** Uniform scale applied after bounding-box normalisation. */
  targetHeight: 1.9,
};

export const HUMANOID_CAMERA = {
  fov: 35,
  position: [0, 1.3, 4.4] as [number, number, number],
  target: [0.55, 1.0, 0] as [number, number, number],
};

/** Pointer-gaze limits (radians) — head orientation stays within safe bounds. */
export const GAZE_LIMITS = {
  yaw: 0.55,
  pitch: 0.32,
  damping: 4.5,
};

export const HUMANOID_PALETTE = {
  void: "#050505",
  accent: "#f2e8d8",
  signal: "#f0b45c",
  panel: "rgba(8, 10, 12, 0.72)",
  border: "rgba(255, 255, 255, 0.14)",
} as const;

export const HUMANOID_STATUS = {
  simulation: "LOCAL VISUAL SIMULATION",
  actuation: "NO PHYSICAL ACTUATION",
  identity: "FEEX SOVEREIGN SYNTHETIC",
  presentation: "STYLIZED SYNTHETIC BEING",
} as const;
