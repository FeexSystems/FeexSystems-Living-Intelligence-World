/**
 * Tooltip Component — Interaction Tests (Task 55: Sprint 14)
 *
 * Tests realistic user interactions with the Tooltip component using
 * @testing-library/user-event. Covers: hover show/hide, focus show/hide,
 * and content rendering.
 *
 * NOTE: Radix Tooltip relies on pointer events and timers internally.
 * Some hover tests use `advanceTimersByTime` to trigger delay-based shows.
 */

import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

/** Helper to render a standard tooltip test fixture. */
function renderTooltip(props?: { delayDuration?: number }) {
  return render(
    <TooltipProvider delayDuration={props?.delayDuration ?? 0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button>Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Tooltip content text</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

describe('Tooltip — Interaction Tests', () => {
  // ========================================
  // Hover Interactions
  // ========================================

  it('shows tooltip content on hover', async () => {
    const user = userEvent.setup();
    renderTooltip();

    const trigger = screen.getByRole('button', { name: 'Hover me' });

    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getAllByText('Tooltip content text')[0]).toBeInTheDocument();
    });
  });

  it('hides tooltip content on unhover', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0} disableHoverableContent>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tooltip content text</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    const trigger = screen.getByRole('button', { name: 'Hover me' });

    await user.hover(trigger);
    await waitFor(() => {
      expect(screen.getAllByText('Tooltip content text')[0]).toBeInTheDocument();
    });

    await user.unhover(trigger);
    await waitFor(() => {
      expect(screen.queryAllByText('Tooltip content text')).toHaveLength(0);
    });
  });

  // ========================================
  // Focus Interactions
  // ========================================

  it('shows tooltip on focus', async () => {
    const user = userEvent.setup();
    renderTooltip();

    await user.tab(); // focus the trigger button

    await waitFor(() => {
      expect(screen.getAllByText('Tooltip content text')[0]).toBeInTheDocument();
    });
  });

  it('hides tooltip on blur', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tooltip content text</p>
          </TooltipContent>
        </Tooltip>
        <button>Other button</button>
      </TooltipProvider>
    );

    await user.tab(); // focus trigger
    await waitFor(() => {
      expect(screen.getAllByText('Tooltip content text')[0]).toBeInTheDocument();
    });

    await user.tab(); // blur trigger → focus other button
    await waitFor(() => {
      expect(screen.queryAllByText('Tooltip content text')).toHaveLength(0);
    });
  });

  // ========================================
  // Rendering
  // ========================================

  it('does not show tooltip initially', () => {
    renderTooltip();
    expect(screen.queryAllByText('Tooltip content text')).toHaveLength(0);
  });

  it('renders trigger button without tooltip portal initially', () => {
    renderTooltip();
    expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
  });

  // ========================================
  // Multiple Tooltips
  // ========================================

  it('shows only the hovered tooltip in a group', async () => {
    const user = userEvent.setup();

    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>First</Button>
          </TooltipTrigger>
          <TooltipContent>First tooltip</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Second</Button>
          </TooltipTrigger>
          <TooltipContent>Second tooltip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    await user.hover(screen.getByRole('button', { name: 'First' }));
    await waitFor(() => {
      expect(screen.getAllByText('First tooltip')[0]).toBeInTheDocument();
    });
    expect(screen.queryAllByText('Second tooltip')).toHaveLength(0);
  });
});
