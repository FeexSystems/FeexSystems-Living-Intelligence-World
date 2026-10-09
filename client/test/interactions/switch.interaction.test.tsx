/**
 * Switch Component — Interaction Tests (Task 55: Sprint 14)
 *
 * Tests realistic user interactions with the Switch component using
 * @testing-library/user-event. Covers: click toggle, keyboard toggle,
 * disabled state, controlled/uncontrolled, and ARIA attributes.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Switch } from '@/components/ui/switch';

describe('Switch — Interaction Tests', () => {
  // ========================================
  // Click Toggle
  // ========================================

  it('toggles from off to on when clicked', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Switch aria-label="Notifications" onCheckedChange={onCheckedChange} />);
    const toggle = screen.getByRole('switch', { name: 'Notifications' });

    expect(toggle).toHaveAttribute('data-state', 'unchecked');

    await user.click(toggle);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('toggles from on to off when clicked', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <Switch aria-label="Notifications" defaultChecked onCheckedChange={onCheckedChange} />
    );
    const toggle = screen.getByRole('switch');

    expect(toggle).toHaveAttribute('data-state', 'checked');

    await user.click(toggle);
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  it('handles rapid toggling', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Switch aria-label="Rapid" onCheckedChange={onCheckedChange} />);
    const toggle = screen.getByRole('switch');

    await user.click(toggle);
    await user.click(toggle);
    await user.click(toggle);

    expect(onCheckedChange).toHaveBeenCalledTimes(3);
  });

  // ========================================
  // Keyboard Toggle
  // ========================================

  it('toggles with Space key', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Switch aria-label="Space toggle" onCheckedChange={onCheckedChange} />);

    await user.tab();
    expect(screen.getByRole('switch')).toHaveFocus();

    await user.keyboard(' ');
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('is focusable via Tab', async () => {
    const user = userEvent.setup();

    render(
      <>
        <button>Before</button>
        <Switch aria-label="Focus test" />
        <button>After</button>
      </>
    );

    await user.tab(); // Before
    await user.tab(); // Switch
    expect(screen.getByRole('switch')).toHaveFocus();

    await user.tab(); // After
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  // ========================================
  // Disabled State
  // ========================================

  it('does not toggle when disabled', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Switch aria-label="Disabled" disabled onCheckedChange={onCheckedChange} />);
    const toggle = screen.getByRole('switch');

    await user.click(toggle);
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(toggle).toBeDisabled();
  });

  it('skips disabled switch during tab navigation', async () => {
    const user = userEvent.setup();

    render(
      <>
        <button>Before</button>
        <Switch aria-label="Skip me" disabled />
        <button>After</button>
      </>
    );

    await user.tab(); // Before
    await user.tab(); // Should skip disabled switch → After
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  // ========================================
  // Controlled State
  // ========================================

  it('works as a controlled component', async () => {
    const user = userEvent.setup();

    function ControlledSwitch() {
      const [checked, setChecked] = React.useState(false);
      return (
        <div>
          <Switch
            aria-label="Controlled"
            checked={checked}
            onCheckedChange={setChecked}
          />
          <span data-testid="state">{checked ? 'ON' : 'OFF'}</span>
        </div>
      );
    }

    render(<ControlledSwitch />);
    expect(screen.getByTestId('state')).toHaveTextContent('OFF');

    await user.click(screen.getByRole('switch'));
    expect(screen.getByTestId('state')).toHaveTextContent('ON');

    await user.click(screen.getByRole('switch'));
    expect(screen.getByTestId('state')).toHaveTextContent('OFF');
  });

  // ========================================
  // Label Association
  // ========================================

  it('toggles when associated label is clicked', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <div className="flex items-center space-x-2">
        <Switch id="dark-mode" onCheckedChange={onCheckedChange} />
        <label htmlFor="dark-mode">Dark Mode</label>
      </div>
    );

    await user.click(screen.getByText('Dark Mode'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  // ========================================
  // ARIA / Role
  // ========================================

  it('exposes switch role', () => {
    render(<Switch aria-label="Role test" />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('reflects state via data-state attribute', async () => {
    const user = userEvent.setup();

    render(<Switch aria-label="Data state" />);
    const toggle = screen.getByRole('switch');

    expect(toggle).toHaveAttribute('data-state', 'unchecked');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('data-state', 'checked');
  });
});
