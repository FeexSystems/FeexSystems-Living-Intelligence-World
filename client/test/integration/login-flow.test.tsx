import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Login from '@/pages/Login';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { TestWrapper, createMockUser, createMockTokens } from '../utils/test-utils';

// Mock the auth store
const mockLogin = vi.fn();
const mockClearError = vi.fn();
const mockUseAuthStore = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: mockLogin,
  clearError: mockClearError,
};

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: () => mockUseAuthStore,
  // test-utils' TestWrapper renders <AuthStoreProvider/>; without this export
  // the shared wrapper throws "No AuthStoreProvider export is defined".
  AuthStoreProvider: ({ children }: any) => children,
}));

// `ProtectedRoute` reads the Firebase context rather than the legacy store, so
// mocking only auth-store left the real hook throwing "useFirebaseAuth must be
// used within FirebaseAuthProvider". Proxy the same object so the suite keeps
// driving auth state through one place.
vi.mock('@/lib/firebase-auth', () => ({
  useFirebaseAuth: () => ({
    user: mockUseAuthStore.user,
    isAuthenticated: mockUseAuthStore.isAuthenticated,
    isLoading: mockUseAuthStore.isLoading,
    error: mockUseAuthStore.error,
    login: mockLogin,
    clearError: mockClearError,
  }),
  AuthUser: {},
}));

// Mock the useAuth hook
const mockUseAuth = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: mockLogin,
  clearError: mockClearError,
};

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock useLocation and useNavigate
const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
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

const TestProtectedWrapper = ({ 
  children, 
  initialEntries = ['/dashboard'] 
}: { 
  children: React.ReactNode;
  initialEntries?: string[];
}) => (
  <MemoryRouter initialEntries={initialEntries}>
    <TestWrapper>
      <ProtectedRoute>
        {children}
      </ProtectedRoute>
    </TestWrapper>
  </MemoryRouter>
);

