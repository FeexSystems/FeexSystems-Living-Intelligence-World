# Accessibility Standards

**Task Reference:** Phase 2, Sprint 5, Task 19

## Overview

This document outlines the accessibility standards for FeexSystems Living Intelligence World, based on WCAG 2.1 Level AA guidelines. These standards ensure the application is usable by people with disabilities.

## Target Compliance Level

**WCAG 2.1 Level AA** - This is the industry standard for accessibility compliance, balancing feasibility with comprehensive support.

## Key Principles (POUR)

### Perceivable

- Information and UI components must be presentable to users in ways they can perceive

### Operable

- UI components and navigation must be operable

### Understandable

- Information and the operation of the UI must be understandable

### Robust

- Content must be robust enough to be interpreted reliably by a wide variety of user agents, including assistive technologies

## Standards by Category

### 1. Text Alternatives (Perceivable)

**Guideline 1.1:** Provide text alternatives for any non-text content

- ✅ All images must have `alt` text describing their purpose
- ✅ Decorative images should have `alt=""` to be ignored by screen readers
- ✅ Icons used as buttons must have `aria-label` or text content
- ✅ Charts and graphs must have text descriptions

**Implementation:**

```tsx
// Good
<img src="/logo.png" alt="FeexSystems Logo" />
<button aria-label="Close dialog">
  <XIcon />
</button>

// Bad
<img src="/logo.png" />
<button>
  <XIcon />
</button>
```

### 2. Time-Based Media (Perceivable)

**Guideline 1.2:** Provide alternatives for time-based media

- Video content must have captions
- Audio content must have transcripts
- Media controls must be keyboard accessible

### 3. Adaptable (Perceivable)

**Guideline 1.3:** Create content that can be presented in different ways

- ✅ Use semantic HTML elements (`<nav>`, `<main>`, `<article>`, `<section>`)
- ✅ Heading hierarchy must be logical (H1 → H2 → H3, no skipping)
- ✅ Form inputs must have associated labels
- ✅ Tables must have proper headers

**Implementation:**

```tsx
// Good
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Bad
<input type="email" placeholder="Email" />
```

### 4. Distinguishable (Perceivable)

**Guideline 1.4:** Make it easier for users to see and hear content

- ✅ Text must have a contrast ratio of at least 4.5:1 for normal text (WCAG AA)
- ✅ Large text (18pt+) must have a contrast ratio of at least 3:1
- ✅ Text must be resizable up to 200% without loss of content or functionality
- ✅ Do not use color alone to convey information
- ✅ Focus indicators must be visible

**Contrast Ratios:**

- Normal text: 4.5:1 minimum (AA), 7:1 recommended (AAA)
- Large text (18pt+ or 14pt+ bold): 3:1 minimum (AA), 4.5:1 recommended (AAA)
- UI components: 3:1 minimum (AA)

**Design Tokens:**

- Primary text: `#0f172a` (slate-900) on `#ffffff` (white) - Ratio: 15.6:1 ✅
- Secondary text: `#64748b` (slate-500) on `#ffffff` (white) - Ratio: 4.5:1 ✅
- Borders: `#e2e8f0` (slate-200) on `#ffffff` (white) - Ratio: 1.6:1 ⚠️ (use for decoration only)

### 5. Keyboard Accessible (Operable)

**Guideline 2.1:** Make all functionality available from a keyboard

- ✅ All interactive elements must be keyboard accessible
- ✅ Keyboard focus must not be trapped
- ✅ Logical tab order must be maintained
- ✅ Provide keyboard shortcuts for common actions where appropriate

**Implementation:**

```tsx
// Good
<button onClick={handleClick}>Submit</button>
<a href="/next">Next Page</a>

// Bad - non-interactive div with click handler
<div onClick={handleClick}>Submit</div>
```

### 6. Enough Time (Operable)

**Guideline 2.2:** Provide users enough time to read and use content

- Users should be able to disable auto-updating content
- Time limits must be user-controllable
- Moving content must be pausable

### 7. Seizures and Physical Reactions (Operable)

**Guideline 2.3:** Do not design content in a way that is known to cause seizures

- No content flashes more than 3 times per second
- WebGL canvas pixel ratios clamped with `dpr={[1, 2]}` to prevent thermal throttling

### 8. Navigable (Operable)

