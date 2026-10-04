import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from '@/pages/Register';
import { TestWrapper, createMockUseAuth } from '../utils/test-utils';

// Mock the useAuth hook. Use the shared factory so the mock always matches the
// real hook's full surface (Register calls clearError() on mount).
const mockRegister = vi.fn();
const mockUseAuth = createMockUseAuth({ register: mockRegister });

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

describe('Register Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render registration form with all required fields', () => {
    render(
      <TestRegisterWrapper>
        <Register />
      </TestRegisterWrapper>
    );

    expect(screen.getByTestId('first-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('last-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('register-button')).toBeInTheDocument();
  });

  it('should display validation errors for empty fields', async () => {
    render(
      <TestRegisterWrapper>
        <Register />
      </TestRegisterWrapper>
    );

    const submitButton = screen.getByTestId('register-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('should display password validation errors', async () => {
    render(
      <TestRegisterWrapper>
        <Register />
      </TestRegisterWrapper>
    );

    const passwordInput = screen.getByTestId('password-input');
    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    fireEvent.blur(passwordInput);

    // The form validates on submit (react-hook-form's default mode), so blur
    // alone will not surface the error.
    fireEvent.click(screen.getByTestId('register-button'));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('should display password mismatch error', async () => {
    render(
      <TestRegisterWrapper>
        <Register />
      </TestRegisterWrapper>
    );

    const passwordInput = screen.getByTestId('password-input');
    const confirmPasswordInput = screen.getByTestId('confirm-password-input');

    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Different123!' } });
    fireEvent.blur(confirmPasswordInput);

    const submitButton = screen.getByTestId('register-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
    });
  });

  it('should call register function with correct data on valid form submission', async () => {
    render(
      <TestRegisterWrapper>
        <Register />
      </TestRegisterWrapper>
    );

    const firstNameInput = screen.getByTestId('first-name-input');
    const lastNameInput = screen.getByTestId('last-name-input');
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const confirmPasswordInput = screen.getByTestId('confirm-password-input');
    const submitButton = screen.getByTestId('register-button');

    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });
    });
  });

  it('should display loading state during registration', () => {
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

  it('should display error message when registration fails', () => {
    mockUseAuth.error = 'Email already exists';

    render(
      <TestRegisterWrapper>
        <Register />
      </TestRegisterWrapper>
    );

    expect(screen.getByText('Email already exists')).toBeInTheDocument();
  });

  it('should display password requirements', () => {
    render(
      <TestRegisterWrapper>
        <Register />
      </TestRegisterWrapper>
    );

    expect(screen.getByText('Must contain at least 8 characters with uppercase, lowercase, and number')).toBeInTheDocument();
  });

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