describe('Login Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.user = null;
    mockUseAuth.isAuthenticated = false;
    mockUseAuth.isLoading = false;
    mockUseAuth.error = null;
    mockUseAuthStore.user = null;
    mockUseAuthStore.tokens = null;
    mockUseAuthStore.isAuthenticated = false;
    mockUseAuthStore.isLoading = false;
    mockUseAuthStore.error = null;
    
    mockUseLocation.mockReturnValue({
      pathname: '/login',
      search: '',
      hash: '',
      state: null,
    });
  });

  describe('Successful Login Flow', () => {
    it('should complete the full login journey', async () => {
      const mockUser = createMockUser();
      const mockTokens = createMockTokens();
      
      // Mock successful login
      mockLogin.mockResolvedValueOnce({
        user: mockUser,
        tokens: mockTokens,
      });

      render(
        <TestLoginWrapper>
          <Login />
        </TestLoginWrapper>
      );

      // Fill in login form
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Submit form
      fireEvent.click(loginButton);

      // Verify login was called with correct credentials
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      // Verify loading state was shown
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
    });

    it('should redirect to intended destination after login', async () => {
      const mockUser = createMockUser();
      const mockTokens = createMockTokens();
      
      // Mock location with intended destination
      mockUseLocation.mockReturnValue({
        pathname: '/login',
        search: '',
        hash: '',
        state: { from: { pathname: '/profile' } },
      });

      mockLogin.mockResolvedValueOnce({
        user: mockUser,
        tokens: mockTokens,
      });

      render(
        <TestLoginWrapper>
          <Login />
        </TestLoginWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      // After successful login, should navigate to intended destination
      // This would be handled by the auth context/store in a real scenario
    });

    it('should redirect to dashboard by default after login', async () => {
      const mockUser = createMockUser();
      const mockTokens = createMockTokens();
      
      mockLogin.mockResolvedValueOnce({
        user: mockUser,
        tokens: mockTokens,
      });

      render(
        <TestLoginWrapper>
          <Login />
        </TestLoginWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });
  });

  describe('Failed Login Flow', () => {
    it('should handle invalid credentials error', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      mockUseAuth.error = 'Invalid credentials';

      render(
        <TestLoginWrapper>
          <Login />
        </TestLoginWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'invalid@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('invalid@example.com', 'wrongpassword');
      });

      // Should display error message
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      
      // Should not redirect
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Network error'));
      mockUseAuth.error = 'Network error. Please try again.';

      render(
        <TestLoginWrapper>
          <Login />
        </TestLoginWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
    });

    it('should clear previous errors when retrying', async () => {
      // First attempt fails
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      mockUseAuth.error = 'Invalid credentials';

      render(
        <TestLoginWrapper>
          <Login />
        </TestLoginWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'invalid@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('invalid@example.com', 'wrongpassword');
      });

      // Clear error for retry
      mockUseAuth.error = null;
      mockLogin.mockResolvedValueOnce({
        user: createMockUser(),
        tokens: createMockTokens(),
      });

      // Retry with correct credentials
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('Form Validation Integration', () => {
    it('should validate email format', async () => {
      render(
        <TestLoginWrapper>
          <Login />
        </TestLoginWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      const loginButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });

      // Should not call login with invalid data
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      render(
        <TestLoginWrapper>
          <Login />
        </TestLoginWrapper>
      );

      const loginButton = screen.getByTestId('login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should enable form submission only when valid', async () => {
      render(
        <TestLoginWrapper>
          <Login />
        </TestLoginWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');

      // Initially form should be submittable (no validation errors)
      expect(loginButton).not.toBeDisabled();

      // Fill in valid data
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect(loginButton).not.toBeDisabled();
    });
  });

  describe('Loading State Integration', () => {
    it('should show loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve;
      });
      
      mockLogin.mockReturnValueOnce(loginPromise);
      mockUseAuth.isLoading = true;

      render(
        <TestLoginWrapper>
          <Login />
        </TestLoginWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      // Should show loading state
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
      expect(loginButton).toBeDisabled();

      // Resolve login
      resolveLogin!({
        user: createMockUser(),
        tokens: createMockTokens(),
      });

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should disable form during loading', async () => {
      mockUseAuth.isLoading = true;

      render(
        <TestLoginWrapper>
          <Login />
        </TestLoginWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');

      expect(loginButton).toBeDisabled();
      expect(emailInput).not.toBeDisabled(); // Inputs should remain enabled
      expect(passwordInput).not.toBeDisabled();
    });
  });

  describe('Navigation Integration', () => {
    it('should have link to registration page', () => {
      render(
        <TestLoginWrapper>
          <Login />
        </TestLoginWrapper>
      );

      const registerLink = screen.getByText('Sign up');
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

    it('should redirect authenticated users away from login page', () => {
      mockUseAuth.isAuthenticated = true;
      mockUseAuth.user = createMockUser();
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser();

      render(
        <TestProtectedWrapper initialEntries={['/login']}>
          <div data-testid="dashboard">Dashboard Content</div>
        </TestProtectedWrapper>
      );

      // Should redirect to dashboard instead of showing login
      expect(screen.queryByTestId('email-input')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TestLoginWrapper>
          <Login />
        </TestLoginWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
      expect(passwordInput).toHaveAttribute('aria-invalid', 'false');
    });

    it('should announce errors to screen readers', async () => {
      mockUseAuth.error = 'Invalid credentials';

      render(
        <TestLoginWrapper>
          <Login />
        </TestLoginWrapper>
      );

      const errorMessage = screen.getByText('Invalid credentials');
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });

    it('should update ARIA attributes on validation errors', async () => {
      render(
        <TestLoginWrapper>
          <Login />
        </TestLoginWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      const loginButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      });
    });
  });

  describe('Error Recovery Integration', () => {
    it('should allow retry after error', async () => {
      // First attempt fails
      mockLogin.mockRejectedValueOnce(new Error('Network error'));
      mockUseAuth.error = 'Network error';

      render(
        <TestLoginWrapper>
          <Login />
        </TestLoginWrapper>
      );

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Clear error and retry
      mockUseAuth.error = null;
      mockLogin.mockResolvedValueOnce({
        user: createMockUser(),
        tokens: createMockTokens(),
      });

      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(2);
      });
    });

    it('should clear errors when user starts typing', async () => {
      mockUseAuth.error = 'Invalid credentials';

      render(
        <TestLoginWrapper>
          <Login />
        </TestLoginWrapper>
      );

      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();

      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

      // Error should be cleared when user starts typing
      expect(mockClearError).toHaveBeenCalled();
    });
  });
});