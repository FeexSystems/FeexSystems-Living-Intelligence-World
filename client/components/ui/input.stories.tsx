import type { Meta, StoryObj } from '@storybook/react';
import { Search, Eye } from 'lucide-react';
import { Input } from './input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    error: { control: 'text', description: 'Error message displayed beneath the input' },
    helperText: { control: 'text', description: 'Helper text shown when there is no error' },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'search', 'number', 'url'],
    },
  },
  args: {
    placeholder: 'Enter text…',
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

// ─── Base States ─────────────────────────────────────────────────────────────

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true, value: 'Cannot edit this', readOnly: true },
};

// ─── Feedback ─────────────────────────────────────────────────────────────────

export const WithError: Story = {
  args: {
    error: 'This field is required.',
    placeholder: 'Email address',
    type: 'email',
  },
};

export const WithHelperText: Story = {
  args: {
    helperText: 'We'll never share your email.',
    placeholder: 'Email address',
    type: 'email',
  },
};

// ─── Icons (rendered via render fn to avoid JSX-in-args parse error) ─────────

export const WithLeftIcon: Story = {
  render: (args) => <Input {...args} leftIcon={<Search className="h-4 w-4" />} />,
  args: { placeholder: 'Search projects…', type: 'search' },
};

export const WithRightIcon: Story = {
  render: (args) => <Input {...args} rightIcon={<Eye className="h-4 w-4" />} />,
  args: { placeholder: 'Password', type: 'password' },
};

export const WithBothIcons: Story = {
  render: (args) => (
    <Input
      {...args}
      leftIcon={<Search className="h-4 w-4" />}
      rightIcon={<Eye className="h-4 w-4" />}
    />
  ),
  args: { placeholder: 'Search…' },
};

export const ErrorWithIcon: Story = {
  name: 'Error + Left Icon',
  render: (args) => <Input {...args} leftIcon={<Search className="h-4 w-4" />} />,
  args: { error: 'No results found for that query.', placeholder: 'Search…' },
};
