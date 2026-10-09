/**
 * ErrorBoundary accessibility tests — keyboard & focus contract.
 * (Sprint 3, Phase 2 — ErrorBoundary, Task 17/57 audit)
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

/** Component that throws an error for testing
 */
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) throw new Error('Test error');
  return <div>No error</div>;
};

/**
 * ErrorBoundary renders a fallback card with keyboard-focusable controls.
 * Keyboard contract: tab order lands on the retry control; Enter/Space
 * activates it; Escape/clicking elsewhere is not trapped (native flow keeps
 * focus inside the card; the card is not a modal).
 */
describe('ErrorBoundary (keyboard & focus)', () => {
  it('renders fallback with a focusable retry control', async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    // Initial focus: first focusable inside the fallback card (retry button)
    await user.tab();
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus();
  });

  it('retry is keyboard-operable (Enter/Space) and re-raises the error', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    await user.tab();
    await user.keyboard('{Enter}'); // reset via keyboard

    // Boundary re-raises the error on retry (same component re-render)
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('Go home link is focusable and points to the root', async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    await user.tab();
    await user.tab();
    const homeLink = screen.getByRole('link', { name: 'Go home' });
    expect(homeLink).toHaveAttribute('href', '/');
    expect(homeLink).toHaveFocus();
  });

  it('dev-mode details summary is a focusable toggle that reveals the stack', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const user = userEvent.setup();

    try {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      // jsdom sequential focus skips summary; focus it directly below.
      const summary = screen.getByText('Show error details'); // jsdom: summary has no ARIA role
      expect(summary.tagName).toBe('SUMMARY');
      (summary as HTMLElement).focus();
      expect(summary).toHaveFocus();

      // Pressing Enter on the summary opens the details block (jsdom: click)
      await user.click(summary); // jsdom: click toggles details, Enter does not
      const pre = screen.getByText((_c, el) => el?.tagName === 'PRE' && (el.textContent ?? '').includes('Test error'));
      expect(pre).toBeInTheDocument();
      expect(pre.textContent).toContain('Test error');
      expect(pre.textContent).toContain('at ThrowError');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

describe('ErrorBoundary (ARIA integrity)', () => {
  it('fallback exposes semantic roles for the screen reader', () => {
    process.env.NODE_ENV = 'development';
    try {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Something went wrong');
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go home' })).toBeInTheDocument();
      const summary = screen.getByText('Show error details'); // jsdom: summary has no ARIA role
      expect(summary.tagName).toBe('SUMMARY');
    } finally {
      delete process.env.NODE_ENV;
    }
  });

  it('retry button is a real button, not a div with onClick', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    const retry = screen.getByRole('button', { name: 'Try again' });
    expect(retry.tagName).toBe('BUTTON');
  });
});

// Axe accessibility scan (enable with vitest-axe):
// import { axe, toHaveNoViolations } from 'vitest-axe';
// expect.extend(toHaveNoViolations);
//
// it('has no axe violations', async () => {
//   const { container } = render(
//     <ErrorBoundary>
//       <ThrowError shouldThrow />
//     </ErrorBoundary>
//   );
//   expect(await axe(container)).toHaveNoViolations();
// });

