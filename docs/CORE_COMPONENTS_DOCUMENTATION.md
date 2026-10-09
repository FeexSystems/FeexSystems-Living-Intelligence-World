# Core Components Documentation Plan

**Task Reference:** Phase 4, Sprint 13, Task 50

**Last Updated:** 2026-10-07

## Overview

This document lists all UI components and prioritizes them for Storybook documentation.

## Component Inventory

### All Components (52 total)

1. accordion.tsx
2. alert-dialog.tsx
3. alert.tsx
4. aspect-ratio.tsx
5. avatar.tsx
6. badge.tsx
7. breadcrumb.tsx
8. button.tsx
9. calendar.tsx
10. card.tsx
11. carousel.tsx
12. chart.tsx
13. checkbox.tsx
14. collapsible.tsx
15. command.tsx
16. context-menu.tsx
17. dialog.tsx
18. drawer.tsx
19. dropdown-menu.tsx
20. form.tsx
21. hover-card.tsx
22. input-otp.tsx
23. input.tsx
24. label.tsx
25. menubar.tsx
26. navigation-menu.tsx
27. pagination.tsx
28. popover.tsx
29. progress.tsx
30. radio-group.tsx
31. resizable.tsx
32. scroll-area.tsx
33. select.tsx
34. separator.tsx
35. sheet.tsx
36. sidebar.tsx
37. skeleton.tsx
38. slider.tsx
39. sonner.tsx
40. switch.tsx
41. table.tsx
42. tabs.tsx
43. textarea.tsx
44. toast.tsx
45. toaster.tsx
46. toggle-group.tsx
47. toggle.tsx
48. tooltip.tsx
49. ErrorBoundary.tsx
50. SkipLink.tsx
51. WebGLErrorBoundary.tsx
52. ErrorStates (ErrorPage, InlineError, ToastError)

## Priority Classification

### High Priority (Core Components)

These components are used frequently across the application and should be documented first:

1. **button.tsx** - Primary action component
2. **input.tsx** - Form input component
3. **dialog.tsx** - Modal/dialog component
4. **card.tsx** - Card container component
5. **form.tsx** - Form field component
6. **dropdown-menu.tsx** - Dropdown menu component
7. **tabs.tsx** - Tab navigation component
8. **tooltip.tsx** - Tooltip component
9. **select.tsx** - Select input component
10. **checkbox.tsx** - Checkbox component

### Medium Priority (Common Components)

These components are used in specific features:

1. **alert.tsx** - Alert banner component
2. **badge.tsx** - Badge/tag component
3. **breadcrumb.tsx** - Breadcrumb navigation
4. **pagination.tsx** - Pagination component
5. **progress.tsx** - Progress indicator
6. **skeleton.tsx** - Loading skeleton
7. **table.tsx** - Data table component
8. **avatar.tsx** - User avatar component
9. **switch.tsx** - Toggle switch
10. **slider.tsx** - Range slider

### Low Priority (Specialized Components)

These components are used in specific contexts:

1. **accordion.tsx** - Accordion component
2. **alert-dialog.tsx** - Alert dialog
3. **aspect-ratio.tsx** - Aspect ratio container
4. **calendar.tsx** - Date picker
5. **carousel.tsx** - Image carousel
6. **chart.tsx** - Chart component
7. **collapsible.tsx** - Collapsible container
8. **command.tsx** - Command palette
9. **context-menu.tsx** - Context menu
10. **drawer.tsx** - Side drawer
11. **hover-card.tsx** - Hover card
12. **input-otp.tsx** - OTP input
13. **label.tsx** - Form label
14. **menubar.tsx** - Menu bar
15. **navigation-menu.tsx** - Navigation menu
16. **popover.tsx** - Popover
17. **radio-group.tsx** - Radio button group
18. **resizable.tsx** - Resizable panel
19. **scroll-area.tsx** - Custom scroll area
20. **separator.tsx** - Visual separator
21. **sheet.tsx** - Sheet component
22. **sidebar.tsx** - Sidebar component
23. **sonner.tsx** - Toast notifications
24. **textarea.tsx** - Text area input
25. **toast.tsx** - Toast component
26. **toaster.tsx** - Toast container
27. **toggle-group.tsx** - Toggle button group
28. **toggle.tsx** - Toggle button
29. **ErrorBoundary.tsx** - Error boundary
30. **SkipLink.tsx** - Skip navigation link
31. **WebGLErrorBoundary.tsx** WebGL error boundary
32. **ErrorStates** - Error page components

## Story Structure Template

Each component story should include:

```typescript
// client/components/ui/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    onClick: { action: 'clicked' },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// Default story
export const Default: Story = {
  args: {
    children: 'Click me',
  },
};

// Variants
export const Primary: Story = {
  args: {
    variant: 'default',
    children: 'Primary',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive',
  },
};

// Sizes
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large',
  },
};

// States
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};

export const Loading: Story = {
  args: {
    disabled: true,
    children: 'Loading...',
  },
};

// With icons
export const WithIcon: Story = {
  args: {
    children: 'With Icon',
  },
};

// Playground
export const Playground: Story = {
  args: {
    children: 'Playground',
  },
};
```

## A11y Notes

Each component story should include accessibility notes:

```typescript
export const Accessibility: Story = {
  parameters: {
    a11y: {
      config: {
        rules: {
          'button-name': { enabled: false },
        },
      },
    },
  },
};
```

## Documentation Checklist

For each component:

- [ ] Default story
- [ ] All variants
- [ ] All sizes
- [ ] All states (disabled, loading, error)
- [ ] With icons
- [ ] Playground story
- [ ] Accessibility notes
- [ ] Usage examples
- [ ] Props table (auto-generated)

## Status

**Overall Status:** Component Inventory Complete

**Completed:** Listed all 52 components, classified by priority
**In Progress:** Creating stories for high-priority components
**Next Steps:** Create .stories.tsx files for high-priority components
