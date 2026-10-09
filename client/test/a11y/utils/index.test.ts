import { describe, it, expect } from 'vitest';
import {
  pressKey,
  pressTab,
  pressEnter,
  pressEscape,
  getFocusableElements,
  isVisible,
  isFocusTrapped,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  getAriaAttributes,
  hasAccessibleName,
} from './index';

describe('Accessibility Testing Utilities', () => {
  describe('Keyboard Navigation', () => {
    it('should press a key', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      let keydownFired = false;
      element.addEventListener('keydown', () => {
        keydownFired = true;
      });

      pressKey('Enter', element);
      expect(keydownFired).toBe(true);

      document.body.removeChild(element);
    });

    it('should press Tab key', () => {
      let tabFired = false;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') tabFired = true;
      });

      pressTab();
      expect(tabFired).toBe(true);
    });

    it('should press Enter key', () => {
      const element = document.createElement('button');
      document.body.appendChild(element);

      let enterFired = false;
      element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') enterFired = true;
      });

      pressEnter(element);
      expect(enterFired).toBe(true);

      document.body.removeChild(element);
    });

    it('should press Escape key', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      let escapeFired = false;
      element.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') escapeFired = true;
      });

      pressEscape(element);
      expect(escapeFired).toBe(true);

      document.body.removeChild(element);
    });
  });

  describe('Focus Management', () => {
    it('should get focusable elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button>Button 1</button>
        <a href="/test">Link</a>
        <input type="text" />
        <div>Not focusable</div>
      `;
      document.body.appendChild(container);

      const focusable = getFocusableElements(container);
      expect(focusable).toHaveLength(3);

      document.body.removeChild(container);
    });

    it('should detect visible elements', () => {
      const visible = document.createElement('div');
      visible.style.display = 'block';
      document.body.appendChild(visible);

      const hidden = document.createElement('div');
      hidden.style.display = 'none';
      document.body.appendChild(hidden);

      expect(isVisible(visible)).toBe(true);
      expect(isVisible(hidden)).toBe(false);

      document.body.removeChild(visible);
      document.body.removeChild(hidden);
    });

    it('should check if focus is trapped', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button>Button 1</button>
        <button>Button 2</button>
      `;
      document.body.appendChild(container);

      const buttons = container.querySelectorAll('button');
      (buttons[0] as HTMLElement).focus();

      expect(isFocusTrapped(container)).toBe(true);

      document.body.removeChild(container);
    });
  });

  describe('Contrast Ratio', () => {
    it('should calculate contrast ratio', () => {
      const blackOnWhite = getContrastRatio('#000000', '#ffffff');
      expect(blackOnWhite).toBeCloseTo(21, 0);

      const whiteOnBlack = getContrastRatio('#ffffff', '#000000');
      expect(whiteOnBlack).toBeCloseTo(21, 0);

      const grayOnWhite = getContrastRatio('#666666', '#ffffff');
      expect(grayOnWhite).toBeGreaterThan(3);
    });

    it('should check WCAG AA compliance', () => {
      const blackOnWhite = getContrastRatio('#000000', '#ffffff');
      expect(meetsWCAGAA(blackOnWhite, 16, false)).toBe(true);

      const lowContrast = getContrastRatio('#888888', '#ffffff');
      expect(meetsWCAGAA(lowContrast, 16, false)).toBe(false);
    });

    it('should check WCAG AAA compliance', () => {
      const blackOnWhite = getContrastRatio('#000000', '#ffffff');
      expect(meetsWCAGAAA(blackOnWhite, 16, false)).toBe(true);

      // #767676 on white ≈ 4.54:1 — passes WCAG AA (4.5) but fails AAA (7.0).
      // (#333333 on white is 12.63:1, which actually PASSES AAA — it was the
      // wrong boundary fixture.)
      const mediumContrast = getContrastRatio('#767676', '#ffffff');
      expect(meetsWCAGAAA(mediumContrast, 16, false)).toBe(false);
    });
  });

  describe('ARIA Attributes', () => {
    it('should get ARIA attributes', () => {
      const element = document.createElement('div');
      element.setAttribute('aria-label', 'Test label');
      element.setAttribute('aria-hidden', 'true');

      const ariaAttrs = getAriaAttributes(element);
      expect(ariaAttrs['aria-label']).toBe('Test label');
      expect(ariaAttrs['aria-hidden']).toBe('true');
    });

    it('should check if element has accessible name', () => {
      const withLabel = document.createElement('button');
      withLabel.setAttribute('aria-label', 'Button');
      expect(hasAccessibleName(withLabel)).toBe(true);

      const withText = document.createElement('button');
      withText.textContent = 'Button';
      expect(hasAccessibleName(withText)).toBe(true);

      const withoutName = document.createElement('div');
      expect(hasAccessibleName(withoutName)).toBe(false);
    });
  });
});
