/**
 * FEEX EIL — Renderer animation profile  v0.1.0
 *
 * Pure mapping from canonical AgentState (+ optional AgentStateEvent
 * metadata) to visual animation parameters.
 *
 * Rules:
 *   - States come only from the contract; this module never invents states.
 *   - AGENT_STATE_ANIMATION (interaction-event.ts) is documentation
 *     guidance — the table below is its implementation, keyed by the
 *     same state names.
 *   - `confidence` is NEVER synthesized here. If the event omits it,
 *     the profile carries no confidence and the renderer must not
 *     display one.
 *   - UNAVAILABLE / missing state data resolves to a static OFFLINE
 *     profile — an absent state, never a fabricated one.
 */

import type {
  AgentState,
  AgentStateEvent,
  LabeledDatum,
} from "../contracts/agent-state";
import { AGENT_STATES } from "../contracts/agent-state";
import { AGENT_STATE_ANIMATION } from "../contracts/interaction-event";

export interface HumanoidAnimationProfile {
  /** Canonical state this profile renders. */
  state: AgentState;
  /** Documentation-table animation name (AGENT_STATE_ANIMATION). */
  guidance: string;
  /** Temporal speed multiplier, 0 (frozen) .. 1 (full rate). */
  speed: number;
  /** Spatial displacement amplitude, 0 (static) .. 1 (full). */
  amplitude: number;
  /** Directional flow bias for particle advection, -1 .. 1. */
  flowBias: number;
  /** Emissive intensity, 0 (dark) .. 1 (full glow). */
  glow: number;
  /** Core particle color (hex). */
  coreColor: string;
  /** Accent particle color (hex). */
  accentColor: string;
  /** UI accent for HUD/DOM overlays (hex). */
  uiAccent: string;
}

const PALETTE = {
  idleCore: "#67e8f9",
  idleAccent: "#0ea5e9",
  thinkCore: "#a78bfa",
  thinkAccent: "#6366f1",
  warmCore: "#fbbf24",
  warmAccent: "#f97316",
  errorCore: "#f87171",
  errorAccent: "#dc2626",
  offlineCore: "#3f3f46",
  offlineAccent: "#52525b",
} as const;

const PROFILES: Readonly<Record<AgentState, HumanoidAnimationProfile>> = {
  IDLE: {
    state: "IDLE",
    guidance: AGENT_STATE_ANIMATION.IDLE,
    speed: 0.15,
    amplitude: 0.25,
    flowBias: 0.0,
    glow: 0.35,
    coreColor: PALETTE.idleCore,
    accentColor: PALETTE.idleAccent,
    uiAccent: "#22d3ee",
  },
  LISTENING: {
    state: "LISTENING",
    guidance: AGENT_STATE_ANIMATION.LISTENING,
    speed: 0.55,
    amplitude: 0.5,
    flowBias: 0.2,
    glow: 0.6,
    coreColor: PALETTE.idleCore,
    accentColor: PALETTE.thinkAccent,
    uiAccent: "#38bdf8",
  },
  PERCEIVING: {
    state: "PERCEIVING",
    guidance: AGENT_STATE_ANIMATION.PERCEIVING,
    speed: 0.45,
    amplitude: 0.55,
    flowBias: 0.35,
    glow: 0.65,
    coreColor: PALETTE.idleCore,
    accentColor: PALETTE.thinkAccent,
    uiAccent: "#818cf8",
  },
  THINKING: {
    state: "THINKING",
    guidance: AGENT_STATE_ANIMATION.THINKING,
    speed: 0.8,
    amplitude: 0.6,
    flowBias: 0.5,
    glow: 0.75,
    coreColor: PALETTE.thinkCore,
    accentColor: PALETTE.thinkAccent,
    uiAccent: "#a78bfa",
  },
  RESPONDING: {
    state: "RESPONDING",
    guidance: AGENT_STATE_ANIMATION.RESPONDING,
    speed: 0.7,
    amplitude: 0.65,
    flowBias: 0.3,
    glow: 0.85,
    coreColor: PALETTE.warmCore,
    accentColor: PALETTE.idleAccent,
    uiAccent: "#fbbf24",
  },
  SPEAKING: {
    state: "SPEAKING",
    guidance: AGENT_STATE_ANIMATION.SPEAKING,
    speed: 0.9,
    amplitude: 0.75,
    flowBias: 0.4,
    glow: 0.9,
    coreColor: PALETTE.warmCore,
    accentColor: PALETTE.warmAccent,
    uiAccent: "#fb923c",
  },
  EXECUTING: {
    state: "EXECUTING",
    guidance: AGENT_STATE_ANIMATION.EXECUTING,
    speed: 1.0,
    amplitude: 0.8,
    flowBias: 0.6,
    glow: 0.95,
    coreColor: PALETTE.warmCore,
    accentColor: PALETTE.errorAccent,
    uiAccent: "#f59e0b",
  },
  ERROR: {
    state: "ERROR",
    guidance: AGENT_STATE_ANIMATION.ERROR,
    speed: 0.2,
    amplitude: 0.3,
    flowBias: 0.0,
    glow: 0.7,
    coreColor: PALETTE.errorCore,
    accentColor: PALETTE.errorAccent,
    uiAccent: "#ef4444",
  },
  OFFLINE: {
    state: "OFFLINE",
    guidance: AGENT_STATE_ANIMATION.OFFLINE,
    speed: 0,
    amplitude: 0,
    flowBias: 0,
    glow: 0.15,
    coreColor: PALETTE.offlineCore,
    accentColor: PALETTE.offlineAccent,
    uiAccent: "#71717a",
  },
};

