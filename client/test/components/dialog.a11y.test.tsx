/**
 * Dialog accessibility tests â€” keyboard & focus contract.
 * (Sprint 3, Phase 2 â€” Radix dialog wrapper, Task 17/57 audit)
 *
 * Harness notes (verified against Radix in jsdom):
 * - Controlled (`open`) dialogs are used for focus-trap / ARIA assertions;
 *   Radix auto-focuses the Close button on mount.
 * - Uncontrolled dialogs are used for trigger flows (click/Enter/Space/Escape),
 *   because a controlled `open` without state updates cannot close on Escape.
 * - `DialogTrigger asChild` avoids nesting button inside Radix trigger.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/** Controlled open dialog â€” for focus-trap and ARIA assertions. */
function renderControlledDialog() {
  const onOpenChange = vi.fn();
  return {
    onOpenChange,
    utils: render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button data-testid='open-trigger'>Open dialog</Button>
        </DialogTrigger>
        <DialogContent data-testid='dialog-content'>
          <DialogHeader>
            <DialogTitle>Test dialog</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button data-testid='ok-button'>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    ),
  };
}

/** Uncontrolled dialog â€” for trigger/keyboard/Escape flows. */
function renderTriggerDialog() {
  const onOpenChange = vi.fn();
  return {
    onOpenChange,
    utils: render(
      <Dialog onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button data-testid='open-trigger'>Open dialog</Button>
        </DialogTrigger>
        <DialogContent data-testid='dialog-content'>
          <DialogHeader>
            <DialogTitle>Test dialog</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    ),
  };
}

describe('Dialog (keyboard & focus)', () => {
  it('opens focused inside the dialog (Radix auto-focuses Close)', async () => {
    const user = userEvent.setup();
    renderControlledDialog();

    await user.tab();
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement);
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('trigger opens the dialog on click', async () => {
    const user = userEvent.setup();
    renderTriggerDialog();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('open-trigger'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement);
  });

  it('Escape closes the dialog and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderTriggerDialog();

    await user.click(screen.getByTestId('open-trigger'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByTestId('open-trigger')).toHaveFocus();
  });

  it('Tab stays trapped inside the dialog while it is open', async () => {
    const user = userEvent.setup();
    renderControlledDialog();

    const content = screen.getByRole('dialog');
    for (let i = 0; i < 8; i += 1) {
      await user.tab();
    }
    expect(content).toContainElement(document.activeElement);
  });

  it('trigger is keyboard-activatable (Enter and Space)', async () => {
    const user = userEvent.setup();
    renderTriggerDialog();

    const trigger = screen.getByTestId('open-trigger');
    trigger.focus();
    expect(trigger).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    trigger.focus();
    await user.keyboard(' ');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('Dialog (ARIA integrity)', () => {
  it('exposes dialog role with labelled title and description', () => {
    renderControlledDialog();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
    expect(screen.getByRole('heading', { name: 'Test dialog' })).toBeInTheDocument();
    expect(screen.getByText('Dialog description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('Close is a real button with accessible name', () => {
    renderControlledDialog();

    const close = screen.getByRole('button', { name: 'Close' });
    expect(close.tagName).toBe('BUTTON');
  });

  it('dialog closes cleanly when unmounted', () => {
    const { unmount } = renderControlledDialog().utils;

    unmount();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// Axe accessibility scan (enable with vitest-axe):
// import { axe, toHaveNoViolations } from 'vitest-axe';
// expect.extend(toHaveNoViolations);
//
// it('has no axe violations', async () => {
//   const { container } = renderControlledDialog().utils;
//   expect(await axe(container)).toHaveNoViolations();
// });
