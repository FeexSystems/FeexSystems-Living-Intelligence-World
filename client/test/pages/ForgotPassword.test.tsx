import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ForgotPassword from '@/pages/ForgotPassword';
import { TestWrapper } from '../utils/test-utils';

// Mock the useAuth hook
const mockForgotPassword = vi.fn();
const mockClearError = vi.fn();
const mockUseAuth = {
  forgotPassword: mockForgotPassword,
  isLoading: false,
  error: null,
  clearError: mockClearError,
};

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth,
}));

const TestForgotPasswordWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <TestWrapper>
      {children}
    </TestWrapper>
  </BrowserRouter>
);

describe('ForgotPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.isLoading = false;
    mockUseAuth.error = null;
  });

  it('should render forgot password form', () => {
    render(
      <TestForgotPasswordWrapper>
        <ForgotPassword />
      </TestForgotPasswordWrapper>
    );

    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByText('Enter your email address and we\'ll send you a link to reset your password')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('send-reset-button')).toBeInTheDocument();
  });

  it('should display validation error for invalid email', async () => {
    render(
      <TestForgotPasswordWrapper>
        <ForgotPassword />
      </TestForgotPasswordWrapper>
    );

    const emailInput = screen.getByTestId('email-input');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('should call forgotPassword with correct email on valid submission', async () => {
    mockForgotPassword.mockResolvedValueOnce(undefined);

    render(
      <TestForgotPasswordWrapper>
        <ForgotPassword />
      </TestForgotPasswordWrapper>
    );

    const emailInput = screen.getByTestId('email-input');
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('user@example.com');
    });
  });

  it('should show success state after successful submission', async () => {
    mockForgotPassword.mockResolvedValueOnce(undefined);

    render(
      <TestForgotPasswordWrapper>
        <ForgotPassword />
      </TestForgotPasswordWrapper>
    );

    const emailInput = screen.getByTestId('email-input');
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      expect(screen.getByText('We\'ve sent password reset instructions to user@example.com')).toBeInTheDocument();
    });
  });

  it('should show loading state during submission', () => {
    mockUseAuth.isLoading = true;

    render(
      <TestForgotPasswordWrapper>
        <ForgotPassword />
      </TestForgotPasswordWrapper>
    );

    const submitButton = screen.getByTestId('send-reset-button');
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Sending...')).toBeInTheDocument();
  });

  it('should display error message when request fails', () => {
    mockUseAuth.error = 'Failed to send reset email';

    render(
      <TestForgotPasswordWrapper>
        <ForgotPassword />
      </TestForgotPasswordWrapper>
    );

    expect(screen.getByText('Failed to send reset email')).toBeInTheDocument();
  });

  it('should allow trying different email from success state', async () => {
    mockForgotPassword.mockResolvedValueOnce(undefined);

    render(
      <TestForgotPasswordWrapper>
        <ForgotPassword />
      </TestForgotPasswordWrapper>
    );

    // Submit first email
    const emailInput = screen.getByTestId('email-input');
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByText('Check Your Email')).toBeInTheDocument();
    });

    // Click try different email
    fireEvent.click(screen.getByText('Try Different Email'));

    // Should return to form
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(
      <TestForgotPasswordWrapper>
        <ForgotPassword />
      </TestForgotPasswordWrapper>
    );

    const emailInput = screen.getByTestId('email-input');
    expect(emailInput).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('should have link to login page', () => {
    render(
      <TestForgotPasswordWrapper>
        <ForgotPassword />
      </TestForgotPasswordWrapper>
    );

    const loginLink = screen.getByText('Sign in');
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });

  it('should clear errors on component mount', () => {
    render(
      <TestForgotPasswordWrapper>
        <ForgotPassword />
      </TestForgotPasswordWrapper>
    );

    expect(mockClearError).toHaveBeenCalled();
  });
});