export function getHumanoidAnimationProfile(
  state: AgentState,
): HumanoidAnimationProfile {
  return PROFILES[state];
}

/** Type guard over the canonical runtime state list (AGENT_STATES). */
function isAgentState(value: string): value is AgentState {
  return (AGENT_STATES as readonly string[]).includes(value);
}

/**
 * Resolve the state a renderer should display from a labeled datum.
 *
 * - `null` or `UNAVAILABLE` → OFFLINE profile (absent state, not fake).
 * - `ERROR` label with a value → the labeled state's profile is still
 *   shown, but callers may prefer the ERROR profile via `resolveErrorProfile`.
 * - Any other label → the datum's value, if it is a valid AgentState.
 */
export function resolveLabeledAgentState(
  datum: LabeledDatum<AgentState> | AgentState | null | undefined,
): AgentState {
  if (datum == null) return "OFFLINE";
  if (typeof datum === "string") {
    // Runtime input is untrusted: a bare string is only honoured when it
    // names a canonical state. Anything else is an absent state → OFFLINE,
    // never a fabricated profile.
    return isAgentState(datum) ? datum : "OFFLINE";
  }
  if (datum.sourceLabel === "UNAVAILABLE") return "OFFLINE";
  return datum.value;
}

/**
 * Optional event metadata the renderer MAY honor. Everything here is
 * already validated upstream; the profile only reads, never trusts
 * unvalidated fields for authority decisions.
 */
export interface HumanoidRenderOptions {
  /**
   * Latest AgentStateEvent for this agent, if the host has one.
   * Used only for `reason`/`debug` passthrough to DOM overlays —
   * never to override `state`.
   */
  event?: AgentStateEvent;
  /**
   * When true and the event carries a calibrated `confidence`, expose it
   * on the returned profile for HUD display. When the event omits
   * confidence, `confidence` stays undefined — the UI must render
   * absence, not a default.
   */
  exposeConfidence?: boolean;
}

export interface HumanoidRenderProfile extends HumanoidAnimationProfile {
  /** Calibrated confidence from the event, only when supplied upstream. */
  confidence?: number;
  /** Human-readable transition reason (display-only). */
  reason?: string;
  /** Source that produced the transition (display-only). */
  source?: AgentStateEvent["source"];
}

export function getHumanoidRenderProfile(
  state: AgentState,
  options?: HumanoidRenderOptions,
): HumanoidRenderProfile {
  const base = getHumanoidAnimationProfile(state);
  const event = options?.event;
  const profile: HumanoidRenderProfile = { ...base };
  if (event && event.state === state) {
    if (options?.exposeConfidence && typeof event.confidence === "number") {
      profile.confidence = event.confidence;
    }
    if (event.reason) profile.reason = event.reason;
    profile.source = event.source;
  }
  return profile;
}
