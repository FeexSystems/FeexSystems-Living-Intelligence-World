/**
 * lab-presentation.ts — FEEX-SORL EIL presentation → clip resolver.
 *
 * Pure function layer between the validated EIL contracts and the
 * humanoid clip contract (docs/program/FEEX-SORL-CHARACTER-CONTRACT.md).
 * It introduces NO new state authority:
 *
 *  - AgentState input is the existing EIL AgentStateEvent contract;
 *    ordering/validation stays in packages/feex-eil.
 *  - Presentation resolution reuses resolvePresentationState verbatim
 *    (fail-closed UNAVAILABLE on ERROR/OFFLINE, intent-only states).
 *  - Evidence tier reuses resolveEvidenceStatus (absent → UNAVAILABLE).
 *  - Clip names come from the 11-clip contract; the renderer's existing
 *    missing-clip → Idle fallback + diagnostic handles unshipped clips.
 *
 * Local visitor interactions can only supply PresentationIntent — they
 * can never fabricate an AgentState.
 */

import {
  resolvePresentationState,
  resolveEvidenceStatus,
  type HumanoidPresentationState,
  type PresentationIntent,
} from "../../../packages/feex-eil/renderer/presentation-state";
import type { AgentState } from "../../../packages/feex-eil/contracts/agent-state";

/**
 * Presentation state → contract clip. States without a dedicated clip
 * resolve to the nearest honest contract clip; UNAVAILABLE always wins
 * (fail-closed, matches presentation-state precedence).
 */
export const PRESENTATION_TO_CLIP: Record<HumanoidPresentationState, string> = {
  IDLE: "Idle",
  AWARE: "Aware",
  PERCEIVING: "Aware",       // ambient attention shares the Aware clip
  THINKING: "Think",
  LISTENING: "Listen",
  SPEAKING: "Speak",
  GESTURING: "Explain",      // EXECUTING maps here upstream; open-hand explain
  INSPECTING: "Inspect",
  UNAVAILABLE: "Unavailable",
};

export interface LabPresentationInput {
  /** Validated EIL agent state; null/undefined → UNAVAILABLE. */
  agentState?: AgentState | null;
  /** Visitor/application intent — the ONLY non-agent input allowed. */
  intent?: PresentationIntent | null;
  /** Evidence tier; absent/unknown → UNAVAILABLE evidence (not a clip
   *  override — evidence never forces a pose by itself). */
  evidenceStatus?: unknown;
}

export interface LabPresentationResult {
  presentation: HumanoidPresentationState;
  clip: string;
  /** Machine-readable reason when the result is degraded. */
  diagnostic: string | null;
}

export function resolveLabPresentation(
  input: LabPresentationInput,
): LabPresentationResult {
  const presentation = resolvePresentationState(input.agentState, input.intent);
  const clip = PRESENTATION_TO_CLIP[presentation];

  const diagnostics: string[] = [];
  if (!input.agentState) {
    diagnostics.push("NO_AGENT_STATE");
  }
  const evidence = resolveEvidenceStatus(input.evidenceStatus);
  if (evidence === "UNAVAILABLE" && input.evidenceStatus !== undefined) {
    diagnostics.push("EVIDENCE_UNAVAILABLE");
  }

  return {
    presentation,
    clip,
    diagnostic: diagnostics.length ? diagnostics.join("|") : null,
  };
}

/** Clip names the current synthetic GLB actually ships (rollback asset). */
export const SYNTHETIC_GL_B_CLIPS = ["Idle", "Aware", "Acknowledge", "Explain"] as const;

/**
 * True when the resolved clip is expected to be missing from the
 * current GLB and will fall back to Idle downstream. Diagnostic only —
 * never changes the requested clip.
 */
export function clipLikelyMissing(
  clip: string,
  available: readonly string[],
): boolean {
  return !available.includes(clip);
}
