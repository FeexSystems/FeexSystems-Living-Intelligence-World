/**
 * Accessibility Testing Utilities
 * Task 18: Phase 2, Sprint 5
 *
 * Helpers for testing keyboard navigation, focus management, and contrast ratios
 */

/**
 * Simulate pressing a key
 */
export const pressKey = (key: string, element?: HTMLElement) => {
  const event = new KeyboardEvent('keydown', {
    key,
    code: key,
    bubbles: true,
    cancelable: true,
  });

  if (element) {
    element.dispatchEvent(event);
  } else {
    document.dispatchEvent(event);
  }
};

/**
 * Simulate Tab key press
 */
export const pressTab = (shiftKey = false) => {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    code: 'Tab',
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
};

/**
 * Simulate Enter key press
 */
export const pressEnter = (element?: HTMLElement) => {
  pressKey('Enter', element);
};

/**
 * Simulate Escape key press
 */
export const pressEscape = (element?: HTMLElement) => {
  pressKey('Escape', element);
};

/**
 * Get all focusable elements within a container
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
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
  ) as HTMLElement[];
};

/**
 * Check if an element is visible
 */
export const isVisible = (element: HTMLElement): boolean => {
  if (!element) return false;

  const style = window.getComputedStyle(element);

  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.visibility === 'collapse' ||
    style.opacity === '0'
  ) {
    return false;
  }

  // jsdom performs no layout, so getBoundingClientRect() is always 0×0 and
  // cannot be used to infer visibility. Only apply the dimension check when the
  // environment actually lays out (or when dimensions have been stubbed > 0).
  const rect = element.getBoundingClientRect();
  const hasLayout = rect.width > 0 || rect.height > 0;
  const layoutIsMeaningful =
    typeof element.offsetWidth === 'number' &&
    element.offsetWidth > 0;

  if (!layoutIsMeaningful) return true;
  return hasLayout;
};

/**
 * Check if focus is trapped within a container
 */
export const isFocusTrapped = (container: HTMLElement): boolean => {
  const focusableElements = getFocusableElements(container).filter(isVisible);
  const activeElement = document.activeElement;

  return focusableElements.includes(activeElement as HTMLElement);
};

/**
 * Calculate contrast ratio between two colors
 * @param foreground - Foreground color in hex format (e.g., '#000000')
 * @param background - Background color in hex format (e.g., '#ffffff')
 * @returns Contrast ratio (1-21)
 */
export const getContrastRatio = (foreground: string, background: string): number => {
  const getLuminance = (hex: string): number => {
    const rgb = hex
      .replace('#', '')
      .match(/.{2}/g)
      ?.map((x) => parseInt(x, 16)) || [0, 0, 0];

    const [r, g, b] = rgb.map((val) => {
      const sRGB = val / 255;
      return sRGB <= 0.03928
        ? sRGB / 12.92
        : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if contrast ratio meets WCAG AA standards
 * @param ratio - Contrast ratio to check
 * @param fontSize - Font size in pixels
 * @param bold - Whether text is bold
 * @returns true if contrast meets AA standards
 */
export const meetsWCAGAA = (
  ratio: number,
  fontSize: number = 16,
  bold: boolean = false
): boolean => {
  // WCAG AA requires 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt+ bold)
  const isLargeText = fontSize >= 18 || (fontSize >= 14 && bold);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
};

/**
 * Check if contrast ratio meets WCAG AAA standards
 * @param ratio - Contrast ratio to check
 * @param fontSize - Font size in pixels
 * @param bold - Whether text is bold
 * @returns true if contrast meets AAA standards
 */
export const meetsWCAGAAA = (
  ratio: number,
  fontSize: number = 16,
  bold: boolean = false
): boolean => {
  // WCAG AAA requires 7:1 for normal text, 4.5:1 for large text
  const isLargeText = fontSize >= 18 || (fontSize >= 14 && bold);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
};

/**
 * Get ARIA attributes from an element
 */
export const getAriaAttributes = (element: HTMLElement): Record<string, string | null> => {
  const ariaAttributes: Record<string, string | null> = {};

  for (const attr of element.attributes) {
    if (attr.name.startsWith('aria-')) {
      ariaAttributes[attr.name] = attr.value;
    }
  }

  return ariaAttributes;
};

/**
 * Check if an element has a valid accessible name
 */
export const hasAccessibleName = (element: HTMLElement): boolean => {
  const ariaLabel = element.getAttribute('aria-label');
  const ariaLabelledby = element.getAttribute('aria-labelledby');
  const textContent = element.textContent?.trim();

  return !!(ariaLabel || ariaLabelledby || textContent);
};
