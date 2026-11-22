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
 */
export function planAgentTransitions(
  current: AgentState,
  signals: AgentSignalInput,
): AgentTransitionStep[] {
  const { speechStatus, isLoading } = signals;

  if (speechStatus === "denied" || speechStatus === "error") {
    return current === "ERROR" || current === "OFFLINE"
      ? []
      : [{ to: "ERROR", source: "system", reason: `speech-${speechStatus}` }];
  }

  // ERROR recovery: only IDLE/OFFLINE are legal exits. One step per
  // signal cycle keeps the path honest and lets the next cycle proceed.
  if (current === "ERROR") {
    return [{ to: "IDLE", source: "system", reason: "error-recovery" }];
  }
  if (current === "OFFLINE") {
    return [{ to: "IDLE", source: "system", reason: "boot" }];
  }
  // Unreachable-in-practice states (never planned, but defensively
  // recoverable): all three have a legal exit to IDLE.
  if (current === "RESPONDING" || current === "SPEAKING" || current === "EXECUTING") {
    return [{ to: "IDLE", source: "system", reason: "state-recovery" }];
  }

  if (isLoading) {
    if (current === "THINKING" || current === "PERCEIVING") {
      // Already en route to THINKING — ensure we land there.
      return current === "THINKING" ? [] : [{ to: "THINKING", source: "cognition" }];
    }
    if (current === "LISTENING") {
      return [{ to: "THINKING", source: "cognition" }];
    }
    if (current === "IDLE") {
      return [
        { to: "PERCEIVING", source: "perception", reason: "user-query-received" },
        { to: "THINKING", source: "cognition" },
      ];
    }
    // ERROR/OFFLINE/RESPONDING/EXECUTING/SPEAKING: no honest path while loading.
    return [];
  }

  if (speechStatus === "listening") {
    if (current === "LISTENING") return [];
    if (current === "IDLE") {
      return [{ to: "LISTENING", source: "voice" }];
    }
    // LISTENING is only reachable from IDLE — settle first, listen next cycle.
    return [{ to: "IDLE", source: "system", reason: "pre-listening-settle" }];
  }

  // Idle speech, not loading: return to IDLE from any transient state.
  if (
    current === "LISTENING" ||
    current === "PERCEIVING" ||
    current === "THINKING"
  ) {
    return [{ to: "IDLE", source: "system", reason: "input-settled" }];
  }
  return [];
}
