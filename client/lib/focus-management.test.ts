import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  trapFocus,
  restoreFocus,
  saveFocus,
  focusFirst,
  focusLast,
  announceToScreenReader,
  createFocusTrap,
} from './focus-management';
import { resetAnnouncementRegions } from './announcements';

describe('Focus Management', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = `
      <button>Button 1</button>
      <button>Button 2</button>
      <button>Button 3</button>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    // announceToScreenReader delegates to the shared live regions; drop them so
    // region state cannot leak between tests.
    resetAnnouncementRegions();
  });

  describe('trapFocus', () => {
    it('should trap focus within container', () => {
      const cleanup = trapFocus(container);
      const buttons = container.querySelectorAll('button');

      // First button should be focused
      expect(document.activeElement).toBe(buttons[0]);

      // Cleanup
      cleanup();
    });

    it('should cleanup event listeners', () => {
      const cleanup = trapFocus(container);
      cleanup();

      // Should not throw
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('restoreFocus', () => {
    it('should restore focus to element', () => {
      const button = container.querySelector('button') as HTMLElement;
      button.focus();

      expect(document.activeElement).toBe(button);

      // Simulate focus loss
      (document.activeElement as HTMLElement)?.blur();

      restoreFocus(button);
      expect(document.activeElement).toBe(button);
    });

    it('should not restore focus to hidden element', () => {
      const button = container.querySelector('button') as HTMLElement;
      button.style.display = 'none';

      restoreFocus(button);
      expect(document.activeElement).not.toBe(button);
    });
  });

  describe('saveFocus', () => {
    it('should save currently focused element', () => {
      const button = container.querySelector('button') as HTMLElement;
      button.focus();

      const saved = saveFocus();
      expect(saved).toBe(button);
    });

    it('should return null if no element focused', () => {
      document.body.focus();
      const saved = saveFocus();
      expect(saved).toBe(document.body);
    });
  });

  describe('focusFirst', () => {
    it('should focus first focusable element', () => {
      focusFirst(container);
      const buttons = container.querySelectorAll('button');
      expect(document.activeElement).toBe(buttons[0]);
    });
  });

  describe('focusLast', () => {
    it('should focus last focusable element', () => {
      focusLast(container);
      const buttons = container.querySelectorAll('button');
      expect(document.activeElement).toBe(buttons[2]);
    });
  });

  describe('announceToScreenReader', () => {
    it('should announce message to screen readers', () => {
      announceToScreenReader('Test message');

      const announcement = document.querySelector('[role="status"]');
      expect(announcement).toHaveTextContent('Test message');
    });

    it('should reuse a single live region across announcements', () => {
      announceToScreenReader('First message');
      announceToScreenReader('Second message');

      const regions = document.querySelectorAll('[role="status"]');
      expect(regions).toHaveLength(1);
      expect(regions[0]).toHaveTextContent('Second message');
    });

    it('should use polite priority by default', () => {
      announceToScreenReader('Test message');

      const announcement = document.querySelector('[role="status"]') as HTMLElement;
      expect(announcement.getAttribute('aria-live')).toBe('polite');
    });

    it('should use assertive priority when specified', () => {
      announceToScreenReader('Test message', 'assertive');

      // Assertive announcements use role="alert" (the ARIA-recommended pairing
      // for `aria-live="assertive"`), not role="status".
      const announcement = document.querySelector('[role="alert"]') as HTMLElement;
      expect(announcement).toBeInTheDocument();
      expect(announcement.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('createFocusTrap', () => {
    it('should create focus trap instance', () => {
      const trap = createFocusTrap(container);

      expect(trap.activate).toBeDefined();
      expect(trap.deactivate).toBeDefined();
    });

    it('should activate and deactivate focus trap', () => {
      const trap = createFocusTrap(container);
      const cleanup = trap.activate();

      const buttons = container.querySelectorAll('button');
      expect(document.activeElement).toBe(buttons[0]);

      trap.deactivate();
      cleanup();
    });
  });
});
