# Visual Regression Tests

**Task Reference:** Phase 4, Sprint 14, Task 54

**Last Updated:** 2026-10-07

## Overview

This document audits the existing visual regression test infrastructure and identifies gaps for component-level visual testing.

## Current State

### Existing Page-Level Tests

**File:** `e2e/visual-regression.spec.ts`

**Status:** ✅ Exists (from Task 3, Sprint 1)

**Existing Baselines:**

1. **landing-hero** - Landing page hero section
2. **projects** - Projects page
3. **navigator** - Navigator page
4. **not-found** - 404 page

**Configuration:**

- **Browser:** Chromium only (baselines tracked for one engine)
- **CI Guard:** Skipped in CI until baselines committed
- **Snapshot Dir:** `e2e/visual-regression.spec.ts-snapshots`
- **Max Diff Pixel Ratio:** 0.03 (3% difference threshold)

**NPM Script:**

```json
"test:visual": "playwright test --grep @visual"
```

### Test Code

```typescript
test.describe('@visual public pages', () => {
  test('landing page baseline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await page.waitForTimeout(1500);
    expect(await page.screenshot({ fullPage: false })).toMatchSnapshot('landing-hero.png', {
      maxDiffPixelRatio: 0.03,
    });
  });

  test('projects page baseline', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    expect(await page.screenshot({ fullPage: false })).toMatchSnapshot('projects.png', {
      maxDiffPixelRatio: 0.03,
    });
  });

  test('navigator page baseline', async ({ page }) => {
    await page.goto('/navigator');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    expect(await page.screenshot({ fullPage: false })).toMatchSnapshot('navigator.png', {
      maxDiffPixelRatio: 0.03,
    });
  });

  test('404 page baseline', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    expect(await page.screenshot({ fullPage: false })).toMatchSnapshot('not-found.png', {
      maxDiffPixelRatio: 0.03,
    });
  });
});
```

## Gaps

### Component-Level Visual Tests

The existing tests are page-level only. We need component-level visual tests for:

1. **Button** - All variants, sizes, states (hover, active, disabled, loading)
2. **Input** - All states (default, focus, error, disabled)
3. **Dialog** - Open/closed states, backdrop
4. **Card** - Variants, hover states
5. **Form** - Form states (default, submitting, error, success)
6. **Dropdown Menu** - Open/closed states, item hover
7. **Tabs** - Active/inactive states
8. **Tooltip** - Show/hide states, positions
9. **Select** - Open/closed states, selected states
10. **Checkbox** - Checked/unchecked states, indeterminate

### Responsive Breakpoints

Need visual tests for:

- Mobile (< 640px)
- Tablet (640px - 1024px)
- Desktop (> 1024px)

## Implementation Plan

### Step 1: Create Component Visual Tests

Create `@visual` project in Playwright for component testing:

```typescript
// e2e/visual-components.spec.ts
import { test, expect } from '@playwright/test';

test.describe('@visual button component', () => {
  test('button variants', async ({ page }) => {
    await page.goto('/storybook');
    // Navigate to button story
    // Take snapshots for each variant
  });

  test('button states', async ({ page }) => {
    await page.goto('/storybook');
    // Navigate to button story
    // Take snapshots for each state (hover, active, disabled)
  });
});
```

### Step 2: Add Variants and States

For each component, add tests for:

- **Variants:** default, destructive, outline, secondary, ghost, link
- **Sizes:** sm, md, lg
- **States:** default, hover, active, disabled, loading, error

### Step 3: Add Responsive Breakpoints

For each component, add tests for:

- Mobile: 375px width
- Tablet: 768px width
- Desktop: 1440px width

### Step 4: CI Integration

Add visual regression test to CI workflow:

```yaml
- name: Visual Regression Tests
  run: npm run test:visual
```

## Testing Checklist

- [ ] Component visual tests created
- [ ] All variants tested
- [ ] All states tested
- [ ] Responsive breakpoints tested
- [ ] Baselines committed
- [ ] CI diff on PR
- [ ] CI fails on regression

## Expected Outcome

- Visual diffs detected automatically
- CI fails on regression
- Baselines tracked in Git
- Component-level visual coverage

## Status

**Overall Status:** Page-Level Tests Exist

**Completed:** Audited existing visual regression infrastructure
**In Progress:** Adding component-level visual tests
**Next Steps:** Create component visual tests with variants, states, and responsive breakpoints
