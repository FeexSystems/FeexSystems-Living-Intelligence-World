import type { Meta, StoryObj } from '@storybook/react-vite';
import { vi } from 'vitest';
import { Search, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from './button';

// Lightweight action spy. `@storybook/test` (the canonical source of `fn`) is
// not a declared dependency of this project, so we fall back to `vi.fn()` to
// keep the story import resolvable under the Vitest Storybook browser runner.
const fn = () => vi.fn();

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'Visual style variant',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'Size of the button',
    },
    isLoading: {
      control: 'boolean',
      description: 'Replaces children with a spinner and disables the button',
    },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
  args: {
    onClick: fn(),
    children: 'Click me',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// ─── Variants ────────────────────────────────────────────────────────────────

export const Default: Story = {};

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Delete' },
};

export const Outline: Story = {
  args: { variant: 'outline' },
};

export const Secondary: Story = {
  args: { variant: 'secondary' },
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
};

export const Link: Story = {
  args: { variant: 'link' },
};

// ─── Sizes ───────────────────────────────────────────────────────────────────

export const Small: Story = {
  args: { size: 'sm' },
};

export const Large: Story = {
  args: { size: 'lg' },
};

export const IconOnly: Story = {
  render: (args) => (
    <Button {...args} size="icon" aria-label="Delete item">
      <Trash2 className="h-4 w-4" />
    </Button>
  ),
  args: { children: 'Click me' },
};

// ─── States ──────────────────────────────────────────────────────────────────

export const Loading: Story = {
  args: { isLoading: true, children: 'Saving…' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

// ─── With Icons ───────────────────────────────────────────────────────────────

export const WithIcon: Story = {
  args: {
    leftIcon: <Search className="h-4 w-4" />,
    children: 'Search',
  },
};

export const WithRightIcon: Story = {
  args: {
    rightIcon: <ArrowRight className="h-4 w-4" />,
    children: 'Continue',
  },
};
