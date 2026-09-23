/**
 * WCAG 2.2 AA compliance utilities for the Sovereign Engine.
 * ─────────────────────────────────────────────────────────────────────────────
 * Small, dependency-free hooks + helpers shared by the engine shell and HUD:
 *
 *  • usePrefersReducedMotion() — honors the OS reduced-motion setting and
 *    re-renders when the user flips it mid-session.
 *  • focusFirstDescendant() — moves focus into a freshly opened modal surface.
 *  • useFocusTrap() — keeps Tab / Shift+Tab cycling inside an open dialog
 *    (drawer or palette) and restores focus to the trigger on close.
 *  • activateOnKeys() — shared keyboard activation (Enter / Space) for
 *    custom slider surfaces so pointer and keyboard stay in parity.
 *
 * Mobile note: at <640px the drawer becomes a bottom sheet (see engine shell),
 * but the trap logic is identical regardless of presentation.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Live OS preference for reduced motion; updates when the user toggles it. */
export function usePrefersReducedMotion(): boolean {
  const query = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [reduced, setReduced] = useState<boolean>(query);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    // Safari < 14 fallback — addListener has no removal race worth guarding here
    // because the media query object outlives the component.
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  return reduced;
}

/** Focus the first focusable descendant of a container (usually a dialog). */
function focusFirstDescendant(container: HTMLElement | null) {
  if (!container) return;
  const target = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
  if (target) {
    target.focus({ preventScroll: true });
    return;
  }
  // Fallback: make the surface itself focusable so AT users land in context.
  if (!container.hasAttribute("tabindex")) container.setAttribute("tabindex", "-1");
  container.focus({ preventScroll: true });
}

/**
 * Trap Tab navigation inside `containerRef` while `active` is true.
 * On activation the first control receives focus; on deactivation focus
 * returns to the element that opened the surface.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  active: boolean
) {
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    restoreRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    focusFirstDescendant(container);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const elements = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (current === first || !container.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      restoreRef.current?.focus({ preventScroll: true });
      restoreRef.current = null;
    };
  }, [active, containerRef]);
}

/**
 * Shared Enter/Space activation for custom control surfaces
 * (joystick pad, node chips) so keyboard users get pointer parity.
 */
export function activateOnKeys(
  event: React.KeyboardEvent,
  action: () => void
) {
  if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
    event.preventDefault();
    action();
  }
}

/**
 * Compact hook combining reduced-motion state with a `motionSafe` className
 * token: pass the returned string to animated layers so they freeze when
 * the user asks for reduced motion (`motion-reduce:` Tailwind handles the rest).
 */
export function useMotionPreference() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const getStableCallback = useCallback((fn: () => void) => fn, []);
  return { prefersReducedMotion, getStableCallback };
}

export default useMotionPreference;
