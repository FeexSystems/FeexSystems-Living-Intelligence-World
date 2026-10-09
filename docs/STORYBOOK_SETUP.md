# Storybook Setup Plan

**Task Reference:** Phase 4, Sprint 13, Task 49

**Last Updated:** 2026-10-07

## Overview

This document outlines the Storybook setup for the FeexSystems Living Intelligence World component library.

## Prerequisites

- Vite 6
- React 18
- TypeScript
- TailwindCSS 3

## Installation

```bash
npx storybook@latest init
```

**Answers to interactive prompts:**

- Framework: Vite
- Language: TypeScript
- Addons: Docs, Essentials, Controls, Actions, Links, a11y

## Configuration

### .storybook/main.ts

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../client/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !prop.parent.fileName.includes('@types') : true),
    },
  },
};

export default config;
```

### .storybook/preview.ts

```typescript
import '../client/global.css';

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  backgrounds: {
    default: 'Dark',
    values: [
      { name: 'Dark', value: '#05070A' },
      { name: 'Light', value: '#ffffff' },
    ],
  },
};
```

### .storybook/preview-head.html

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Rajdhani:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
```

## Theme Customization

### .storybook/manager-head.html

```html
<style>
  :root {
    --storybook-font-base: 'Google Sans', sans-serif;
    --storybook-font-mono: 'JetBrains Mono', monospace;
  }
  body {
    background-color: #05070A;
    color: #e0e6ed;
  }
</style>
```

## Component Priority

From `docs/COMPONENT_PRIORITY.md` (if exists) or based on usage:

1. **High Priority:**
   - Button
   - Input
   - Dialog
   - Card
   - Form

2. **Medium Priority:**
   - Dropdown
   - Tabs
   - Accordion
   - Tooltip
   - Select

3. **Low Priority:**
   - Slider
   - Switch
   - Progress
   - Alert
   - Avatar

## Story Structure

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
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Click me',
  },
};

export const WithIcon: Story = {
  args: {
    children: 'With Icon',
    variant: 'secondary',
  },
};
```

## NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

## Testing Checklist

- [ ] Storybook runs at localhost:6006
- [ ] Hot reload works
- [ ] Docs tab is available
- [ ] Controls panel works
- [ ] Actions panel works
- [ ] A11y addon works
- [ ] Theme matches FeexSystems design
- [ ] Fonts load correctly
- [ ] TailwindCSS works

## Expected Outcome

- Storybook at `http://localhost:6006`
- Hot reload for component changes
- Auto-generated props tables
- Docs tab with component documentation
- A11y panel for accessibility testing
- Dark theme matching FeexSystems design

## Status

**Overall Status:** Configuration Documented

**Completed:** Installation plan, configuration structure, story structure
**In Progress:** Actual Storybook setup
**Next Steps:** Run `npx storybook@latest init` and apply configuration
