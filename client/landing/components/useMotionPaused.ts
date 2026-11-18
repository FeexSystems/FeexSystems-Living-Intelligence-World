import { useEffect, useState } from 'react';

/**
 * useMotionPaused
 *
 * Subscribes to the global `[PAUSE MOTION]` toggle owned by NavigationOverlay.
 *
 * The toggle is the single source of truth for ambient motion: it writes
 * `document.documentElement.dataset.motionPaused` and broadcasts a
 * `feex:motion-toggle` CustomEvent. Every scene card that plays media needs to
 * honour it, so this hook reads the current state at mount (a card can mount
 * long after the user paused) and then tracks subsequent broadcasts.
 */
export function useMotionPaused(): boolean {
  const [paused, setPaused] = useState(
    () => typeof document !== 'undefined' && document.documentElement.dataset.motionPaused === 'true'
  );

  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ paused?: boolean }>).detail;
      if (typeof detail?.paused === 'boolean') setPaused(detail.paused);
    };
    window.addEventListener('feex:motion-toggle', update);
    return () => window.removeEventListener('feex:motion-toggle', update);
  }, []);

  return paused;
}
