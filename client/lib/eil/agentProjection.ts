/**
 * G5 Stage 3 — Agent-state projection planning (pure).
 *
 * Maps honest client signals (speech lifecycle status, Navigator
 * request in-flight) onto legal AgentState paths. The frozen
 * VALID_TRANSITIONS table is never extended: where a signal has no
 * honest state, no transition is planned.
 *
 * Honest-subset note (A05-03): RESPONDING/EXECUTING require
 * evidenceRefs and no typed evidence references exist client-side, so
 * this planner never targets them. SPEAKING is only reachable from
 * RESPONDING and is therefore also unreachable. PERCEIVING is used for
 * a submitted user query — the agent is perceiving user input — which
 * is the only legal IDLE → THINKING path.
 */

import type { AgentState } from "../../../packages/feex-eil/contracts/agent-state";
import type { VoiceStatus } from "../../hooks/useSpeechNavigation";

export interface AgentTransitionStep {
  to: AgentState;
  source: "voice" | "perception" | "cognition" | "system";
  reason?: string;
}

export interface AgentSignalInput {
  speechStatus: VoiceStatus;
  /** True while a Navigator request is in flight. */
  isLoading: boolean;
}

/**
 * Compute the legal transition path from `current` toward the state
 * implied by the signals. Returns [] when the signals imply no change
 * or no honest path exists.
 *
 * Recovery states (ERROR, OFFLINE, and the evidence-gated states this
 * planner never enters) are first walked back to IDLE — one legal step
 * each — and planning continues from there, so a typed query issued
 * after a microphone denial still reaches THINKING instead of being
 * stranded in ERROR.
 */
export function planAgentTransitions(
  current: AgentState,
  signals: AgentSignalInput,
): AgentTransitionStep[] {
  const { speechStatus, isLoading } = signals;
  const steps: AgentTransitionStep[] = [];
  let state = current;

  if (speechStatus === "denied" || speechStatus === "error") {
    return state === "ERROR" || state === "OFFLINE"
      ? []
      : [{ to: "ERROR", source: "system", reason: `speech-${speechStatus}` }];
  }

  // Recovery prefix: quiescent states first, then plan from IDLE.
  if (state === "ERROR") {
    steps.push({ to: "IDLE", source: "system", reason: "error-recovery" });
    state = "IDLE";
  } else if (state === "OFFLINE") {
    steps.push({ to: "IDLE", source: "system", reason: "boot" });
    state = "IDLE";
  } else if (
    state === "RESPONDING" ||
    state === "SPEAKING" ||
    state === "EXECUTING"
  ) {
    steps.push({ to: "IDLE", source: "system", reason: "state-recovery" });
    state = "IDLE";
  }

  if (isLoading) {
    if (state === "THINKING") return steps;
    if (state === "PERCEIVING" || state === "LISTENING") {
      steps.push({ to: "THINKING", source: "cognition" });
      return steps;
    }
    if (state === "IDLE") {
      steps.push(
        { to: "PERCEIVING", source: "perception", reason: "user-query-received" },
        { to: "THINKING", source: "cognition" },
      );
    }
    return steps;
  }

  if (speechStatus === "listening") {
    if (state === "LISTENING") return steps;
    if (state === "IDLE") {
      steps.push({ to: "LISTENING", source: "voice" });
      return steps;
    }
    // LISTENING is only reachable from IDLE — settle first, listen next cycle.
    steps.push({ to: "IDLE", source: "system", reason: "pre-listening-settle" });
    return steps;
  }

  // "idle", "processing" (transient pre-submit status overwritten
  // synchronously by the hook), "unsupported": settled signals.
  // Return transient states to IDLE.
  if (state === "LISTENING" || state === "PERCEIVING" || state === "THINKING") {
    steps.push({ to: "IDLE", source: "system", reason: "input-settled" });
  }
  return steps;
}
