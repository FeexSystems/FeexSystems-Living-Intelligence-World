 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }






















import { AGENT_STATES } from "../contracts/agent-state";
import { AGENT_STATE_ANIMATION } from "../contracts/interaction-event";






















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
} ;

const PROFILES = {
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
  state,
) {
  return PROFILES[state];
}

/** Type guard over the canonical runtime state list (AGENT_STATES). */
function isAgentState(value) {
  return (AGENT_STATES ).includes(value);
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
  datum,
) {
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

























export function getHumanoidRenderProfile(
  state,
  options,
) {
  const base = getHumanoidAnimationProfile(state);
  const event = _optionalChain([options, 'optionalAccess', _ => _.event]);
  const profile = { ...base };
  if (event && event.state === state) {
    if (_optionalChain([options, 'optionalAccess', _2 => _2.exposeConfidence]) && typeof event.confidence === "number") {
      profile.confidence = event.confidence;
    }
    if (event.reason) profile.reason = event.reason;
    profile.source = event.source;
  }
  return profile;
}
