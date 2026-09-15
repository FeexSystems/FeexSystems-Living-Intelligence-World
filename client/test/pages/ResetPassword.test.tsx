import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ResetPassword from '@/pages/ResetPassword';
import { TestWrapper } from '../utils/test-utils';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('?token=valid-token')],
  };
});

// Mock the useAuth hook
const mockResetPassword = vi.fn();
const mockValidateResetToken = vi.fn();
const mockClearError = vi.fn();
const mockUseAuth = {
  resetPassword: mockResetPassword,
  validateResetToken: mockValidateResetToken,
  isLoading: false,
  error: null,
  clearError: mockClearError,
};

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth,
}));

const TestResetPasswordWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <TestWrapper>
      {children}
    </TestWrapper>
  </BrowserRouter>
);

describe('ResetPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.isLoading = false;
    mockUseAuth.error = null;
    mockValidateResetToken.mockResolvedValue(true);
  });

  it('should show loading state while validating token', () => {
    mockValidateResetToken.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <TestResetPasswordWrapper>
        <ResetPassword />
      </TestResetPasswordWrapper>
    );

    expect(screen.getByText('Validating reset link...')).toBeInTheDocument();
  });

  it('should render reset password form when token is valid', async () => {
    render(
      <TestResetPasswordWrapper>
        <ResetPassword />
      </TestResetPasswordWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Set New Password')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
      expect(screen.getByTestId('reset-password-button')).toBeInTheDocument();
    });
  });

  it('should show invalid token message when token is invalid', async () => {
    mockValidateResetToken.mockResolvedValue(false);

    render(
      <TestResetPasswordWrapper>
        <ResetPassword />
      </TestResetPasswordWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
      expect(screen.getByText('This password reset link is invalid or has expired.')).toBeInTheDocument();
    });
  });

  it('should validate password requirements', async () => {
    render(
      <TestResetPasswordWrapper>
        <ResetPassword />
      </TestResetPasswordWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
    });

    const passwordInput = screen.getByTestId('password-input');
    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    fireEvent.blur(passwordInput);

    fireEvent.click(screen.getByTestId('reset-password-button'));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('should validate password confirmation matching', async () => {
    render(
      <TestResetPasswordWrapper>
        <ResetPassword />
      </TestResetPasswordWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
    });

    const passwordInput = screen.getByTestId('password-input');
    const confirmPasswordInput = screen.getByTestId('confirm-password-input');

    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Different123!' } });

    fireEvent.click(screen.getByTestId('reset-password-button'));

    await waitFor(() => {
      expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
    });
  });

  it('should call resetPassword with correct data on valid submission', async () => {
    mockResetPassword.mockResolvedValueOnce(undefined);

    render(
      <TestResetPasswordWrapper>
        <ResetPassword />
      </TestResetPasswordWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
    });

    const passwordInput = screen.getByTestId('password-input');
    const confirmPasswordInput = screen.getByTestId('confirm-password-input');

    fireEvent.change(passwordInput, { target: { value: 'NewPassword123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123!' } });

    fireEvent.click(screen.getByTestId('reset-password-button'));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('valid-token', 'NewPassword123!');
    });
  });

  it('should show success state after successful password reset', async () => {
    mockResetPassword.mockResolvedValueOnce(undefined);

    render(
      <TestResetPasswordWrapper>
        <ResetPassword />
      </TestResetPasswordWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
    });

    const passwordInput = screen.getByTestId('password-input');
    const confirmPasswordInput = screen.getByTestId('confirm-password-input');

    fireEvent.change(passwordInput, { target: { value: 'NewPassword123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123!' } });

    fireEvent.click(screen.getByTestId('reset-password-button'));

    await waitFor(() => {
      expect(screen.getByText('Password Reset Complete')).toBeInTheDocument();
      expect(screen.getByText('Your password has been successfully updated.')).toBeInTheDocument();
    });
  });

  it('should show loading state during password reset', async () => {
    mockUseAuth.isLoading = true;

    render(
      <TestResetPasswordWrapper>
        <ResetPassword />
      </TestResetPasswordWrapper>
    );

    // Wait for token validation to complete and form to render
    await waitFor(() => {
      const submitButton = screen.getByTestId('reset-password-button');
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Updating Password...')).toBeInTheDocument();
    });
  });

  it('should display error message when reset fails', async () => {
    mockUseAuth.error = 'Failed to reset password';

    render(
      <TestResetPasswordWrapper>
        <ResetPassword />
      </TestResetPasswordWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to reset password')).toBeInTheDocument();
    });
  });

  it('should have proper accessibility attributes', async () => {
    render(
      <TestResetPasswordWrapper>
        <ResetPassword />
      </TestResetPasswordWrapper>
    );

    await waitFor(() => {
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      
      expect(passwordInput).toHaveAttribute('aria-invalid', 'false');
      expect(confirmPasswordInput).toHaveAttribute('aria-invalid', 'false');
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    });
  });

  it('should display password requirements', async () => {
    render(
      <TestResetPasswordWrapper>
        <ResetPassword />
      </TestResetPasswordWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Must contain at least 8 characters with uppercase, lowercase, and number')).toBeInTheDocument();
    });
  });

  it('should have link to login page', async () => {
    render(
      <TestResetPasswordWrapper>
        <ResetPassword />
      </TestResetPasswordWrapper>
    );

    await waitFor(() => {
      const loginLink = screen.getByText('Sign in');
      expect(loginLink).toBeInTheDocument();
      expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
    });
  });

  it('should redirect to login after successful reset', async () => {
    mockResetPassword.mockResolvedValueOnce(undefined);
    vi.useFakeTimers();

    render(
      <TestResetPasswordWrapper>
        <ResetPassword />
      </TestResetPasswordWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
    });

    const passwordInput = screen.getByTestId('password-input');
    const confirmPasswordInput = screen.getByTestId('confirm-password-input');

    fireEvent.change(passwordInput, { target: { value: 'NewPassword123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123!' } });

    fireEvent.click(screen.getByTestId('reset-password-button'));

    await waitFor(() => {
      expect(screen.getByText('Password Reset Complete')).toBeInTheDocument();
    });

    // Fast-forward time to trigger redirect
    vi.advanceTimersByTime(3000);

    expect(mockNavigate).toHaveBeenCalledWith('/login');

    vi.useRealTimers();
  });
});