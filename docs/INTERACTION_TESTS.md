# Interaction Tests

**Task Reference:** Phase 4, Sprint 14, Task 55

**Last Updated:** 2026-10-07

## Overview

This document outlines interaction testing using `@testing-library/user-event` for simulating real user behavior.

## Prerequisites

✅ **@testing-library/user-event** already installed (v14.5.1)

## Current State

### Existing Interaction Tests

**File:** `client/test/components/button.test.tsx`

**Existing Interaction Tests:**

```typescript
it('handles click events', async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();

  render(<Button onClick={onClick}>Click</Button>);

  await user.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalledOnce();
});

it('is keyboard accessible', async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();

  render(<Button onClick={onClick}>Keys</Button>);

  await user.tab();
  expect(screen.getByRole('button')).toHaveFocus();

  await user.keyboard('{Enter}');
  expect(onClick).toHaveBeenCalledOnce();
});
```

**Status:** ✅ Button has interaction tests

## Interaction Test Patterns

### 1. Click Tests

Test click interactions for:

- Buttons
- Links
- Cards
- Menu items
- Dialog triggers

**Example:**

```typescript
it('handles click events', async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();

  render(<Button onClick={onClick}>Click</Button>);

  await user.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalledOnce();
});
```

### 2. Input Tests

Test input interactions for:

- Text inputs
- Textareas
- Select dropdowns
- Checkboxes
- Radio buttons
- Date pickers

**Example:**

```typescript
it('handles text input', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();

  render(<Input onChange={onChange} />);

  await user.type(screen.getByRole('textbox'), 'test input');
  expect(onChange).toHaveBeenCalled();
});
```

### 3. Dropdown Tests

Test dropdown interactions for:

- Opening/closing
- Selecting items
- Keyboard navigation

**Example:**

```typescript
it('opens dropdown on click', async () => {
  const user = userEvent.setup();

  render(<DropdownMenu />);

  await user.click(screen.getByRole('button'));
  expect(screen.getByRole('menu')).toBeVisible();
});
```

### 4. Modal Tests

Test modal interactions for:

- Opening/closing
- Focus trapping
- Escape key dismissal
- Backdrop click dismissal

**Example:**

```typescript
it('closes modal on escape', async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();

  render(<Dialog open onClose={onClose} />);

  await user.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalled();
});
```

### 5. Keyboard Navigation Tests

Test keyboard navigation for:

- Tab order
- Arrow key navigation
- Enter key submission
- Escape key cancellation

**Example:**

```typescript
it('navigates with tab key', async () => {
  const user = userEvent.setup();

  render(<Form />);

  await user.tab();
  expect(screen.getByLabelText('Email')).toHaveFocus();

  await user.tab();
  expect(screen.getByLabelText('Password')).toHaveFocus();
});
```

## Priority Components for Interaction Tests

### High Priority

1. **Button** ✅ Already has tests
2. **Input** ❌ Needs tests
3. **Dialog** ❌ Needs tests
4. **Dropdown Menu** ❌ Needs tests
5. **Select** ❌ Needs tests
6. **Checkbox** ❌ Needs tests

### Medium Priority

1. **Tabs** ❌ Needs tests
2. **Card** ❌ Needs tests
3. **Form** ❌ Needs tests
4. **Navigation Menu** ❌ Needs tests
5. **Tooltip** ❌ Needs tests

## Test Template

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ComponentName } from '@/components/ui/component';

describe('ComponentName interactions', () => {
  it('handles click events', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<ComponentName onClick={onClick}>Test</ComponentName>);

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('handles input changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ComponentName onChange={onChange} />);

    await user.type(screen.getByRole('textbox'), 'test');
    expect(onChange).toHaveBeenCalled();
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();

    render(<ComponentName />);

    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
  });
});
```

## Testing Checklist

For each component:

- [ ] Click interactions
- [ ] Input interactions
- [ ] Keyboard navigation
- [ ] Edge cases (disabled, loading, error)
- [ ] Interactions simulate real usage
- [ ] Edge cases covered

## Status

**Overall Status:** Infrastructure Exists

**Completed:** Verified @testing-library/user-event installed, audited existing interaction tests
**In Progress:** Creating interaction tests for priority components
**Next Steps:** Create interaction tests for 9 missing priority components
