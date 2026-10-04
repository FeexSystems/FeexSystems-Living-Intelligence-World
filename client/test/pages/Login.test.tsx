import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '@/pages/Login';
import { TestWrapper, createMockUseAuth } from '../utils/test-utils';

// Mock the useAuth hook. Use the shared factory so the mock always matches the
// real hook's full surface (Login renders a Google sign-in button).
const mockLogin = vi.fn();
const mockClearError = vi.fn();
const mockUseAuth = createMockUseAuth({ login: mockLogin, clearError: mockClearError });

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock react-router-dom
const mockUseLocation = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockUseLocation(),
  };
});

const TestLoginWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <TestWrapper>
      {children}
    </TestWrapper>
  </BrowserRouter>
);

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.isLoading = false;
    mockUseAuth.error = null;
    mockUseLocation.mockReturnValue({
      pathname: '/login',
      search: '',
      hash: '',
      state: null,
    });
  });

  it('should render login form with all required fields', () => {
    render(
      <TestLoginWrapper>
        <Login />
      </TestLoginWrapper>
    );

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account to continue')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
  });

  it('should display validation errors for empty fields', async () => {
    render(
      <TestLoginWrapper>
        <Login />
      </TestLoginWrapper>
    );

    const submitButton = screen.getByTestId('login-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('should display validation error for invalid email format', async () => {
    render(
      <TestLoginWrapper>
        <Login />
      </TestLoginWrapper>
    );

    const emailInput = screen.getByTestId('email-input');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    fireEvent.click(screen.getByTestId('login-button'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('should call login function with correct credentials on valid submission', async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    render(
      <TestLoginWrapper>
        <Login />
      </TestLoginWrapper>
    );

    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('login-button');

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123', '/dashboard');
    });
  });

  it('should redirect to intended destination after login', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    
    // Mock location state with intended destination
    mockUseLocation.mockReturnValue({
      pathname: '/login',
      search: '',
      hash: '',
      state: { from: { pathname: '/protected-page' } },
    });

    render(
      <TestLoginWrapper>
        <Login />
      </TestLoginWrapper>
    );

    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('login-button');

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123', '/protected-page');
    });
  });

  it('should default to dashboard when no intended destination', async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    render(
      <TestLoginWrapper>
        <Login />
      </TestLoginWrapper>
    );

    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('login-button');

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123', '/dashboard');
    });
  });

  it('should show the auth skeleton while the session is being restored', () => {
    mockUseAuth.isLoading = true;

    render(
      <TestLoginWrapper>
        <Login />
      </TestLoginWrapper>
    );

    expect(screen.getByTestId('auth-form-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('login-button')).not.toBeInTheDocument();
  });

  it('should keep the form mounted but disabled while submitting', async () => {
    // Never resolves, so the component stays in its submitting state.
    mockLogin.mockReturnValue(new Promise(() => {}));

    const { rerender } = render(
      <TestLoginWrapper>
        <Login />
      </TestLoginWrapper>
    );

    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByTestId('login-button'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123', '/dashboard');
    });

    // Once submitted, isLoading must NOT swap the form back out for the
    // skeleton — the button owns the busy state instead.
    mockUseAuth.isLoading = true;
    rerender(
      <TestLoginWrapper>
        <Login />
      </TestLoginWrapper>
    );

    expect(screen.getByTestId('login-button')).toBeDisabled();
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
  });

  it('should display error message when login fails', () => {
    mockUseAuth.error = 'Invalid credentials';

    render(
      <TestLoginWrapper>
        <Login />
      </TestLoginWrapper>
    );

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('should have link to registration page', () => {
    render(
      <TestLoginWrapper>
        <Login />
      </TestLoginWrapper>
    );

    const registerLink = screen.getByText('Create account');
    expect(registerLink).toBeInTheDocument();
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
  });

  it('should have link to forgot password page', () => {
    render(
      <TestLoginWrapper>
        <Login />
      </TestLoginWrapper>
    );

    const forgotPasswordLink = screen.getByText('Forgot password?');
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/forgot-password');
  });

  it('should clear errors on component mount', () => {
    render(
      <TestLoginWrapper>
        <Login />
      </TestLoginWrapper>
    );

    expect(mockClearError).toHaveBeenCalled();
  });

  it('should have proper accessibility attributes', () => {
    render(
      <TestLoginWrapper>
        <Login />
      </TestLoginWrapper>
    );

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should handle complex redirect paths with query parameters', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    
    // Mock location state with complex intended destination
    mockUseLocation.mockReturnValue({
      pathname: '/login',
      search: '',
      hash: '',
      state: { from: { pathname: '/dashboard/settings', search: '?tab=profile' } },
    });

    render(
      <TestLoginWrapper>
        <Login />
      </TestLoginWrapper>
    );

    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('login-button');

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123', '/dashboard/settings');
    });
  });
});