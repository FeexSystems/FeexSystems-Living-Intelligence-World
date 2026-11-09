import { useEffect, useRef, type ReactNode } from "react";

/**
 * TransitionRouter — React Router / Vite adaptation of `next-transition-router`'s
 * TransitionRouter, covering the API surface used by Hyperiux transition effects
 * (`block-transition`, `chess-grid-transition`).
 *
 * Semantics preserved:
 *   - `leave(next)`  : cover animation; `next()` is invoked on completion.
 *   - `enter(next)`  : reveal animation; `next()` is invoked on completion.
 *   - Each returns an optional cleanup function.
 *
 * Triggering:
 *   - `auto` (default true): plays `enter` once on mount.
 *   - `window` event `hyperiux:transition` with detail `{ sequence?: boolean }`:
 *       - default: plays the full leave → enter wipe.
 *       - `{ sequence: false }`: plays only `enter` (reveal).
 *   Landing scene changes can dispatch this event for cinematic wipes.
 */

type AnimFn = (next: () => void) => (() => void) | void;

export interface TransitionRouterProps {
  children?: ReactNode;
  auto?: boolean;
  leave?: AnimFn;
  enter?: AnimFn;
}

export function TransitionRouter({
  children,
  auto = true,
  leave,
  enter,
}: TransitionRouterProps) {
  const leaveRef = useRef<AnimFn | undefined>(leave);
  const enterRef = useRef<AnimFn | undefined>(enter);
  leaveRef.current = leave;
  enterRef.current = enter;
  const cleanupsRef = useRef<Array<() => void>>([]);

  const runPhase = (fn: AnimFn | undefined, next: () => void) => {
    cleanupsRef.current.forEach((cleanup) => cleanup?.());
    cleanupsRef.current = [];
    if (!fn) {
      next();
      return;
    }
    const cleanup = fn(next);
    if (typeof cleanup === "function") cleanupsRef.current.push(cleanup);
  };

  useEffect(() => {
    if (auto) {
      runPhase(enterRef.current, () => {});
    }

    const onPlay = (event: Event) => {
      const detail = (event as CustomEvent<{ sequence?: boolean }>).detail;
      if (detail?.sequence === false) {
        runPhase(enterRef.current, () => {});
        return;
      }
      runPhase(leaveRef.current, () => {
        runPhase(enterRef.current, () => {});
      });
    };

    window.addEventListener("hyperiux:transition", onPlay);
    return () => {
      window.removeEventListener("hyperiux:transition", onPlay);
      cleanupsRef.current.forEach((cleanup) => cleanup?.());
      cleanupsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  return <>{children}</>;
}

export function playHyperiuxTransition(sequence = true) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("hyperiux:transition", { detail: { sequence } })
  );
}

export default TransitionRouter;
