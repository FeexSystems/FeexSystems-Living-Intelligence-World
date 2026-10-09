import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import { TestWrapper, createMockUseAuth } from '../utils/test-utils';

// Mock the useAuth hook. Use the shared factory so the mock matches the real
// hook's surface; the previous partial omitted members that the pages read.
const mockForgotPassword = vi.fn();
const mockResetPassword = vi.fn();
const mockValidateResetToken = vi.fn();
const mockClearError = vi.fn();
const mockUseAuth = createMockUseAuth({
  forgotPassword: mockForgotPassword,
  resetPassword: mockResetPassword,
  validateResetToken: mockValidateResetToken,
  clearError: mockClearError,
});

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth,
}));

const TestWrapper_Component = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <TestWrapper>
      {children}
    </TestWrapper>
  </BrowserRouter>
);

describe('Password Reset Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.isLoading = false;
    mockUseAuth.error = null;
  });

  describe('Requirement 5.1: Form validation and error handling', () => {
    it('should display field-specific error messages for empty email field', async () => {
      render(
        <TestWrapper_Component>
          <ForgotPassword />
        </TestWrapper_Component>
      );

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    it('should validate email format in forgot password form', async () => {
      render(
        <TestWrapper_Component>
          <ForgotPassword />
        </TestWrapper_Component>
      );

      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    it('should validate password requirements in reset form', async () => {
      mockValidateResetToken.mockResolvedValue(true);

      // Mock useSearchParams to return a valid token
      vi.doMock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useSearchParams: () => [new URLSearchParams('?token=valid-token')],
          useNavigate: () => vi.fn(),
        };
      });

      // ResetPassword is a DEFAULT export; destructuring a named `ResetPassword`
      // yielded undefined and React threw "Element type is invalid".
      const { default: MockedResetPassword } = await import('@/pages/ResetPassword');

      render(
        <TestWrapper_Component>
          <MockedResetPassword />
        </TestWrapper_Component>
      );

      await waitFor(() => {
        expect(screen.getByTestId('password-input')).toBeInTheDocument();
      });

      const passwordInput = screen.getByTestId('password-input');
      fireEvent.change(passwordInput, { target: { value: 'weak' } });
      fireEvent.blur(passwordInput);

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 5.2: Real-time validation feedback', () => {
    it('should provide immediate feedback for invalid email format', async () => {
      render(
        <TestWrapper_Component>
          <ForgotPassword />
        </TestWrapper_Component>
      );

      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'invalid' } });
      fireEvent.blur(emailInput);

      // Should show validation error immediately
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    it('should show password mismatch error immediately', async () => {
      mockValidateResetToken.mockResolvedValue(true);

      vi.doMock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useSearchParams: () => [new URLSearchParams('?token=valid-token')],
          useNavigate: () => vi.fn(),
        };
      });

      // ResetPassword is a DEFAULT export; destructuring a named `ResetPassword`
      // yielded undefined and React threw "Element type is invalid".
      const { default: MockedResetPassword } = await import('@/pages/ResetPassword');

      render(
        <TestWrapper_Component>
          <MockedResetPassword />
        </TestWrapper_Component>
      );

      await waitFor(() => {
        expect(screen.getByTestId('password-input')).toBeInTheDocument();
      });

      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');

      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'Different123!' } });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 5.3: API error handling', () => {
    it('should display user-friendly error messages for API failures', async () => {
      mockUseAuth.error = 'Failed to send reset email. Please try again.';

      render(
        <TestWrapper_Component>
          <ForgotPassword />
        </TestWrapper_Component>
      );

      expect(screen.getByText('Failed to send reset email. Please try again.')).toBeInTheDocument();
    });

    it('should handle invalid token errors gracefully', async () => {
      mockValidateResetToken.mockResolvedValue(false);

      vi.doMock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useSearchParams: () => [new URLSearchParams('?token=invalid-token')],
          useNavigate: () => vi.fn(),
        };
      });

      // ResetPassword is a DEFAULT export; destructuring a named `ResetPassword`
      // yielded undefined and React threw "Element type is invalid".
      const { default: MockedResetPassword } = await import('@/pages/ResetPassword');

      render(
        <TestWrapper_Component>
          <MockedResetPassword />
        </TestWrapper_Component>
      );

      await waitFor(() => {
        expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
        expect(screen.getByText('This password reset link is invalid or has expired.')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 5.4: Loading states and form controls', () => {
    it('should show loading indicator and disable form during forgot password submission', () => {
      mockUseAuth.isLoading = true;

      render(
        <TestWrapper_Component>
          <ForgotPassword />
        </TestWrapper_Component>
      );

      const submitButton = screen.getByTestId('send-reset-button');
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });

    it('should show loading indicator during password reset', async () => {
      mockValidateResetToken.mockResolvedValue(true);
      mockUseAuth.isLoading = true;

      vi.doMock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useSearchParams: () => [new URLSearchParams('?token=valid-token')],
          useNavigate: () => vi.fn(),
        };
      });

      // ResetPassword is a DEFAULT export; destructuring a named `ResetPassword`
      // yielded undefined and React threw "Element type is invalid".
      const { default: MockedResetPassword } = await import('@/pages/ResetPassword');

      render(
        <TestWrapper_Component>
          <MockedResetPassword />
        </TestWrapper_Component>
      );

      // Wait for token validation, then check loading state
      setTimeout(async () => {
        await waitFor(() => {
          const submitButton = screen.getByTestId('reset-password-button');
          expect(submitButton).toBeDisabled();
          expect(screen.getByText('Updating Password...')).toBeInTheDocument();
        });
      }, 100);
    });
  });

  describe('Complete Password Reset Flow', () => {
    it('should complete the full password reset journey', async () => {
      // Step 1: Request password reset
      mockForgotPassword.mockResolvedValueOnce(undefined);

      const { rerender } = render(
        <TestWrapper_Component>
          <ForgotPassword />
        </TestWrapper_Component>
      );

      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith('user@example.com');
        expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      });

      // Step 2: Reset password with token
      mockValidateResetToken.mockResolvedValue(true);
      mockResetPassword.mockResolvedValueOnce(undefined);

      vi.doMock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useSearchParams: () => [new URLSearchParams('?token=valid-token')],
          useNavigate: () => vi.fn(),
        };
      });

      // ResetPassword is a DEFAULT export; destructuring a named `ResetPassword`
      // yielded undefined and React threw "Element type is invalid".
      const { default: MockedResetPassword } = await import('@/pages/ResetPassword');

      rerender(
        <TestWrapper_Component>
          <MockedResetPassword />
        </TestWrapper_Component>
      );

      await waitFor(() => {
        expect(screen.getByTestId('password-input')).toBeInTheDocument();
      });

      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');

      fireEvent.change(passwordInput, { target: { value: 'NewSecurePass123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'NewSecurePass123!' } });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('valid-token', 'NewSecurePass123!');
        expect(screen.getByText('Password Reset Complete')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Requirements', () => {
    it('should have proper ARIA labels and roles for forgot password form', () => {
      render(
        <TestWrapper_Component>
          <ForgotPassword />
        </TestWrapper_Component>
      );

      expect(screen.getByLabelText('Email')).toBeInTheDocument();

      const emailInput = screen.getByTestId('email-input');
      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
    });

    it('should have proper error announcements', async () => {
      render(
        <TestWrapper_Component>
          <ForgotPassword />
        </TestWrapper_Component>
      );

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toBeInTheDocument();
      });
    });
  });
});