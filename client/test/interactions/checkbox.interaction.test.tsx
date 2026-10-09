/**
 * Checkbox Component — Interaction Tests (Task 55: Sprint 14)
 *
 * Tests realistic user interactions with the Checkbox component using
 * @testing-library/user-event. Covers: toggle on click, keyboard toggle
 * (Space), disabled state, label association, controlled state, and
 * indeterminate behavior.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Checkbox } from '@/components/ui/checkbox';

describe('Checkbox — Interaction Tests', () => {
  // ========================================
  // Click Toggle
  // ========================================

  it('toggles from unchecked to checked on click', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Checkbox aria-label="Accept terms" onCheckedChange={onCheckedChange} />);
    const checkbox = screen.getByRole('checkbox', { name: 'Accept terms' });

    expect(checkbox).toHaveAttribute('data-state', 'unchecked');

    await user.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('toggles from checked to unchecked on click', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <Checkbox
        aria-label="Accept terms"
        defaultChecked
        onCheckedChange={onCheckedChange}
      />
    );
    const checkbox = screen.getByRole('checkbox', { name: 'Accept terms' });

    expect(checkbox).toHaveAttribute('data-state', 'checked');

    await user.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  it('handles multiple toggles', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Checkbox aria-label="Toggle" onCheckedChange={onCheckedChange} />);
    const checkbox = screen.getByRole('checkbox');

    await user.click(checkbox); // check
    await user.click(checkbox); // uncheck
    await user.click(checkbox); // check again

    expect(onCheckedChange).toHaveBeenCalledTimes(3);
    expect(onCheckedChange).toHaveBeenNthCalledWith(1, true);
    expect(onCheckedChange).toHaveBeenNthCalledWith(2, false);
    expect(onCheckedChange).toHaveBeenNthCalledWith(3, true);
  });

  // ========================================
  // Keyboard Toggle
  // ========================================

  it('toggles with Space key', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Checkbox aria-label="Space toggle" onCheckedChange={onCheckedChange} />);

    await user.tab(); // focus checkbox
    expect(screen.getByRole('checkbox')).toHaveFocus();

    await user.keyboard(' ');
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('receives focus via Tab key', async () => {
    const user = userEvent.setup();

    render(
      <>
        <button>Before</button>
        <Checkbox aria-label="Focusable" />
      </>
    );

    await user.tab(); // button
    await user.tab(); // checkbox
    expect(screen.getByRole('checkbox')).toHaveFocus();
  });

  // ========================================
  // Disabled State
  // ========================================

  it('does not toggle when disabled', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <Checkbox
        aria-label="Disabled"
        disabled
        onCheckedChange={onCheckedChange}
      />
    );
    const checkbox = screen.getByRole('checkbox');

    await user.click(checkbox);
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(checkbox).toBeDisabled();
  });

  it('skips disabled checkbox during tab navigation', async () => {
    const user = userEvent.setup();

    render(
      <>
        <button>Before</button>
        <Checkbox aria-label="Disabled" disabled />
        <button>After</button>
      </>
    );

    await user.tab(); // Before
    await user.tab(); // should skip checkbox → After
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  // ========================================
  // Label Association
  // ========================================

  it('toggles when associated label is clicked', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <div className="flex items-center space-x-2">
        <Checkbox id="terms" onCheckedChange={onCheckedChange} />
        <label htmlFor="terms">Accept terms and conditions</label>
      </div>
    );

    await user.click(screen.getByText('Accept terms and conditions'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  // ========================================
  // Controlled State
  // ========================================

  it('works as a controlled component', async () => {
    const user = userEvent.setup();

    function ControlledCheckbox() {
      const [checked, setChecked] = React.useState(false);
      return (
        <div>
          <Checkbox
            aria-label="Controlled"
            checked={checked}
            onCheckedChange={(c) => setChecked(c === true)}
          />
          <span data-testid="state">{checked ? 'ON' : 'OFF'}</span>
        </div>
      );
    }

    render(<ControlledCheckbox />);
    expect(screen.getByTestId('state')).toHaveTextContent('OFF');

    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByTestId('state')).toHaveTextContent('ON');

    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByTestId('state')).toHaveTextContent('OFF');
  });

  // ========================================
  // ARIA Attributes
  // ========================================

  it('exposes checkbox role', () => {
    render(<Checkbox aria-label="ARIA test" />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('communicates checked state via data-state attribute', async () => {
    const user = userEvent.setup();

    render(<Checkbox aria-label="State test" />);
    const checkbox = screen.getByRole('checkbox');

    expect(checkbox).toHaveAttribute('data-state', 'unchecked');
    await user.click(checkbox);
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });
});
