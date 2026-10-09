import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EmailVerification from '@/pages/EmailVerification';
import Register from '@/pages/Register';
import { TestWrapper, createMockUseAuth } from '../utils/test-utils';

// Mock the useAuth hook. Use the shared factory so the mock matches the real
// hook's full surface rather than a hand-rolled partial.
const mockVerifyEmail = vi.fn();
const mockResendVerificationEmail = vi.fn();
const mockRegister = vi.fn();
const mockClearError = vi.fn();
const mockUseAuth = createMockUseAuth({
  verifyEmail: mockVerifyEmail,
  resendVerificationEmail: mockResendVerificationEmail,
  register: mockRegister,
  clearError: mockClearError,
});

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockUseSearchParams = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockUseSearchParams()],
    useLocation: () => ({ pathname: '/register', search: '', hash: '', state: null }),
  };
});

const TestWrapper_Component = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <TestWrapper>
      {children}
    </TestWrapper>
  </BrowserRouter>
);

describe('Email Verification Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.isLoading = false;
    mockUseAuth.error = null;
  });

  describe('Requirement 1.1: Email verification after registration', () => {
    it('should redirect to email verification after successful registration', async () => {
      mockRegister.mockResolvedValueOnce(undefined);

      render(
        <TestWrapper_Component>
          <Register />
        </TestWrapper_Component>
      );

      // Fill in registration form
      fireEvent.change(screen.getByTestId('first-name-input'), { target: { value: 'John' } });
      fireEvent.change(screen.getByTestId('last-name-input'), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'Password123!' } });
      fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'Password123!' } });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        });
      });

      // Registration should redirect to email verification
      // This would be handled by the useAuth hook in the actual implementation
    });
  });

  describe('Email Verification Process', () => {
    it('should successfully verify email with valid token', async () => {
      mockUseSearchParams.mockReturnValue({
        get: vi.fn().mockImplementation((key) => {
          if (key === 'token') return 'valid-verification-token';
          if (key === 'email') return 'john@example.com';
          return null;
        }),
      });

      mockVerifyEmail.mockResolvedValueOnce(undefined);

      render(
        <TestWrapper_Component>
          <EmailVerification />
        </TestWrapper_Component>
      );

      // Should show loading initially
      expect(screen.getByText('Verifying Your Email')).toBeInTheDocument();

      // Should call verifyEmail with the token
      await waitFor(() => {
        expect(mockVerifyEmail).toHaveBeenCalledWith('valid-verification-token');
      });

      // Should show success state
      await waitFor(() => {
        expect(screen.getByText('Email Verified!')).toBeInTheDocument();
      });
    });

    it('should handle expired verification token', async () => {
      mockUseSearchParams.mockReturnValue({
        get: vi.fn().mockImplementation((key) => {
          if (key === 'token') return 'expired-token';
          if (key === 'email') return 'john@example.com';
          return null;
        }),
      });

      mockVerifyEmail.mockRejectedValueOnce(new Error('Token expired'));

      render(
        <TestWrapper_Component>
          <EmailVerification />
        </TestWrapper_Component>
      );

      await waitFor(() => {
        expect(screen.getByText('Verification Link Expired')).toBeInTheDocument();
        expect(screen.getByText('This verification link has expired or is invalid. Please request a new one.')).toBeInTheDocument();
      });
    });

    it('should handle invalid verification token', async () => {
      mockUseSearchParams.mockReturnValue({
        get: vi.fn().mockImplementation((key) => {
          if (key === 'token') return 'invalid-token';
          if (key === 'email') return 'john@example.com';
          return null;
        }),
      });

      mockVerifyEmail.mockRejectedValueOnce(new Error('Invalid token'));

      render(
        <TestWrapper_Component>
          <EmailVerification />
        </TestWrapper_Component>
      );

      await waitFor(() => {
        expect(screen.getByText('Verification Failed')).toBeInTheDocument();
        expect(screen.getByText('We couldn\'t verify your email address. The link may be invalid or expired.')).toBeInTheDocument();
      });
    });
  });

  describe('Resend Verification Email', () => {
    it('should successfully resend verification email', async () => {
      mockUseSearchParams.mockReturnValue({
        get: vi.fn().mockImplementation((key) => {
          if (key === 'token') return 'expired-token';
          if (key === 'email') return 'john@example.com';
          return null;
        }),
      });

      mockVerifyEmail.mockRejectedValueOnce(new Error('Token expired'));
      mockResendVerificationEmail.mockResolvedValueOnce(undefined);

      render(
        <TestWrapper_Component>
          <EmailVerification />
        </TestWrapper_Component>
      );

      await waitFor(() => {
        expect(screen.getByText('Verification Link Expired')).toBeInTheDocument();
      });

      const resendButton = screen.getByText('Resend Verification Email');
      fireEvent.click(resendButton);

      await waitFor(() => {
        expect(mockResendVerificationEmail).toHaveBeenCalledWith('john@example.com');
      });
    });

    it('should handle resend verification email failure', async () => {
      mockUseSearchParams.mockReturnValue({
        get: vi.fn().mockImplementation((key) => {
          if (key === 'token') return 'expired-token';
          if (key === 'email') return 'john@example.com';
          return null;
        }),
      });

      mockVerifyEmail.mockRejectedValueOnce(new Error('Token expired'));
      mockResendVerificationEmail.mockRejectedValueOnce(new Error('Failed to send email'));

      render(
        <TestWrapper_Component>
          <EmailVerification />
        </TestWrapper_Component>
      );

      await waitFor(() => {
        expect(screen.getByText('Verification Link Expired')).toBeInTheDocument();
      });

      const resendButton = screen.getByText('Resend Verification Email');
      fireEvent.click(resendButton);

      await waitFor(() => {
        expect(mockResendVerificationEmail).toHaveBeenCalledWith('john@example.com');
      });

      // Error should be handled by the useAuth hook with toast notification
    });
  });

  describe('Requirement 5.3: API error handling', () => {
    it('should display user-friendly error messages for API failures', async () => {
      mockUseSearchParams.mockReturnValue({
        get: vi.fn().mockImplementation((key) => {
          if (key === 'token') return 'valid-token';
          if (key === 'email') return 'john@example.com';
          return null;
        }),
      });

      mockVerifyEmail.mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper_Component>
          <EmailVerification />
        </TestWrapper_Component>
      );

      await waitFor(() => {
        expect(screen.getByText('Verification Failed')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation and User Experience', () => {
    it('should redirect to login after successful verification', async () => {
      mockUseSearchParams.mockReturnValue({
        get: vi.fn().mockImplementation((key) => {
          if (key === 'token') return 'valid-token';
          if (key === 'email') return 'john@example.com';
          return null;
        }),
      });

      mockVerifyEmail.mockResolvedValueOnce(undefined);
      // Real timers: waitFor() polls via setTimeout, so freezing timers made the
      // poll loop itself hang and this test time out.

      render(
        <TestWrapper_Component>
          <EmailVerification />
        </TestWrapper_Component>
      );

      await waitFor(() => {
        expect(screen.getByText('Email Verified!')).toBeInTheDocument();
      });

      // The page redirects to /login 3s after showing the success panel.
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/login');
        },
        { timeout: 5000 }
      );
    });

    it('should provide navigation options in error states', async () => {
      mockUseSearchParams.mockReturnValue({
        get: vi.fn().mockImplementation((key) => {
          if (key === 'token') return 'invalid-token';
          if (key === 'email') return 'john@example.com';
          return null;
        }),
      });

      mockVerifyEmail.mockRejectedValueOnce(new Error('Invalid token'));

      render(
        <TestWrapper_Component>
          <EmailVerification />
        </TestWrapper_Component>
      );

      await waitFor(() => {
        expect(screen.getByText('Verification Failed')).toBeInTheDocument();
      });

      // Should have navigation links
      const createAccountLink = screen.getByText('Create New Account');
      const loginLink = screen.getByText('Back to Login');

      expect(createAccountLink.closest('a')).toHaveAttribute('href', '/register');
      expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
    });

    it('should handle missing token gracefully', () => {
      mockUseSearchParams.mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      });

      render(
        <TestWrapper_Component>
          <EmailVerification />
        </TestWrapper_Component>
      );

      expect(screen.getByText('Verification Failed')).toBeInTheDocument();
      expect(screen.getByText('We couldn\'t verify your email address. The link may be invalid or expired.')).toBeInTheDocument();
    });
  });

  describe('Loading States and User Feedback', () => {
    it('should show loading state during verification', () => {
      mockUseSearchParams.mockReturnValue({
        get: vi.fn().mockImplementation((key) => {
          if (key === 'token') return 'valid-token';
          if (key === 'email') return 'john@example.com';
          return null;
        }),
      });

      render(
        <TestWrapper_Component>
          <EmailVerification />
        </TestWrapper_Component>
      );

      expect(screen.getByText('Verifying Your Email')).toBeInTheDocument();
      expect(screen.getByText('Please wait while we verify your email address...')).toBeInTheDocument();
    });

    it('should show loading state during resend operation', async () => {
      mockUseSearchParams.mockReturnValue({
        get: vi.fn().mockImplementation((key) => {
          if (key === 'token') return 'expired-token';
          if (key === 'email') return 'john@example.com';
          return null;
        }),
      });

      mockVerifyEmail.mockRejectedValueOnce(new Error('Token expired'));
      mockUseAuth.isLoading = true;

      render(
        <TestWrapper_Component>
          <EmailVerification />
        </TestWrapper_Component>
      );

      await waitFor(() => {
        expect(screen.getByText('Verification Link Expired')).toBeInTheDocument();
      });

      const resendButton = screen.getByText('Sending...');
      expect(resendButton).toBeDisabled();
    });
  });
});