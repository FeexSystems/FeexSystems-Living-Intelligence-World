/**
 * G5 Stage 3 — Agent-state projection planning (pure).
 *
 * Maps honest client signals (speech lifecycle status, Navigator
 * request in-flight) onto legal AgentState paths. The frozen
 * VALID_TRANSITIONS table is never extended: where a signal has no
 * honest state, no transition is planned.
 *
 * Honest-subset note (A05-03, extended Phase 5): EXECUTING still has
 * no honest client signal and is never planned. PERCEIVING is used for
 * a submitted user query — the agent is perceiving user input — which
 * is the only legal IDLE → THINKING path.
 *
 * Phase 5 (HoloKai session projection): RESPONDING and SPEAKING are
 * reachable ONLY through real session evidence —
 *   - RESPONDING requires non-empty `evidenceRefs` harvested from the
 *     actual Navigator response (repository slugs, commit SHAs);
 *     the adapter rejects evidence-deficient entries regardless.
 *   - SPEAKING requires `playbackConfirmed`, which the caller may set
 *     only from confirmed speech-synthesis playback (utterance
 *     onstart → onend/onerror). speak()/synthesis availability alone
 *     is never sufficient — no optimistic SPEAKING.
 */

import type { AgentState } from "../../../packages/feex-eil/contracts/agent-state";
import type { VoiceStatus } from "../../hooks/useSpeechNavigation";

export interface AgentTransitionStep {
  to: AgentState;
  source: "voice" | "perception" | "cognition" | "system";
  reason?: string;
  /** Real evidence identifiers required for RESPONDING/EXECUTING entry. */
  evidenceRefs?: string[];
}

export interface AgentSignalInput {
  speechStatus: VoiceStatus;
  /** True while a Navigator request is in flight. */
  isLoading: boolean;
  /**
   * True only while speech playback is CONFIRMED active (synthesis
   * utterance onstart fired and onend/onerror has not). Never set from
   * intent to speak — that would be optimistic SPEAKING.
   */
  playbackConfirmed?: boolean;
  /**
   * Evidence identifiers returned by the Navigator response
   * (e.g. repository slugs, artifact commit SHAs). Empty/absent means
   * no honest path to RESPONDING exists.
   */
  evidenceRefs?: readonly string[];
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
  const playbackConfirmed = signals.playbackConfirmed === true;
  const evidenceRefs = (signals.evidenceRefs ?? []).filter(
    (ref): ref is string => typeof ref === "string" && ref.trim().length > 0,
  );
  const steps: AgentTransitionStep[] = [];
  let state = current;

  if (speechStatus === "denied" || speechStatus === "error") {
    return state === "ERROR" || state === "OFFLINE"
      ? []
      : [{ to: "ERROR", source: "system", reason: `speech-${speechStatus}` }];
  }

  // Phase 5: confirmed playback is the ONLY path to SPEAKING, and only
  // via RESPONDING (which itself requires evidence — enforced again by
  // the adapter). While playback is confirmed the agent must not be
  // settled back to IDLE by ambient signals.
  if (playbackConfirmed) {
    if (state === "SPEAKING") return steps;
    if (state === "RESPONDING") {
      steps.push({ to: "SPEAKING", source: "voice", reason: "playback-confirmed" });
      return steps;
    }
    if (state === "THINKING" && evidenceRefs.length > 0) {
      steps.push(
        {
          to: "RESPONDING",
          source: "cognition",
          reason: "navigator-evidence",
          evidenceRefs: [...evidenceRefs],
        },
        { to: "SPEAKING", source: "voice", reason: "playback-confirmed" },
      );
      return steps;
    }
    // IDLE/LISTENING/PERCEIVING/ERROR/OFFLINE/EXECUTING: no honest path
    // to SPEAKING — fall through to recovery/settle planning.
  }

  // Playback ended (or was never confirmed): SPEAKING and RESPONDING
  // settle deterministically. RESPONDING without playback means the
  // response was delivered as text only (muted/unsupported synthesis).
  if (!playbackConfirmed && state === "SPEAKING") {
    return [{ to: "IDLE", source: "system", reason: "playback-ended" }];
  }
  if (!playbackConfirmed && state === "RESPONDING") {
    return [{ to: "IDLE", source: "system", reason: "response-settled" }];
  }

  // Recovery prefix: quiescent states first, then plan from IDLE.
  if (state === "ERROR") {
    steps.push({ to: "IDLE", source: "system", reason: "error-recovery" });
    state = "IDLE";
  } else if (state === "OFFLINE") {
    steps.push({ to: "IDLE", source: "system", reason: "boot" });
    state = "IDLE";
  } else if (state === "EXECUTING") {
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

  // Phase 5: Navigator response received (loading settled) with real
  // evidence refs and quiescent speech → RESPONDING. Without evidence
  // the adapter would reject the entry anyway; the planner simply
  // never proposes it. SPEAKING is NOT entered here — it requires a
  // later playbackConfirmed signal.
  const speechQuiescent =
    speechStatus === "idle" ||
    speechStatus === "processing" ||
    speechStatus === "unsupported";
  if (
    !playbackConfirmed &&
    state === "THINKING" &&
    speechQuiescent &&
    evidenceRefs.length > 0
  ) {
    steps.push({
      to: "RESPONDING",
      source: "cognition",
      reason: "navigator-evidence",
      evidenceRefs: [...evidenceRefs],
    });
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
