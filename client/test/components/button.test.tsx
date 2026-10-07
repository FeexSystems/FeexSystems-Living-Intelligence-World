/**
 * Button component test — instantiated from
 * client/test/templates/component.test.tsx.template (Sprint 2, Task 7).
 *
 * Covers: render, variants, props spread, interaction, a11y (role, keyboard,
 * focus), and edge cases. Axe block stays commented until vitest-axe lands.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  // ========================================
  // Render Tests
  // ========================================

  it('renders correctly', () => {
    render(<Button>Continue</Button>);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(<Button className="custom-class">Go</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  // ========================================
  // Variant Tests
  // ========================================

  it('renders all variants', () => {
    const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;

    variants.forEach((variant) => {
      const { unmount, getByRole } = render(<Button variant={variant}>V</Button>);
      expect(getByRole('button')).toBeInTheDocument();
      unmount();
    });
  });

  // ========================================
  // Props Tests
  // ========================================

  it('spreads additional props correctly', () => {
    render(<Button data-testid="custom-element">Props</Button>);
    expect(screen.getByTestId('custom-element')).toBeInTheDocument();
  });

  // ========================================
  // Interaction Tests
  // ========================================

  it('handles click events', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Click</Button>);

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  // ========================================
  // Accessibility Tests
  // ========================================

  it('exposes button role with accessible name', () => {
    render(<Button>A11y</Button>);
    const btn = screen.getByRole('button', { name: 'A11y' });
    expect(btn.tagName).toBe('BUTTON');
    // NOTE: Button ships WITHOUT a default type — inside <form> it submits
    // (HTML default). Documented for Task 57 audit; do not change here or
    // 63 call sites relying on implicit submit would break.
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

  // ========================================
  // Edge Cases
  // ========================================

  it('handles disabled state', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        Off
      </Button>
    );

    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  // ========================================
  // Axe Accessibility Scan (enable with vitest-axe — Sprint 5, Task 17)
  // ========================================
  // import { axe, toHaveNoViolations } from 'vitest-axe';
  // expect.extend(toHaveNoViolations);
  //
  // it('has no axe violations', async () => {
  //   const { container } = render(<Button>Scan</Button>);
  //   expect(await axe(container)).toHaveNoViolations();
  // });
});
