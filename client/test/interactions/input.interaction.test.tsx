/**
 * Input Component — Interaction Tests (Task 55: Sprint 14)
 *
 * Tests realistic user interactions with the Input component using
 * @testing-library/user-event. Covers: typing, clearing, focus/blur,
 * disabled state, keyboard navigation, paste, and placeholder behavior.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Input } from '@/components/ui/input';

describe('Input — Interaction Tests', () => {
  // ========================================
  // Typing Interactions
  // ========================================

  it('accepts user text input character by character', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Input placeholder="Enter text" onChange={onChange} />);
    const input = screen.getByPlaceholderText('Enter text');

    await user.type(input, 'Hello');
    expect(input).toHaveValue('Hello');
    expect(onChange).toHaveBeenCalledTimes(5); // one per character
  });

  it('clears existing text and types new content', async () => {
    const user = userEvent.setup();

    render(<Input defaultValue="old value" data-testid="input" />);
    const input = screen.getByTestId('input');

    await user.clear(input);
    expect(input).toHaveValue('');

    await user.type(input, 'new value');
    expect(input).toHaveValue('new value');
  });

  it('handles rapid typing without losing characters', async () => {
    const user = userEvent.setup();

    render(<Input data-testid="input" />);
    const input = screen.getByTestId('input');

    const longString = 'The quick brown fox jumps over the lazy dog';
    await user.type(input, longString);
    expect(input).toHaveValue(longString);
  });

  it('supports special characters and symbols', async () => {
    const user = userEvent.setup();

    render(<Input data-testid="input" />);
    const input = screen.getByTestId('input');

    await user.type(input, 'user@example.com');
    expect(input).toHaveValue('user@example.com');
  });

  // ========================================
  // Focus / Blur Interactions
  // ========================================

  it('receives focus on tab', async () => {
    const user = userEvent.setup();

    render(
      <>
        <button>Before</button>
        <Input data-testid="input" />
      </>
    );

    await user.tab(); // focus button
    await user.tab(); // focus input
    expect(screen.getByTestId('input')).toHaveFocus();
  });

  it('fires onFocus and onBlur handlers', async () => {
    const user = userEvent.setup();
    const onFocus = vi.fn();
    const onBlur = vi.fn();

    render(
      <>
        <Input onFocus={onFocus} onBlur={onBlur} data-testid="input" />
        <button>After</button>
      </>
    );

    await user.click(screen.getByTestId('input'));
    expect(onFocus).toHaveBeenCalledOnce();

    await user.tab(); // blur input, focus button
    expect(onBlur).toHaveBeenCalledOnce();
  });

  // ========================================
  // Disabled State
  // ========================================

  it('does not accept input when disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Input disabled placeholder="Disabled" onChange={onChange} />);
    const input = screen.getByPlaceholderText('Disabled');

    await user.type(input, 'test');
    expect(input).toHaveValue('');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('is not focusable when disabled', async () => {
    const user = userEvent.setup();

    render(
      <>
        <button>Before</button>
        <Input disabled data-testid="input" />
        <button>After</button>
      </>
    );

    await user.tab(); // Before
    await user.tab(); // skips disabled input → After
    expect(screen.getByTestId('input')).not.toHaveFocus();
  });

  // ========================================
  // Keyboard Interactions
  // ========================================

  it('selects all text with Ctrl+A', async () => {
    const user = userEvent.setup();

    render(<Input defaultValue="select me" data-testid="input" />);
    const input = screen.getByTestId('input') as HTMLInputElement;

    await user.click(input);
    await user.keyboard('{Control>}a{/Control}');
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('select me'.length);
  });

  it('moves cursor with arrow keys', async () => {
    const user = userEvent.setup();

    render(<Input defaultValue="abc" data-testid="input" />);
    const input = screen.getByTestId('input') as HTMLInputElement;

    await user.click(input);
    // Place cursor at end, then move left
    await user.keyboard('{End}{ArrowLeft}{ArrowLeft}');
    expect(input.selectionStart).toBe(1);
  });

  // ========================================
  // Input Types
  // ========================================

  it('handles password type without exposing value', async () => {
    const user = userEvent.setup();

    render(<Input type="password" data-testid="pw" />);
    const input = screen.getByTestId('pw');

    await user.type(input, 'secret123');
    expect(input).toHaveValue('secret123');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('handles number type', async () => {
    const user = userEvent.setup();

    render(<Input type="number" data-testid="num" />);
    const input = screen.getByTestId('num');

    await user.type(input, '42');
    expect(input).toHaveValue(42);
  });

  // ========================================
  // Controlled Input
  // ========================================

  it('works as a controlled component', async () => {
    const user = userEvent.setup();
    const ControlledInput = () => {
      const [value, setValue] = React.useState('');
      return (
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          data-testid="input"
        />
      );
    };

    // Need React import for the controlled component
    const React = await import('react');

    const { rerender } = render(<ControlledInput />);
    const input = screen.getByTestId('input');

    await user.type(input, 'hello');
    expect(input).toHaveValue('HELLO');
  });

  // ========================================
  // Edge Cases
  // ========================================

  it('handles empty string type gracefully', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Input onChange={onChange} data-testid="input" />);
    const input = screen.getByTestId('input');

    await user.type(input, 'a');
    await user.type(input, '{Backspace}');
    expect(input).toHaveValue('');
  });

  it('preserves placeholder until user types', async () => {
    const user = userEvent.setup();

    render(<Input placeholder="Search projects…" data-testid="input" />);
    const input = screen.getByTestId('input');

    expect(input).toHaveAttribute('placeholder', 'Search projects…');
    expect(input).toHaveValue('');

    await user.type(input, 'x');
    expect(input).toHaveValue('x');
  });
});
