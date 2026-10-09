/**
 * Select Component — Interaction Tests (Task 55: Sprint 14)
 *
 * Tests realistic user interactions with the Select component using
 * @testing-library/user-event. Covers: open/close, item selection,
 * keyboard navigation, disabled state, placeholder, and controlled state.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';

/** Helper to render a standard select test fixture. */
function renderSelect(props?: {
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return render(
    <Select
      defaultValue={props?.defaultValue}
      onValueChange={props?.onValueChange}
      disabled={props?.disabled}
    >
      <SelectTrigger data-testid="select-trigger">
        <SelectValue placeholder={props?.placeholder ?? 'Select a fruit'} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="cherry">Cherry</SelectItem>
          <SelectItem value="grape" disabled>Grape</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

describe('Select — Interaction Tests', () => {
  // ========================================
  // Open / Close
  // ========================================

  it('opens select dropdown when trigger is clicked', async () => {
    const user = userEvent.setup();
    renderSelect();

    await user.click(screen.getByTestId('select-trigger'));

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('Banana')).toBeInTheDocument();
      expect(screen.getByText('Cherry')).toBeInTheDocument();
    });
  });

  it('shows placeholder text when no value is selected', () => {
    renderSelect();
    expect(screen.getByText('Select a fruit')).toBeInTheDocument();
  });

  it('shows selected value instead of placeholder', () => {
    renderSelect({ defaultValue: 'banana' });
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });

  // ========================================
  // Item Selection
  // ========================================

  it('selects an item when clicked', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderSelect({ onValueChange });

    await user.click(screen.getByTestId('select-trigger'));
    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Apple'));
    expect(onValueChange).toHaveBeenCalledWith('apple');
  });

  it('closes dropdown after selecting an item', async () => {
    const user = userEvent.setup();
    renderSelect();

    await user.click(screen.getByTestId('select-trigger'));
    await waitFor(() => {
      expect(screen.getByText('Cherry')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Cherry'));

    // After selection, the dropdown should close
    // The trigger should now show the selected value
    await waitFor(() => {
      expect(screen.getByTestId('select-trigger')).toHaveTextContent('Cherry');
    });
  });

  it('updates displayed value after selection', async () => {
    const user = userEvent.setup();
    renderSelect();

    await user.click(screen.getByTestId('select-trigger'));
    await waitFor(() => {
      expect(screen.getByText('Banana')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Banana'));

    await waitFor(() => {
      expect(screen.getByTestId('select-trigger')).toHaveTextContent('Banana');
    });
  });

  // ========================================
  // Disabled State
  // ========================================

  it('does not open when disabled', async () => {
    const user = userEvent.setup();
    renderSelect({ disabled: true });

    const trigger = screen.getByTestId('select-trigger');
    expect(trigger).toBeDisabled();

    await user.click(trigger);

    // Apple should not appear because the select is disabled
    expect(screen.queryByText('Apple')).not.toBeInTheDocument();
  });

  // ========================================
  // Keyboard Navigation
  // ========================================

  it('opens with Enter key on focused trigger', async () => {
    const user = userEvent.setup();
    renderSelect();

    await user.tab(); // focus trigger
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });
  });

  it('opens with Space key on focused trigger', async () => {
    const user = userEvent.setup();
    renderSelect();

    await user.tab(); // focus trigger
    await user.keyboard(' ');

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });
  });

  // ========================================
  // ARIA
  // ========================================

  it('exposes combobox role on trigger', () => {
    renderSelect();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  // ========================================
  // Controlled State
  // ========================================

  it('works as a controlled component', async () => {
    const user = userEvent.setup();

    function ControlledSelect() {
      const [value, setValue] = React.useState('apple');
      return (
        <div>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger data-testid="select-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
            </SelectContent>
          </Select>
          <span data-testid="selected">{value}</span>
        </div>
      );
    }

    render(<ControlledSelect />);
    expect(screen.getByTestId('selected')).toHaveTextContent('apple');

    await user.click(screen.getByTestId('select-trigger'));
    await waitFor(() => {
      expect(screen.getByText('Banana')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Banana'));

    await waitFor(() => {
      expect(screen.getByTestId('selected')).toHaveTextContent('banana');
    });
  });

  // ========================================
  // Group Label
  // ========================================

  it('renders group label as non-interactive text', async () => {
    const user = userEvent.setup();
    renderSelect();

    await user.click(screen.getByTestId('select-trigger'));
    await waitFor(() => {
      expect(screen.getByText('Fruits')).toBeInTheDocument();
    });
  });
});
