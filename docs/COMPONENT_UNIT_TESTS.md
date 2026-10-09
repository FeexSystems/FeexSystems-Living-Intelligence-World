# Unit Tests for Core Components

**Task Reference:** Phase 4, Sprint 14, Task 53

**Last Updated:** 2026-10-07

## Overview

This document audits the current state of component unit tests and identifies gaps to achieve 80%+ coverage on priority components.

## Current Test Coverage

### Existing Component Tests

**File:** `client/test/components/`

1. **button.test.tsx** ✅
   - Covers: render, variants, props, interaction, a11y, edge cases
   - Status: Comprehensive

2. **ErrorBoundary.test.tsx** ✅
   - Covers: error handling, fallback UI
   - Status: Good

3. **CinematicHero.test.tsx** ✅
   - Covers: scene transitions, video loading
   - Status: Good

4. **FeexSovereignEngine.test.tsx** ✅
   - Covers: 3D engine initialization
   - Status: Good

5. **HoloKaiVoiceModal.test.tsx** ✅
   - Covers: modal interactions
   - Status: Good

6. **LutPipelineCanvas.test.tsx** ✅
   - Covers: canvas rendering
   - Status: Good

7. **MarketingIntelligenceSection.test.tsx** ✅
   - Covers: section rendering
   - Status: Good

8. **ProtectedRoute.test.tsx** ✅
   - Covers: auth guard logic
   - Status: Good

### Accessibility Tests

**File:** `client/test/components/`

1. **command.a11y.test.tsx** ✅
   - Covers: keyboard navigation, a11y
   - Status: Good

2. **dialog.a11y.test.tsx** ✅
   - Covers: modal a11y, focus management
   - Status: Good

3. **error-boundary.a11y.test.tsx** ✅
   - Covers: error boundary a11y
   - Status: Good

### UI Component Tests Gaps

**High Priority Components (from Task 50):**

1. **input.tsx** ❌ No test
2. **dialog.tsx** ❌ No test (only a11y test exists)
3. **card.tsx** ❌ No test
4. **form.tsx** ❌ No test
5. **dropdown-menu.tsx** ❌ No test
6. **tabs.tsx** ❌ No test
7. **tooltip.tsx** ❌ No test
8. **select.tsx** ❌ No test
9. **checkbox.tsx** ❌ No test

## Test Conventions

**Colocation:** Test files should be colocated with components per convention used in `client/test/components/`

**Example:**

```
client/components/ui/button.tsx
client/test/components/button.test.tsx
```

**Test Template:**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ComponentName } from '@/components/ui/component';

describe('ComponentName', () => {
  // Render tests
  it('renders correctly', () => {
    render(<ComponentName>Test</ComponentName>);
    expect(screen.getByRole('element', { name: 'Test' })).toBeInTheDocument();
  });

  // Variant tests
  it('renders all variants', () => {
    // Test all variants
  });

  // Props tests
  it('spreads additional props correctly', () => {
    // Test props spread
  });

  // Interaction tests
  it('handles click events', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ComponentName onClick={onClick}>Test</ComponentName>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  // Accessibility tests
  it('is keyboard accessible', async () => {
    // Test keyboard navigation
  });

  // Edge cases
  it('handles disabled state', async () => {
    // Test disabled state
  });
});
```

## Coverage Target

**Goal:** 80%+ coverage on priority components

**Priority Components (10 total):**

1. button.tsx ✅ Already has comprehensive test
2. input.tsx ❌ Needs test
3. dialog.tsx ❌ Needs test (has a11y test only)
4. card.tsx ❌ Needs test
5. form.tsx ❌ Needs test
6. dropdown-menu.tsx ❌ Needs test
7. tabs.tsx ❌ Needs test
8. tooltip.tsx ❌ Needs test
9. select.tsx ❌ Needs test
10. checkbox.tsx ❌ Needs test

**Current Coverage:** 1/10 (10%)

**Target Coverage:** 10/10 (100%)

## Implementation Plan

### Step 1: Create Test Files

Create test files for each missing priority component:

- `client/test/components/input.test.tsx`
- `client/test/components/card.test.tsx`
- `client/test/components/form.test.tsx`
- `client/test/components/dropdown-menu.test.tsx`
- `client/test/components/tabs.test.tsx`
- `client/test/components/tooltip.test.tsx`
- `client/test/components/select.test.tsx`
- `client/test/components/checkbox.test.tsx`

### Step 2: Run Coverage

```bash
npm test -- --coverage
```

### Step 3: Review Coverage Report

Review the coverage report and identify gaps.

## Testing Checklist

For each component:

- [ ] Render test
- [ ] Variant tests
- [ ] Props tests
- [ ] Interaction tests
- [ ] Accessibility tests
- [ ] Edge case tests
- [ ] Coverage >= 80%

## Status

**Overall Status:** Current State Audited

**Completed:** Audited existing tests, identified gaps (9/10 priority components missing tests)
**In Progress:** Creating test files for missing components
**Next Steps:** Create test files for 9 missing priority components and run coverage
