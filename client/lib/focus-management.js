 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
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
export function trapFocus(container) {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      // Shift+Tab: move to previous element
      if (document.activeElement === firstElement) {
        event.preventDefault();
        _optionalChain([lastElement, 'optionalAccess', _ => _.focus, 'call', _2 => _2()]);
      }
    } else {
      // Tab: move to next element
      if (document.activeElement === lastElement) {
        event.preventDefault();
        _optionalChain([firstElement, 'optionalAccess', _3 => _3.focus, 'call', _4 => _4()]);
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus the first element when trap is activated
  _optionalChain([firstElement, 'optionalAccess', _5 => _5.focus, 'call', _6 => _6()]);

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container) {
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
    container.querySelectorAll(focusableSelectors.join(', '))
  ).filter(isVisible);
}

/**
 * Check if an element is visible
 */
function isVisible(element) {
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
export function restoreFocus(element) {
  if (element && isVisible(element)) {
    element.focus();
  }
}

/**
 * Store the currently focused element for later restoration
 */
export function saveFocus() {
  return document.activeElement ;
}

/**
 * Focus the first focusable element in a container
 */
export function focusFirst(container) {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
  }
}

/**
 * Focus the last focusable element in a container
 */
export function focusLast(container) {
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
export function announceToScreenReader(message, priority = 'polite') {
  announce(message, priority);
}

/**
 * Create a reusable focus trap hook return value
 */





/**
 * Create a focus trap instance
 */
export function createFocusTrap(container) {
  let cleanup = null;

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