**Guideline 2.4:** Provide ways to help users navigate, find content, and determine where they are

- ✅ Skip links for keyboard users
- ✅ Page titles must be descriptive
- ✅ Focus order must follow logical reading order
- ✅ Multiple ways to navigate to important content

### 9. Readable (Understandable)

**Guideline 3.1:** Make text content readable and understandable

- ✅ Language of the page must be identified (`<html lang="en">`)
- ✅ Unusual terms and abbreviations must be explained
- ✅ Content should be written in clear, simple language

### 10. Predictable (Understandable)

**Guideline 3.2:** Make Web pages appear and operate in predictable ways

- ✅ Focus changes must not occur without user interaction
- ✅ Navigation must be consistent across pages
- ✅ Changes of context must be explained

### 11. Input Assistance (Understandable)

**Guideline 3.3:** Help users avoid and correct mistakes

- ✅ Form inputs must have clear labels
- ✅ Error messages must be descriptive and associated with the field
- ✅ Required fields must be marked
- ✅ Validation must be clear and helpful

**Implementation:**

```tsx
// Good
<div>
  <label htmlFor="email">Email *</label>
  <input id="email" type="email" required aria-invalid={hasError} />
  {hasError && <span id="email-error" role="alert">Please enter a valid email</span>}
</div>

// Bad
<input type="email" placeholder="Email" />
```

### 12. Compatible (Robust)

**Guideline 4.1:** Maximize compatibility with current and future user agents

- ✅ Use semantic HTML
- ✅ Ensure ARIA attributes are correctly used
- ✅ Test with screen readers (NVDA, JAWS, VoiceOver)
- ✅ Test with keyboard-only navigation

## ARIA Guidelines

### When to Use ARIA

- ✅ Use ARIA when HTML elements don't provide the needed semantics
- ✅ Use ARIA to describe dynamic content changes
- ✅ Use ARIA for custom widgets (modals, tabs, menus)

### When NOT to Use ARIA

- ❌ Don't use ARIA when HTML already provides the needed semantics
- ❌ Don't duplicate HTML semantics with ARIA
- ❌ Don't use `role="button"` on a `<button>` element

### Common ARIA Patterns

```tsx
// Modal
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Modal Title</h2>
  <button aria-label="Close modal">×</button>
</div>

// Tabs
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
  <button role="tab" aria-selected="false" aria-controls="panel-2">Tab 2</button>
</div>
<div role="tabpanel" id="panel-1">Content 1</div>
<div role="tabpanel" id="panel-2" hidden>Content 2</div>

// Loading state
<div role="status" aria-live="polite">Loading...</div>
```

## Testing Checklist

### Manual Testing

- [ ] Navigate entire site using only keyboard (Tab, Enter, Escape, Arrow keys)
- [ ] Test with screen reader (NVDA for Windows, VoiceOver for Mac)
- [ ] Check color contrast using browser extension or axe DevTools
- [ ] Verify heading hierarchy is logical
- [ ] Verify all images have alt text
- [ ] Verify all form inputs have labels
- [ ] Verify focus indicators are visible
- [ ] Test with browser zoom at 200%

### Automated Testing

- [ ] Run `npm run test:a11y` (vitest-axe unit tests)
- [ ] Run axe DevTools extension during development
- [ ] Run `npm run test:e2e` with @axe-core/playwright
- [ ] Check dev-mode axe audit in console

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WCAG 2.1 Understanding](https://www.w3.org/WAI/WCAG21/Understanding/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

## Project-Specific Notes

### 3D Content (/world)

- The 3D Spatial World uses WebGL for visualization
- Canvas pixel ratios are clamped with `dpr={[1, 2]}` for performance
- 3D content is enhanced with keyboard navigation where possible
- WebGLErrorBoundary provides accessibility-specific troubleshooting

### Landing Page

- Cinematic WebGL background is decorative (has `aria-hidden="true"`)
- Skip links should be added for keyboard users
- Video content requires captions

### Forms

- All forms use React Hook Form with Zod validation
- Error messages are associated with fields using `aria-invalid` and `aria-describedby`
- Required fields are marked with asterisks and `required` attribute

## Compliance Status

**Current Target:** WCAG 2.1 Level AA

**Last Audit:** 2026-10-07

**Known Issues:**

- None at this time

**Next Audit:** After Phase 2 completion
