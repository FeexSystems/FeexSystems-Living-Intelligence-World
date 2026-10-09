/**
 * Focus Management Utilities
 * Task 22: Phase 2, Sprint 6
 *
 * Utilities for managing focus in modals, dropdowns, and other interactive components.
 */

import { announce } from './announcements';

/**
 * Trap focus within a container element
 * Used for modals, dropdowns, and command palettes
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      // Shift+Tab: move to previous element
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab: move to next element
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus the first element when trap is activated
  firstElement?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ];

  return Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelectors.join(', '))
  ).filter(isVisible);
}

/**
 * Check if an element is visible
 */
function isVisible(element: HTMLElement): boolean {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}

/**
 * Restore focus to a previously focused element
 * Used when closing modals, dropdowns, or dialogs
 */
export function restoreFocus(element: HTMLElement | null): void {
  if (element && isVisible(element)) {
    element.focus();
  }
}

/**
 * Store the currently focused element for later restoration
 */
export function saveFocus(): HTMLElement | null {
  return document.activeElement as HTMLElement;
}

/**
 * Focus the first focusable element in a container
 */
export function focusFirst(container: HTMLElement): void {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
  }
}

/**
 * Focus the last focusable element in a container
 */
export function focusLast(container: HTMLElement): void {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[focusableElements.length - 1].focus();
  }
}

/**
 * Announce a message to screen readers.
 *
 * Thin wrapper over the canonical live-region implementation in
 * `@/lib/announcements` (Task 28) so the app has exactly one set of live
 * regions. Kept for backwards compatibility with existing callers.
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  announce(message, priority);
}

/**
 * Create a reusable focus trap hook return value
 */
export interface FocusTrapResult {
  activate: () => () => void;
  deactivate: () => void;
}

/**
 * Create a focus trap instance
 */
export function createFocusTrap(container: HTMLElement): FocusTrapResult {
  let cleanup: (() => void) | null = null;

  return {
    activate: () => {
      cleanup = trapFocus(container);
      return cleanup;
    },
    deactivate: () => {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    },
  };
}
