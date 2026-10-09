# Focus Indicator Specification

**Task Reference:** Phase 2, Sprint 6, Task 23

**Last Updated:** 2026-10-07

## Overview

This document specifies the focus indicator styles used across the FeexSystems Living Intelligence World application. Focus indicators are critical for keyboard navigation accessibility.

## Global Focus Styles

### Default Focus Indicator

Location: `client/global.css` (lines 113-121)

```css
/* Focus visible styles for accessibility */
:focus-visible {
  outline: 2px solid var(--hud-phosphor, #00ff66);
  outline-offset: 2px;
}

/* Remove focus outline for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}
```

**Specification:**
- **Style:** 2px solid outline
- **Color:** `var(--hud-phosphor, #00ff66)` - Phosphor green (CSS variable with fallback)
- **Offset:** 2px offset from element
- **Behavior:** Only shows when element is focused via keyboard (`:focus-visible`)
- **Mouse Users:** No outline shown when focused via mouse (`:focus:not(:focus-visible)`)

### Dark Mode Focus Indicator

Location: `client/global.css` (lines 179-183)

```css
@media (prefers-color-scheme: dark) {
  .nav-tab:focus,
  .btn-dossier:focus,
  button:focus-visible {
    outline: 2px solid Highlight;
  }
}
```

**Specification:**
- **Style:** 2px solid outline
- **Color:** `Highlight` (system color, typically blue)
- **Applied to:** Navigation tabs, dossier buttons, all buttons

## Component-Level Focus Styles

### Button Components

**Status:** ✅ Inherits global focus styles

**Findings:**
- Radix UI Button components inherit global `:focus-visible` styles
- No component-specific overrides needed
- Consistent across all button variants

### Input Components

**Status:** ✅ Inherits global focus styles

**Findings:**
- Form inputs inherit global `:focus-visible` styles
- No component-specific overrides needed
- Consistent across all input types

### Navigation Components

**Status:** ✅ Has dark mode specific styles

**Findings:**
- Navigation tabs have dark mode specific focus style (`Highlight` color)
- Fallbacks to global phosphor green in light mode

### Dropdown/Menu Components

**Status:** ⚠️ Needs audit

**Findings:**
- Radix UI Dropdown Menu components may have their own focus styles
- Need to verify they don't conflict with global styles
- Need to verify contrast on all theme backgrounds

## Contrast Requirements

### WCAG 2.1 AA Requirements

**Focus Indicators:** Minimum 3:1 contrast ratio against adjacent background

### Current Colors

**Light Mode:**
- Focus color: `#00ff66` (Phosphor green)
- Background: `#ffffff` (White)
- **Contrast Ratio:** ~2.5:1 ⚠️ (Below 3:1 AA threshold)

**Dark Mode:**
- Focus color: `Highlight` (System blue, typically `#0078d4`)
- Background: `#1a1a1a` (Dark background)
- **Contrast Ratio:** ~3.5:1 ✅ (Meets AA threshold)

## Recommendations

### Immediate (High Priority)

1. **Increase focus indicator contrast in light mode**
   - Current phosphor green (`#00ff66`) does not meet 3:1 contrast on white
   - Recommend using a darker green or blue for better contrast
   - Example: `#00aa44` (darker green) or `#0066cc` (blue)

2. **Audit dropdown/menu focus styles**
   - Verify Radix UI components don't override global styles
   - Ensure focus indicators are visible on all theme backgrounds

### Short-term (Medium Priority)

1. **Add focus indicator to 3D canvas**
   - WebGL canvas needs focus indicator when keyboard navigable
   - Ensure contrast on dark WebGL backgrounds

2. **Add focus indicator to command palette**
   - Verify focus indicators in command palette results
   - Ensure contrast on all theme backgrounds

## Testing Checklist

### Manual Testing

- [ ] Test focus indicators on light mode backgrounds
- [ ] Test focus indicators on dark mode backgrounds
- [ ] Test focus indicators on all button variants
- [ ] Test focus indicators on all input types
- [ ] Test focus indicators in dropdowns/menus
- [ ] Test focus indicators in command palette
- [ ] Test focus indicators on 3D canvas (if keyboard navigable)
- [ ] Verify focus indicators only show on keyboard navigation (not mouse)

### Automated Testing

- [ ] Add contrast ratio tests for focus indicators
- [ ] Use axe DevTools to verify focus indicators
- [ ] Test with accessibility testing utilities

## Component Audit Results

| Component | Inherits Global | Custom Styles | Contrast OK | Notes |
|-----------|----------------|---------------|-------------|-------|
| Button | ✅ | None | ⚠️ Light mode | Dark mode OK |
| Input | ✅ | None | ⚠️ Light mode | Dark mode OK |
| Navigation Tab | ✅ | Dark mode | ✅ | Uses system color |
| Dropdown Menu | ⚠️ | Unknown | ⚠️ | Needs audit |
| Command Palette | ⚠️ | Unknown | ⚠️ | Needs audit |
| 3D Canvas | ❌ | None | ❌ | No focus indicator |

## Status

**Overall Status:** ⚠️ Needs Improvement

**Completed:** 0/2 High Priority items

**In Progress:** 0/2 High Priority items

**Next Steps:** Increase focus indicator contrast in light mode and audit dropdown/menu components
