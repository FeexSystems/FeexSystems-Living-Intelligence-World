/**
 * Button Component — Interaction Tests (Task 55: Sprint 14)
 *
 * Tests realistic user interactions with the Button component using
 * @testing-library/user-event. Covers: click, keyboard activation,
 * disabled state, and form submission.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '@/components/ui/button';

describe('Button — Interaction Tests', () => {
  // ========================================
  // Click Interactions
  // ========================================

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Click Me</Button>);
    
    await user.click(screen.getByRole('button', { name: 'Click Me' }));
    
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('handles double clicks', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Double Click Me</Button>);
    
    await user.dblClick(screen.getByRole('button', { name: 'Double Click Me' }));
    
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  // ========================================
  // Keyboard Interactions
  // ========================================

  it('is focusable via Tab', async () => {
    const user = userEvent.setup();

    render(
      <>
        <button>First</button>
        <Button>Second</Button>
      </>
    );

    await user.tab(); // focus First
    await user.tab(); // focus Second

    expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus();
  });

  it('calls onClick when Enter is pressed while focused', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Enter Me</Button>);
    
    await user.tab(); // focus the button
    expect(screen.getByRole('button', { name: 'Enter Me' })).toHaveFocus();

    await user.keyboard('{Enter}');
    
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('calls onClick when Space is pressed while focused', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Space Me</Button>);
    
    await user.tab(); // focus the button
    await user.keyboard(' ');
    
    expect(onClick).toHaveBeenCalledOnce();
  });

  // ========================================
  // Disabled State
  // ========================================

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button disabled onClick={onClick}>Disabled Button</Button>);
    const button = screen.getByRole('button', { name: 'Disabled Button' });

    expect(button).toBeDisabled();

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('is not focusable via Tab when disabled', async () => {
    const user = userEvent.setup();

    render(
      <>
        <button>First</button>
        <Button disabled>Second</Button>
        <button>Third</button>
      </>
    );

    await user.tab(); // focus First
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();

    await user.tab(); // should skip Second, focus Third
    expect(screen.getByRole('button', { name: 'Third' })).toHaveFocus();
  });

  // ========================================
  // Form Submission
  // ========================================

  it('submits a form when type="submit"', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e) => e.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <input type="text" defaultValue="test" />
        <Button type="submit">Submit Form</Button>
      </form>
    );

    await user.click(screen.getByRole('button', { name: 'Submit Form' }));
    
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('does not submit a form when type="button"', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e) => e.preventDefault());
    const onClick = vi.fn();

    render(
      <form onSubmit={onSubmit}>
        <input type="text" defaultValue="test" />
        <Button type="button" onClick={onClick}>Just a Button</Button>
      </form>
    );

    await user.click(screen.getByRole('button', { name: 'Just a Button' }));
    
    expect(onClick).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // ========================================
  // asChild (Radix Slot)
  // ========================================

  it('maintains interaction when rendered asChild (e.g. as an anchor)', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((e) => e.preventDefault());

    render(
      <Button asChild>
        <a href="https://example.com" onClick={onClick}>
          Link Button
        </a>
      </Button>
    );

    const link = screen.getByRole('link', { name: 'Link Button' });
    await user.click(link);

    expect(onClick).toHaveBeenCalledOnce();
  });
});
