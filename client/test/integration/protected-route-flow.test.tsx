import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, PublicRoute, AdminRoute } from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import { TestWrapper, createMockUser } from '../utils/test-utils';

// Mock the useAuthStore hook
const mockUseAuthStore = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
};

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: () => mockUseAuthStore,
  // test-utils' TestWrapper renders <AuthStoreProvider/>; without this export
  // the shared wrapper throws "No AuthStoreProvider export is defined".
  AuthStoreProvider: ({ children }: any) => children,
}));

// `ProtectedRoute` reads the Firebase context rather than the legacy store, so
// mocking only auth-store left the real hook throwing "useFirebaseAuth must be
// used within FirebaseAuthProvider".
vi.mock('@/lib/firebase-auth', () => ({
  useFirebaseAuth: () => ({
    user: mockUseAuthStore.user,
    isAuthenticated: mockUseAuthStore.isAuthenticated,
    isLoading: mockUseAuthStore.isLoading,
    error: null,
  }),
  AuthUser: {},
}));

// Mock the useAuth hook
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockClearError = vi.fn();
const mockUseAuth = {
  login: mockLogin,
  logout: mockLogout,
  isLoading: false,
  error: null,
  clearError: mockClearError,
};

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth,
}));

// Test App component with routing
const TestApp = () => (
  <BrowserRouter>
    <TestWrapper>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Dashboard Content</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <div>Profile Content</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <div>Admin Content</div>
            </AdminRoute>
          }
        />
        <Route
          path="/"
          element={
            <PublicRoute>
              <div>Home Page</div>
            </PublicRoute>
          }
        />
      </Routes>
    </TestWrapper>
  </BrowserRouter>
);

