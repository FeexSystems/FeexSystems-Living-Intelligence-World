/**
 * Card Component — Interaction Tests (Task 55: Sprint 14)
 *
 * Tests interactions within the Card component using
 * @testing-library/user-event. While Card is largely presentational,
 * it often contains interactive elements (buttons, inputs) that need
 * to function correctly inside it.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

describe('Card — Interaction Tests', () => {
  // ========================================
  // Interactive Elements within Card
  // ========================================

  it('allows clicking a button inside a card footer', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>Make changes to your profile here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card Content</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </CardFooter>
      </Card>
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('allows typing into inputs inside a card content area', async () => {
    const user = userEvent.setup();

    render(
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <label htmlFor="username">Username</label>
          <input id="username" type="text" />
        </CardContent>
      </Card>
    );

    const input = screen.getByLabelText('Username');
    await user.click(input);
    await user.type(input, 'newuser123');

    expect(input).toHaveValue('newuser123');
  });

  // ========================================
  // Keyboard Navigation inside Card
  // ========================================

  it('supports tabbing through interactive elements in the card', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <button>Outside Before</button>
        <Card>
          <CardContent>
            <input aria-label="First Input" />
            <input aria-label="Second Input" />
          </CardContent>
          <CardFooter>
            <Button>Action</Button>
          </CardFooter>
        </Card>
        <button>Outside After</button>
      </div>
    );

    // Start outside
    await user.tab();
    expect(screen.getByRole('button', { name: 'Outside Before' })).toHaveFocus();

    // Move into card
    await user.tab();
    expect(screen.getByLabelText('First Input')).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText('Second Input')).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Action' })).toHaveFocus();

    // Move outside
    await user.tab();
    expect(screen.getByRole('button', { name: 'Outside After' })).toHaveFocus();
  });

  // ========================================
  // Whole Card Interactivity (Custom implementation)
  // ========================================

  it('can be made interactive with click handlers', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Card 
        onClick={onClick} 
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClick();
          }
        }}
        role="button" 
        tabIndex={0} 
        aria-label="Interactive Card"
      >
        <CardHeader>
          <CardTitle>Selectable Option</CardTitle>
        </CardHeader>
      </Card>
    );

    const interactiveCard = screen.getByRole('button', { name: 'Interactive Card' });
    
    // Click test
    await user.click(interactiveCard);
    expect(onClick).toHaveBeenCalledTimes(1);

    // Keyboard test (Enter)
    interactiveCard.focus();
    expect(interactiveCard).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
