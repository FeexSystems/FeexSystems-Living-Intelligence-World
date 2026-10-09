# ARIA Landmarks Implementation

**Task Reference:** Phase 2, Sprint 7, Task 26

**Last Updated:** 2026-10-09

## Overview

ARIA landmarks help screen reader users navigate quickly to different sections of a page. This document tracks the implementation of landmarks across the application.

## Landmark Roles

### Banner

- **Purpose:** Site-wide header or navigation
- **Role:** `role="banner"`
- **When to use:** Top-level navigation, branding area

### Navigation

- **Purpose:** Navigation links or menus
- **Role:** `role="navigation"`
- **When to use:** Navigation menus, breadcrumbs

### Main

- **Purpose:** Main content of the page
- **Role:** `role="main"`
- **When to use:** Primary content area

### Complementary

- **Purpose:** Supporting content
- **Role:** `role="complementary"`
- **When to use:** Sidebars, related content

### Contentinfo

- **Purpose:** Footer or copyright information
- **Role:** `role="contentinfo"`
- **When to use:** Footer, copyright notices

## Implementation Status

### App Level (`client/App.tsx`)

**Status:** ✅ Partially Complete

**Implemented:**

- ✅ `role="main"` added to main content wrapper (`#main-content`)

**Not Implemented:**

- ⚠️ `role="banner"` - Navigation is within individual pages, not at App level
- ⚠️ `role="navigation"` - Navigation is within individual pages
- ⚠️ `role="contentinfo"` - Footer not present at App level

**Recommendations:**

1. Add landmark regions to individual page components
2. Add aria-label to landmarks for clarity
3. Ensure no duplicate unlabeled landmarks

### Landing Page (`/`)

**Status:** ⚠️ Needs Implementation

**Current State:**

- No landmark regions defined

**Recommended Implementation:**

```tsx
<header role="banner" aria-label="FeexSystems Navigation">
  {/* Navigation links */}
</header>

<main role="main" aria-label="Landing Content">
  {/* Hero section, features, etc. */}
</main>

<footer role="contentinfo" aria-label="Footer">
  {/* Copyright, links */}
</footer>
```

### Dashboard Pages

**Status:** ⚠️ Needs Implementation

**Current State:**

- No landmark regions defined

**Recommended Implementation:**

```tsx
<header role="banner" aria-label="Dashboard Navigation">
  {/* Sidebar navigation */}
</header>

<main role="main" aria-label="Dashboard Content">
  {/* Dashboard cards, charts */}
</main>

<aside role="complementary" aria-label="Sidebar">
  {/* Additional widgets */}
</aside>
```

### Auth Pages

**Status:** ✅ Implemented

`AuthNav` (`client/components/navigation/AuthNav.tsx`) renders a native `<header>`
(implicit `banner`) containing a labelled `<nav aria-label="Public surfaces">`.
The auth form itself sits inside the app-shell `main` from `App.tsx` — pages must
**not** add their own `<main>` (see “No Nesting” below).

Verified in `e2e/accessibility.spec.ts`.

### Dashboard Pages

**Status:** 🔧 Partial

- ✅ Sidebar (`DashboardLayout.tsx`) is a labelled `<nav aria-label="Dashboard sections">`
- ⚠️ No `role="complementary"` sidebar region — the layout uses a single nav column

### Contentinfo (footer)

**Status:** ➕ Not present

The application has **no footer** on any surface, so there is no `contentinfo`
landmark to expose. This is a product/design gap, not a markup omission: adding a
footer is a UI decision, and inventing an empty landmark would be worse than none.

## No Nesting (important)

`client/App.tsx` wraps every route in `<div id="main-content" role="main">`, which
is the target of the `SkipLink`. Pages therefore must **not** render their own
`<main>`: a nested main is invalid per ARIA landmark rules and would make the skip
link ambiguous. `e2e/accessibility.spec.ts` asserts exactly one `main` per route
to prevent this regressing.

## Testing Checklist

### Manual Testing

- [ ] Test landmark navigation with NVDA (H key)
- [ ] Test landmark navigation with VoiceOver (VO + H)
- [ ] Verify all landmarks have unique labels
- [ ] Verify no duplicate unlabeled landmarks
- [ ] Test landmark order follows logical reading order

### Automated Testing

- [x] Run axe DevTools landmark audit
- [x] Use @axe-core/playwright for landmark audit — `e2e/accessibility.spec.ts`
- [x] Test with accessibility testing utilities
- [x] Assert exactly one `main` per route (guards against nested landmarks)
- [x] Assert every `navigation` landmark has a unique `aria-label`

## Best Practices

1. **Unique Labels:** All landmarks should have unique `aria-label` attributes
2. **No Nesting:** Landmarks should not be nested (e.g., main inside main)
3. **Logical Order:** Landmarks should follow the logical reading order
4. **Skip Links:** Combine landmarks with skip links for better navigation
5. **Consistent Naming:** Use consistent landmark labels across pages

## Resources

- [WAI-ARIA Landmark Roles](https://www.w3.org/TR/wai-aria-1.2/#landmark_roles)
- [Using ARIA Landmarks](https://www.w3.org/WAI/tutorials/page-structure/labels/)
- [Accessible Rich Internet Applications (WAI-ARIA) 1.2](https://www.w3.org/TR/wai-aria-1.2/)

## Status

**Overall Status:** ✅ Implemented (footer outstanding)

**Completed:** `main` (app shell), `banner` + `navigation` (AuthNav, NavigationOverlay),
labelled dashboard nav. Automated landmark assertions in `e2e/accessibility.spec.ts`.
**Outstanding:** `contentinfo` — the app has no footer UI. `complementary` sidebar on dashboard.
