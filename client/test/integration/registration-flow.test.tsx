import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from '@/pages/Register';
import { TestWrapper, createMockUseAuth } from '../utils/test-utils';

// Mock the useAuth hook. Use the shared factory so the mock matches the real
// hook's full surface rather than a hand-rolled partial.
const mockRegister = vi.fn();
const mockClearError = vi.fn();
const mockUseAuth = createMockUseAuth({ register: mockRegister, clearError: mockClearError });

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth,
}));

const TestRegisterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <TestWrapper>
      {children}
    </TestWrapper>
  </BrowserRouter>
);

describe('Registration Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.isLoading = false;
    mockUseAuth.error = null;
  });

  describe('Requirement 1.1: Create account with valid email and password', () => {
    it('should successfully create account with valid data', async () => {
      mockRegister.mockResolvedValueOnce(undefined);

      render(
        <TestRegisterWrapper>
          <Register />
        </TestRegisterWrapper>
      );

      // Fill in valid form data
      fireEvent.change(screen.getByTestId('first-name-input'), {
        target: { value: 'John' }
      });
      fireEvent.change(screen.getByTestId('last-name-input'), {
        target: { value: 'Doe' }
      });
      fireEvent.change(screen.getByTestId('email-input'), {
        target: { value: 'john.doe@example.com' }
      });
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { value: 'SecurePass123!' }
      });
      fireEvent.change(screen.getByTestId('confirm-password-input'), {
        target: { value: 'SecurePass123!' }
      });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'john.doe@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
        });
      });
    });
  });

  describe('Requirement 1.2: Invalid email format validation', () => {
    it('should display error for invalid email format', async () => {
      render(
        <TestRegisterWrapper>
          <Register />
        </TestRegisterWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    it('should accept valid email formats', async () => {
      render(
        <TestRegisterWrapper>
          <Register />
        </TestRegisterWrapper>
      );

      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user123@example-site.org',
      ];

      for (const email of validEmails) {
        const emailInput = screen.getByTestId('email-input');
        fireEvent.change(emailInput, { target: { value: email } });
        fireEvent.blur(emailInput);

        // Should not show email validation error
        expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
      }
    });
  });

  describe('Requirement 1.3: Password security requirements', () => {
    it('should display password requirements', () => {
      render(
        <TestRegisterWrapper>
          <Register />
        </TestRegisterWrapper>
      );

      expect(screen.getByText('Must contain at least 8 characters with uppercase, lowercase, and number')).toBeInTheDocument();
    });

    it('should validate minimum password length', async () => {
      render(
        <TestRegisterWrapper>
          <Register />
        </TestRegisterWrapper>
      );

      const passwordInput = screen.getByTestId('password-input');
      fireEvent.change(passwordInput, { target: { value: 'short' } });
      fireEvent.blur(passwordInput);

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });
    });

    it('should validate password complexity requirements', async () => {
      render(
        <TestRegisterWrapper>
          <Register />
        </TestRegisterWrapper>
      );

      // Each password intentionally breaks a specific rule, so only the
      // message for the missing requirement is expected to be shown.
      const weakPasswords: Array<[string, string]> = [
        ['lowercase', 'Password must contain at least one uppercase letter'],
        ['UPPERCASE', 'Password must contain at least one lowercase letter'],
        ['12345678', 'Password must contain at least one lowercase letter'],
        ['NoNumbers', 'Password must contain at least one number'],
        ['nonumbers123', 'Password must contain at least one uppercase letter'],
        ['NOLOWERCASE123', 'Password must contain at least one lowercase letter'],
      ];

      for (const [password, expectedMessage] of weakPasswords) {
        const passwordInput = screen.getByTestId('password-input');
        fireEvent.change(passwordInput, { target: { value: password } });
        fireEvent.blur(passwordInput);

        fireEvent.submit(document.querySelector('form')!);

        await waitFor(() => {
          expect(screen.getByText(expectedMessage)).toBeInTheDocument();
        });

        // Clear the input for next test
        fireEvent.change(passwordInput, { target: { value: '' } });
      }
    });

    it('should accept strong passwords', async () => {
      render(
        <TestRegisterWrapper>
          <Register />
        </TestRegisterWrapper>
      );

      const strongPasswords = [
        'Password123',
        'MySecure123',
        'Complex1Pass',
        'Strong123!',
      ];

      for (const password of strongPasswords) {
        const passwordInput = screen.getByTestId('password-input');
        fireEvent.change(passwordInput, { target: { value: password } });
        fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: password } });

        // Fill other required fields
        fireEvent.change(screen.getByTestId('first-name-input'), { target: { value: 'John' } });
        fireEvent.change(screen.getByTestId('last-name-input'), { target: { value: 'Doe' } });
        fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'john@example.com' } });

        fireEvent.submit(document.querySelector('form')!);

        // Should not show password validation errors
        await waitFor(() => {
          expect(screen.queryByText('Password must contain at least one uppercase letter')).not.toBeInTheDocument();
          expect(screen.queryByText('Password must contain at least one lowercase letter')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Requirement 1.4: Existing email validation', () => {
    it('should display error when email already exists', async () => {
      mockUseAuth.error = 'Email already exists';

      render(
        <TestRegisterWrapper>
          <Register />
        </TestRegisterWrapper>
      );

      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });
  });

  describe('Requirement 5.1: Form validation and error handling', () => {
    it('should display field-specific error messages for empty required fields', async () => {
      render(
        <TestRegisterWrapper>
          <Register />
        </TestRegisterWrapper>
      );

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument();
        expect(screen.getByText('Last name is required')).toBeInTheDocument();
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    it('should validate password confirmation matching', async () => {
      render(
        <TestRegisterWrapper>
          <Register />
        </TestRegisterWrapper>
      );

      fireEvent.change(screen.getByTestId('password-input'), {
        target: { value: 'Password123' }
      });
      fireEvent.change(screen.getByTestId('confirm-password-input'), {
        target: { value: 'DifferentPass123' }
      });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 5.4: Loading states and form controls', () => {
    it('should show loading indicator and disable form during submission', () => {
      mockUseAuth.isLoading = true;

      render(
        <TestRegisterWrapper>
          <Register />
        </TestRegisterWrapper>
      );

      const submitButton = screen.getByTestId('register-button');
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Creating Account...')).toBeInTheDocument();
    });
  });

  describe('Accessibility Requirements', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TestRegisterWrapper>
          <Register />
        </TestRegisterWrapper>
      );

      // Check for proper labeling
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });

    it('should have proper error announcements', async () => {
      render(
        <TestRegisterWrapper>
          <Register />
        </TestRegisterWrapper>
      );

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        const errorElements = screen.getAllByRole('alert');
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Navigation Integration', () => {
    it('should have link to login page', () => {
      render(
        <TestRegisterWrapper>
          <Register />
        </TestRegisterWrapper>
      );

      const loginLink = screen.getByText('Sign in');
      expect(loginLink).toBeInTheDocument();
      expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
    });
  });
});