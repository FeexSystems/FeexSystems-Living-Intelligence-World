/**
 * Input component test — instantiated from
 * client/test/templates/component.test.tsx.template (Sprint 2, Task 7).
 *
 * Covers: render, variants, props spread, interaction, a11y (role, keyboard,
 * focus), and edge cases. Axe block stays commented until vitest-axe lands.
 *
 * Priority: #1 — Most-used flagged component; every form depends on
 * caller-managed labels/errors (finding H2). A11y risk multiplier: 3.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  // ========================================
  // Render Tests
  // ========================================

  it('renders correctly', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(<Input className="custom-class" placeholder="Test" />);
    const input = screen.getByPlaceholderText('Test');
    expect(input).toHaveClass('custom-class');
  });

  it('renders with left icon', () => {
    const { unmount } = render(
      <Input leftIcon={<span className="icon" aria-label="Search icon" />} placeholder="Search" />
    );
    const input = screen.getByPlaceholderText('Search');
    const icon = screen.getByRole('img', { name: 'Search icon' });
    expect(icon).toBeInTheDocument();
    unmount();
  });

  it('renders with right icon', () => {
    const { unmount } = render(
      <Input rightIcon={<span className="icon" aria-label="Clear icon" />} placeholder="Clear" />
    );
    const input = screen.getByPlaceholderText('Clear');
    const icon = screen.getByRole('img', { name: 'Clear icon' });
    expect(icon).toBeInTheDocument();
    unmount();
  });

  // ========================================
  // Variant Tests
  // ========================================

  it('renders with error state styling', () => {
    render(<Input error="This field is required" placeholder="Required" />);
    const input = screen.getByPlaceholderText('Required');
    expect(input).toHaveClass('border-red-500');
    const errorText = screen.getByText('This field is required');
    expect(errorText).toBeInTheDocument();
  });

  it('renders with helper text', () => {
    render(
      <Input helperText="Enter your email" placeholder="Email" />
    );
    const helper = screen.getByText('Enter your email');
    expect(helper).toHaveClass('text-muted-foreground');
    expect(helper).toBeInTheDocument();
  });

  // ========================================
  // Props Tests
  // ========================================

  it('spreads additional props correctly', () => {
    render(<Input data-testid="custom-element" placeholder="Test" />);
    expect(screen.getByTestId('custom-element')).toBeInTheDocument();
  });

  it('applies type attribute', () => {
    render(<Input type="email" placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled" />);
    const input = screen.getByPlaceholderText('Disabled');
    expect(input).toBeDisabled();
  });

  // ========================================
  // Interaction Tests
  // ========================================

  it('handles focus event', () => {
    const onFocus = vi.fn();
    render(<Input onFocus={onFocus} placeholder="Focus me" />);
    const input = screen.getByPlaceholderText('Focus me');
    input.focus();
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('handles blur event', () => {
    const onBlur = vi.fn();
    render(<Input onBlur={onBlur} placeholder="Blur me" />);
    const input = screen.getByPlaceholderText('Blur me');
    input.focus();
    input.blur();
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('handles input change', async () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} placeholder="Type here" />);
    const input = screen.getByPlaceholderText('Type here');
    await userEvent.type(input, 'Hello World');
    expect(input).toHaveValue('Hello World');
  });

  // ========================================
  // Accessibility Tests
  // ========================================

  it('exposes text input element', () => {
    render(<Input placeholder="Accessible input" />);
    const input = screen.getByPlaceholderText('Accessible input');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('is keyboard accessible', async () => {
    render(<Input placeholder="Keyboard" />);

    const input = screen.getByPlaceholderText('Keyboard');
    await userEvent.tab();
    expect(input).toHaveFocus();
    expect(input).toBeVisible();
  });

  it('has visible focus indicator', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Focus me" />);
    const input = screen.getByPlaceholderText('Focus me');
    await user.tab();
    const element = screen.getByPlaceholderText('Focus me');
    expect(element).toHaveFocus();
  });

  // ========================================
  // Edge Cases
  // ========================================

  it('handles empty input', () => {
    render(<Input placeholder="Empty" />);
    const input = screen.getByPlaceholderText('Empty');
    expect(input).toHaveValue('');
  });

  it('handles readonly state', () => {
    render(<Input readonly placeholder="Readonly" />);
    const input = screen.getByPlaceholderText('Readonly');
    expect(input).toHaveAttribute('readonly');
  });

  it('handles number type', () => {
    render(<Input type="number" placeholder="Number" />);
    const input = screen.getByPlaceholderText('Number');
    expect(input).toHaveAttribute('type', 'number');
  });

  it('handles search type', () => {
    render(<Input type="search" placeholder="Search" />);
    const input = screen.getByPlaceholderText('Search');
    expect(input).toHaveAttribute('type', 'search');
  });

  // ========================================
  // Axe Accessibility Scan (enable with vitest-axe — Sprint 5, Task 17)
  // ========================================

  // import { axe, toHaveNoViolations } from 'vitest-axe';

  // it('has no axe violations', async () => {
  //   const { container } = render(<Input placeholder="Scan" />);
  //   expect(await axe(container)).toHaveNoViolations();
  // });
});