/**
 * Form Component — Interaction Tests (Task 55: Sprint 14)
 *
 * Tests realistic user interactions with the Form component (which wraps
 * react-hook-form and Radix/Tailwind components) using @testing-library/user-event.
 * Covers: input typing, form submission, validation errors, and resetting.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// --- Test Schema ---
const formSchema = z.object({
  username: z.string().min(3, {
    message: 'Username must be at least 3 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
});

type FormValues = z.infer<typeof formSchema>;

/** Helper component for testing the Form integration. */
function TestForm({ onSubmit }: { onSubmit: (values: FormValues) => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" data-testid="test-form" noValidate>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter username" {...field} />
              </FormControl>
              <FormDescription>This is your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="button" onClick={() => form.reset()} variant="outline">
          Reset
        </Button>
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

describe('Form — Interaction Tests', () => {
  // ========================================
  // Valid Submission
  // ========================================

  it('submits valid data successfully', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm onSubmit={onSubmit} />);

    // Type valid data
    await user.type(screen.getByLabelText('Username'), 'testuser');
    await user.type(screen.getByLabelText('Email'), 'test@example.com');

    // Submit form
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        { username: 'testuser', email: 'test@example.com' },
        expect.anything()
      );
    });

    // Errors should not be visible
    expect(screen.queryAllByText('Username must be at least 3 characters.')).toHaveLength(0);
  });

  // ========================================
  // Validation Errors
  // ========================================

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm onSubmit={onSubmit} />);

    // Submit form without filling it out
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    // Verify errors are displayed
    await waitFor(() => {
      expect(screen.getAllByText('Username must be at least 3 characters.')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Please enter a valid email address.')[0]).toBeInTheDocument();
    });

    // onSubmit should not have been called
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation errors for invalid input formats', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm onSubmit={onSubmit} />);

    // Type invalid data (too short username, bad email)
    await user.type(screen.getByLabelText('Username'), 'ab');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getAllByText('Username must be at least 3 characters.')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Please enter a valid email address.')[0]).toBeInTheDocument();
    });
  });

  // ========================================
  // Interaction resolving errors
  // ========================================

  it('clears validation errors when valid data is typed after a failed submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm onSubmit={onSubmit} />);

    // Trigger errors
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => {
      expect(screen.getAllByText('Username must be at least 3 characters.')[0]).toBeInTheDocument();
    });

    // Fix the username
    const usernameInput = screen.getByLabelText('Username');
    await user.click(usernameInput);
    await user.type(usernameInput, 'validuser');

    // React Hook Form (in onChange mode, which is default after submit) will clear the error
    await waitFor(() => {
      expect(screen.queryAllByText('Username must be at least 3 characters.')).toHaveLength(0);
    });
  });

  // ========================================
  // Resetting
  // ========================================

  it('resets the form to default values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm onSubmit={onSubmit} />);

    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email');

    // Type data
    await user.type(usernameInput, 'someuser');
    await user.type(emailInput, 'some@email.com');

    expect(usernameInput).toHaveValue('someuser');
    expect(emailInput).toHaveValue('some@email.com');

    // Click Reset
    await user.click(screen.getByRole('button', { name: 'Reset' }));

    // Values should return to default (empty string)
    await waitFor(() => {
      expect(usernameInput).toHaveValue('');
      expect(emailInput).toHaveValue('');
    });
  });

  // ========================================
  // Keyboard Interactions
  // ========================================

  it('submits form on Enter key in input field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm onSubmit={onSubmit} />);

    const emailInput = screen.getByLabelText('Email');
    
    // Type valid data
    await user.type(screen.getByLabelText('Username'), 'testuser');
    await user.type(emailInput, 'test@example.com');

    // Press enter while focused in the email field
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