describe('Protected Route Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.isAuthenticated = false;
    mockUseAuthStore.user = null;
    mockUseAuthStore.isLoading = false;
    mockUseAuth.isLoading = false;
    mockUseAuth.error = null;
    
    // Reset window location.
    //
    // The stub MUST keep `origin`/`href`: replacing window.location with a bare
    // {pathname,search,hash} object makes anything that builds a URL (BrowserRouter
    // links, MSW request interception) throw
    // "No window.location.(origin|href) available to create URL".
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
        get href() {
          return `http://localhost:3000${this.pathname}${this.search}${this.hash}`;
        },
        pathname: '/',
        search: '',
        hash: '',
      },
      writable: true,
    });
  });

  describe('Requirement 2.4: Session expiration redirect', () => {
    it('should redirect to login when session expires', () => {
      // Start with authenticated user
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser();

      const { rerender } = render(<TestApp />);

      // Navigate to protected route
      window.history.pushState({}, '', '/dashboard');
      rerender(<TestApp />);

      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();

      // Simulate session expiration
      mockUseAuthStore.isAuthenticated = false;
      mockUseAuthStore.user = null;

      rerender(<TestApp />);

      // Should redirect to login
      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 2.5: Redirect authenticated users from public routes', () => {
    it('should redirect authenticated users away from login page', () => {
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser();

      window.history.pushState({}, '', '/login');
      render(<TestApp />);

      // Should not show login form
      expect(screen.queryByText('Welcome Back')).not.toBeInTheDocument();
      expect(screen.queryByTestId('login-button')).not.toBeInTheDocument();
    });

    it('should redirect authenticated users away from home page', () => {
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser();

      window.history.pushState({}, '', '/');
      render(<TestApp />);

      // Should not show home page
      expect(screen.queryByText('Home Page')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 3.4: Redirect to login after logout', () => {
    it('should redirect to login when accessing protected routes after logout', () => {
      // Start authenticated
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser();

      window.history.pushState({}, '', '/dashboard');
      const { rerender } = render(<TestApp />);

      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();

      // Simulate logout
      mockUseAuthStore.isAuthenticated = false;
      mockUseAuthStore.user = null;

      rerender(<TestApp />);

      // Should no longer show protected content
      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 4.4: Automatic logout on invalid tokens', () => {
    it('should handle automatic logout when tokens are invalid', () => {
      // Start with authenticated state
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser();

      window.history.pushState({}, '', '/profile');
      const { rerender } = render(<TestApp />);

      expect(screen.getByText('Profile Content')).toBeInTheDocument();

      // Simulate token invalidation (would be triggered by API calls)
      mockUseAuthStore.isAuthenticated = false;
      mockUseAuthStore.user = null;

      rerender(<TestApp />);

      // Should lose access to protected content
      expect(screen.queryByText('Profile Content')).not.toBeInTheDocument();
    });
  });

  describe('Preserving Intended Destination', () => {
    it('should preserve intended destination when redirecting to login', async () => {
      mockUseAuthStore.isAuthenticated = false;

      // Try to access protected route
      window.history.pushState({}, '', '/profile');
      render(<TestApp />);

      // Should not show protected content
      expect(screen.queryByText('Profile Content')).not.toBeInTheDocument();
    });

    it('should redirect to intended destination after successful login', async () => {
      mockUseAuthStore.isAuthenticated = false;
      mockLogin.mockImplementation(async (email, password, redirectTo) => {
        // Simulate successful login
        mockUseAuthStore.isAuthenticated = true;
        mockUseAuthStore.user = createMockUser();
        
        // In real app, this would trigger navigation
        if (redirectTo && redirectTo !== '/dashboard') {
          window.history.pushState({}, '', redirectTo);
        }
      });

      // Start at login with intended destination
      window.history.pushState({}, '', '/login');
      const locationState = { from: { pathname: '/profile' } };
      
      // Mock useLocation to return the state
      vi.doMock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useLocation: () => ({
            pathname: '/login',
            search: '',
            hash: '',
            state: locationState,
          }),
        };
      });

      render(<TestApp />);

      // Fill in login form
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123', '/profile');
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin access to admin routes', () => {
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser({ role: 'ADMIN' });

      window.history.pushState({}, '', '/admin');
      render(<TestApp />);

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('should deny regular user access to admin routes', () => {
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser({ role: 'USER' });

      window.history.pushState({}, '', '/admin');
      render(<TestApp />);

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('You don\'t have permission to access this page. This area requires admin privileges.')).toBeInTheDocument();
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('should allow super admin access to admin routes', () => {
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser({ role: 'SUPER_ADMIN' });

      window.history.pushState({}, '', '/admin');
      render(<TestApp />);

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state while checking authentication', () => {
      mockUseAuthStore.isLoading = true;

      window.history.pushState({}, '', '/dashboard');
      render(<TestApp />);

      expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
    });

    it('should show content after loading completes for authenticated user', () => {
      mockUseAuthStore.isLoading = true;

      window.history.pushState({}, '', '/dashboard');
      const { rerender } = render(<TestApp />);

      expect(screen.getByText('Checking authentication...')).toBeInTheDocument();

      // Complete loading with authenticated user
      mockUseAuthStore.isLoading = false;
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser();

      rerender(<TestApp />);

      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });
  });

  describe('Navigation Integration', () => {
    it('should work seamlessly with React Router navigation', () => {
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser();

      // Start at dashboard
      window.history.pushState({}, '', '/dashboard');
      const { rerender } = render(<TestApp />);

      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();

      // Navigate to profile
      window.history.pushState({}, '', '/profile');
      rerender(<TestApp />);

      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
      expect(screen.getByText('Profile Content')).toBeInTheDocument();
    });

    it('should handle browser back/forward navigation correctly', () => {
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser();

      // Navigate through multiple routes
      window.history.pushState({}, '', '/dashboard');
      const { rerender } = render(<TestApp />);
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();

      window.history.pushState({}, '', '/profile');
      rerender(<TestApp />);
      expect(screen.getByText('Profile Content')).toBeInTheDocument();

      // Simulate back navigation
      window.history.back();
      window.history.pushState({}, '', '/dashboard');
      rerender(<TestApp />);
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });
  });
});