import { useCallback, useEffect, useRef, useState } from "react";
import {
  HUMANOID_STATE_CLIPS,
  ONE_SHOT_STATES,
  type HumanoidState,
} from "../config/humanoid.config";

/**
 * useHumanoidState
 *
 * Single owner of the humanoid interaction state machine. Deterministic and
 * testable: every transition is an explicit action or a fixed timer — no
 * randomness, no inferred AI state.
 *
 * Transitions:
 *   idle ──pointer enter──▶ attention ──pointer leave──▶ idle
 *   any  ──greet()────────▶ welcome ──clip end/timer──▶ idle
 *   any  ──explain()──────▶ explain ──clip end/timer──▶ idle
 *   any  ──observe()──────▶ observe ──timer───────────▶ idle
 *   reduced-motion/static ────────────▶ disabled (terminal)
 */

export interface HumanoidInteraction {
  state: HumanoidState;
  /** Clip name currently requested, or null when disabled. */
  clip: string | null;
  isOneShot: boolean;
  setAttention: (attending: boolean) => void;
  greet: () => void;
  explain: () => void;
  observe: () => void;
  returnToIdle: () => void;
  disable: () => void;
}

const OBSERVE_MS = 6000;
const ONE_SHOT_FALLBACK_MS = 4000;

export function useHumanoidState(
  options: { reducedMotion?: boolean } = {}
): HumanoidInteraction {
  const { reducedMotion = false } = options;
  const [state, setState] = useState<HumanoidState>(
    reducedMotion ? "disabled" : "idle"
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const returnToIdle = useCallback(() => {
    clearTimer();
    setState(reducedMotion ? "disabled" : "idle");
  }, [clearTimer, reducedMotion]);

  /** Schedule the automatic return for one-shot and observe states. */
  const scheduleReturn = useCallback(
    (next: HumanoidState) => {
      clearTimer();
      const ms = ONE_SHOT_STATES.has(next) ? ONE_SHOT_FALLBACK_MS : OBSERVE_MS;
      timerRef.current = setTimeout(() => {
        setState(reducedMotion ? "disabled" : "idle");
      }, ms);
    },
    [clearTimer, reducedMotion]
  );

  const transition = useCallback(
    (next: HumanoidState) => {
      if (reducedMotion) {
        setState("disabled");
        return;
      }
      setState(next);
      if (next === "idle" || next === "attention") {
        clearTimer();
      } else {
        scheduleReturn(next);
      }
    },
    [clearTimer, reducedMotion, scheduleReturn]
  );

  const setAttention = useCallback(
    (attending: boolean) => {
      if (reducedMotion) return;
      // Attention/observe only yield to idle — never interrupt a one-shot.
      if (ONE_SHOT_STATES.has(stateRef.current)) return;
      if (attending) {
        setState("attention");
        clearTimer();
      } else {
        setState((current) =>
          current === "attention" || current === "observe" ? "idle" : current
        );
      }
    },
    [clearTimer, reducedMotion]
  );

  useEffect(() => clearTimer, [clearTimer]);

  // Honour a runtime change of the reduced-motion preference.
  useEffect(() => {
    if (reducedMotion) {
      clearTimer();
      setState("disabled");
    }
  }, [reducedMotion, clearTimer]);

  const clip =
    state === "disabled" ? null : (HUMANOID_STATE_CLIPS[state] ?? "Idle");

  return {
    state,
    clip,
    isOneShot: ONE_SHOT_STATES.has(state),
    setAttention,
    greet: () => transition("welcome"),
    explain: () => transition("explain"),
    observe: () => transition("observe"),
    returnToIdle,
    disable: () => {
      clearTimer();
      setState("disabled");
    },
  };
}
