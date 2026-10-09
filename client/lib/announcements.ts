/**
 * Live Region Announcements
 * Task 28: Phase 2, Sprint 7 — Screen Reader Compatibility
 *
 * Single source of truth for SR-only announcements.
 *
 * Two persistent live regions are created once and reused:
 *   - polite    → `aria-live="polite"`    (form results, loading, navigation)
 *   - assertive → `aria-live="assertive"` (errors that interrupt)
 *
 * Why persistent regions instead of one-per-call: screen readers only announce
 * a *change* inside a live container that was already present. Appending a new
 * container and then filling it is unreliable, and repeated calls used to leave
 * several competing `role="status"` nodes in the DOM. Two fixed regions (the
 * ARIA-recommended pattern) announce deterministically.
 *
 * `announceToScreenReader` in `focus-management.ts` delegates here so the app
 * never has more than one implementation of this behaviour.
 */

export type AnnouncementPriority = 'polite' | 'assertive';

const REGION_IDS: Record<AnnouncementPriority, string> = {
  polite: 'a11y-live-region-polite',
  assertive: 'a11y-live-region-assertive',
};

/**
 * Clear the region, then set the text on the next tick.
 *
 * Repeating the identical message would otherwise be a no-op for the screen
 * reader (the text node never changes, so nothing is announced). Blanking it
 * first guarantees a fresh mutation.
 */
function setRegionText(region: HTMLElement, message: string): void {
  if (region.textContent === message) {
    region.textContent = '';
  }
  region.textContent = message;
}

/**
 * Get (creating on first use) the shared live region for a priority.
 */
function getRegion(priority: AnnouncementPriority): HTMLElement | null {
  if (typeof document === 'undefined') return null;

  const id = REGION_IDS[priority];
  let region = document.getElementById(id);

  if (!region) {
    // The module script is deferred, but a caller could still run before body
    // exists (or in a test that hasn't mounted one). Bail rather than throw.
    if (!document.body) return null;
    region = document.createElement('div');
    region.id = id;
    region.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    // `.sr-only` keeps it out of the visual layout while staying in the
    // accessibility tree — never `display: none`, which would silence it.
    region.className = 'sr-only';
    document.body.appendChild(region);
  }

  return region;
}

/**
 * Announce a message to screen readers.
 *
 * @param message  Text to announce. Empty/whitespace is ignored.
 * @param priority 'polite' (default) waits for a pause; 'assertive' interrupts.
 */
export function announce(message: string, priority: AnnouncementPriority = 'polite'): void {
  if (!message || !message.trim()) return;

  const region = getRegion(priority);
  if (!region) return;

  setRegionText(region, message);
}

/** Convenience wrappers for the two priorities. */
export const announcePolite = (message: string): void => announce(message, 'polite');
export const announceAssertive = (message: string): void => announce(message, 'assertive');

/**
 * Create both live regions up front.
 *
 * Call once during app startup (see `client/src/main.tsx`). Screen readers only
 * announce a mutation inside a live region that already existed, so lazily
 * creating the container on first use risks dropping the first announcement.
 */
export function initAnnouncementRegions(): void {
  if (typeof document === 'undefined') return;

  const create = () => {
    getRegion('polite');
    getRegion('assertive');
  };

  if (document.body) {
    create();
  } else {
    // Called before <body> exists (module scripts in <head>, or a bare import).
    // Defer so the regions are still ready before the app renders.
    document.addEventListener('DOMContentLoaded', create, { once: true });
  }
}

/**
 * Remove both regions. Test-only teardown: the regions are otherwise meant to
 * live for the lifetime of the document.
 */
export function resetAnnouncementRegions(): void {
  if (typeof document === 'undefined') return;
  for (const id of Object.values(REGION_IDS)) {
    document.getElementById(id)?.remove();
  }
}
