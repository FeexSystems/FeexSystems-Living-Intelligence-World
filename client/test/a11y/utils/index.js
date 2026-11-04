 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Accessibility Testing Utilities
 * Task 18: Phase 2, Sprint 5
 *
 * Helpers for testing keyboard navigation, focus management, and contrast ratios
 */

/**
 * Simulate pressing a key
 */
export const pressKey = (key, element) => {
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
export const pressEnter = (element) => {
  pressKey('Enter', element);
};

/**
 * Simulate Escape key press
 */
export const pressEscape = (element) => {
  pressKey('Escape', element);
};

/**
 * Get all focusable elements within a container
 */
export const getFocusableElements = (container) => {
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
  ) ;
};

/**
 * Check if an element is visible
 */
export const isVisible = (element) => {
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
export const isFocusTrapped = (container) => {
  const focusableElements = getFocusableElements(container).filter(isVisible);
  const activeElement = document.activeElement;

  return focusableElements.includes(activeElement );
};

/**
 * Calculate contrast ratio between two colors
 * @param foreground - Foreground color in hex format (e.g., '#000000')
 * @param background - Background color in hex format (e.g., '#ffffff')
 * @returns Contrast ratio (1-21)
 */
export const getContrastRatio = (foreground, background) => {
  const getLuminance = (hex) => {
    const rgb = _optionalChain([hex
, 'access', _ => _.replace, 'call', _2 => _2('#', '')
, 'access', _3 => _3.match, 'call', _4 => _4(/.{2}/g)
, 'optionalAccess', _5 => _5.map, 'call', _6 => _6((x) => parseInt(x, 16))]) || [0, 0, 0];

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
  ratio,
  fontSize = 16,
  bold = false
) => {
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
  ratio,
  fontSize = 16,
  bold = false
) => {
  // WCAG AAA requires 7:1 for normal text, 4.5:1 for large text
  const isLargeText = fontSize >= 18 || (fontSize >= 14 && bold);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
};

/**
 * Get ARIA attributes from an element
 */
export const getAriaAttributes = (element) => {
  const ariaAttributes = {};

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
export const hasAccessibleName = (element) => {
  const ariaLabel = element.getAttribute('aria-label');
  const ariaLabelledby = element.getAttribute('aria-labelledby');
  const textContent = _optionalChain([element, 'access', _7 => _7.textContent, 'optionalAccess', _8 => _8.trim, 'call', _9 => _9()]);

  return !!(ariaLabel || ariaLabelledby || textContent);
};
