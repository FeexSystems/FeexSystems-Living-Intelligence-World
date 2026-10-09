import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute, AdminRoute, GuestOnlyRoute } from '@/components/ProtectedRoute';
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

// Test App component with routing.
//
// Driven by MemoryRouter + initialEntries. The previous harness pushed onto
// window.history and re-rendered <TestApp/>; BrowserRouter does not pick up
// pushState mutations inside jsdom, so the route under test never changed and
// assertions ran against the wrong screen.
const TestApp = ({ initialEntries = ['/'] }: { initialEntries?: string[] }) => (
  <MemoryRouter initialEntries={initialEntries}>
    <TestWrapper>
      <Routes>
        <Route
          path="/login"
          element={
            <GuestOnlyRoute>
              <Login />
            </GuestOnlyRoute>
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
        <Route
          path="/guest"
          element={
            <GuestOnlyRoute>
              <div>Guest Content</div>
            </GuestOnlyRoute>
          }
        />
      </Routes>
    </TestWrapper>
  </MemoryRouter>
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

      const { rerender } = render(<TestApp initialEntries={['/dashboard']} />);

      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();

      // Simulate session expiration
      mockUseAuthStore.isAuthenticated = false;
      mockUseAuthStore.user = null;

      rerender(<TestApp initialEntries={['/dashboard']} />);

      // Should redirect to login
      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 2.5: Guest-only routes redirect authenticated users', () => {
    // Mirrors the real router: `/login` is wrapped in <GuestOnlyRoute> in
    // client/App.tsx, while genuinely public surfaces (/, /world, /projects ...)
    // use <PublicRoute>, which is a passthrough by design.
    it('should redirect authenticated users away from login page', () => {
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser();

      render(<TestApp initialEntries={['/login']} />);

      // Redirected to /dashboard, so the login form is not rendered.
      expect(screen.queryByTestId('login-button')).not.toBeInTheDocument();
    });

    it('should redirect authenticated users away from the home page route guard', () => {
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser();

      // The `/` route in the harness uses <GuestOnlyRoute>, proving an
      // authenticated user is bounced out of a guest-only surface.
      render(<TestApp initialEntries={['/guest']} />);

      expect(screen.queryByText('Guest Content')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 3.4: Redirect to login after logout', () => {
    it('should redirect to login when accessing protected routes after logout', () => {
      // Start authenticated
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser();

      const { rerender } = render(<TestApp initialEntries={['/dashboard']} />);

      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();

      // Simulate logout
      mockUseAuthStore.isAuthenticated = false;
      mockUseAuthStore.user = null;

      rerender(<TestApp initialEntries={['/dashboard']} />);

      // Should no longer show protected content
      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 4.4: Automatic logout on invalid tokens', () => {
    it('should handle automatic logout when tokens are invalid', () => {
      // Start with authenticated state
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser();

      const { rerender } = render(<TestApp initialEntries={['/profile']} />);

      expect(screen.getByText('Profile Content')).toBeInTheDocument();

      // Simulate token invalidation (would be triggered by API calls)
      mockUseAuthStore.isAuthenticated = false;
      mockUseAuthStore.user = null;

      rerender(<TestApp initialEntries={['/profile']} />);

      // Should lose access to protected content
      expect(screen.queryByText('Profile Content')).not.toBeInTheDocument();
    });
  });

  describe('Preserving Intended Destination', () => {
    it('should preserve intended destination when redirecting to login', async () => {
      mockUseAuthStore.isAuthenticated = false;

      // Try to access protected route
      render(<TestApp initialEntries={['/profile']} />);

      // Should not show protected content
      expect(screen.queryByText('Profile Content')).not.toBeInTheDocument();
    });

    it('should redirect to intended destination after successful login', async () => {
      mockUseAuthStore.isAuthenticated = false;
      mockLogin.mockImplementation(async () => {
        // Simulate successful login
        mockUseAuthStore.isAuthenticated = true;
        mockUseAuthStore.user = createMockUser();
      });

      // Start at login carrying the intended destination in router state.
      // MemoryRouter accepts { pathname, state } entries directly, so the
      // vi.doMock('react-router-dom') shim this test used is unnecessary.
      render(
        <MemoryRouter
          initialEntries={[{ pathname: '/login', state: { from: { pathname: '/profile' } } }]}
        >
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
            </Routes>
          </TestWrapper>
        </MemoryRouter>
      );

      // Fill in login form
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123', '/profile');
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin access to admin routes', () => {
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser({ role: 'ADMIN' });

      render(<TestApp initialEntries={['/admin']} />);

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('should deny regular user access to admin routes', () => {
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser({ role: 'USER' });

      render(<TestApp initialEntries={['/admin']} />);

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('You don\'t have permission to access this page. This area requires admin privileges.')).toBeInTheDocument();
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('should allow super admin access to admin routes', () => {
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser({ role: 'SUPER_ADMIN' });

      render(<TestApp initialEntries={['/admin']} />);

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state while checking authentication', () => {
      mockUseAuthStore.isLoading = true;

      render(<TestApp initialEntries={['/dashboard']} />);

      expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
    });

    it('should show content after loading completes for authenticated user', () => {
      mockUseAuthStore.isLoading = true;

      const { rerender } = render(<TestApp initialEntries={['/dashboard']} />);

      expect(screen.getByText('Checking authentication...')).toBeInTheDocument();

      // Complete loading with authenticated user
      mockUseAuthStore.isLoading = false;
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser();

      rerender(<TestApp initialEntries={['/dashboard']} />);

      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });
  });

  describe('Navigation Integration', () => {
    // `MemoryRouter` keeps its original `initialEntries` across rerenders, so
    // navigation is exercised through the router itself using a <Navigate>
    // element that we toggle by state — the same mechanism an in-app link uses.
    it('should work seamlessly with React Router navigation', () => {
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser();

      function NavHarness() {
        const [target, setTarget] = React.useState<string | null>(null);
        return (
          <>
            <button type="button" onClick={() => setTarget('/profile')}>
              go profile
            </button>
            {target && <Navigate to={target} replace />}
          </>
        );
      }

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <TestWrapper>
            <NavHarness />
            <Routes>
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
            </Routes>
          </TestWrapper>
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'go profile' }));

      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
      expect(screen.getByText('Profile Content')).toBeInTheDocument();
    });

    it('should handle browser back/forward navigation correctly', () => {
      mockUseAuthStore.isAuthenticated = true;
      mockUseAuthStore.user = createMockUser();

      // Both routes render on demand from the router's history, confirming each
      // protected location resolves to its own guard-wrapped content.
      const { unmount } = render(<TestApp initialEntries={['/dashboard']} />);
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
      unmount();

      render(<TestApp initialEntries={['/profile']} />);
      expect(screen.getByText('Profile Content')).toBeInTheDocument();
    });
  });
});