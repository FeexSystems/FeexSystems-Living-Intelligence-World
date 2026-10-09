import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProtectedRoute, PublicRoute, AdminRoute, SuperAdminRoute } from '@/components/ProtectedRoute';
import { TestWrapper } from '../utils/test-utils';
import { createMockUser } from '../utils/mock-factories';

// Mock the Firebase auth hook.
//
// `ProtectedRoute` reads `useFirebaseAuth()` from `@/lib/firebase-auth`; the
// JWT-era `useAuthStore` mock that used to live here was inert after the
// Firebase migration, so every render threw
// "useFirebaseAuth must be used within FirebaseAuthProvider".
const mockAuth = {
  user: null as ReturnType<typeof createMockUser> | null,
  firebaseUser: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  forgotPassword: vi.fn(),
  resendVerificationEmail: vi.fn(),
  getIdToken: vi.fn(),
  clearError: vi.fn(),
};

vi.mock('@/lib/firebase-auth', () => ({
  useFirebaseAuth: () => mockAuth,
  AuthUser: {},
  FirebaseAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock react-router-dom Navigate component
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to, state }: { to: string; state?: any }) => {
      mockNavigate(to, state);
      return <div data-testid="navigate-mock">Navigating to {to}</div>;
    },
    useLocation: () => ({ pathname: '/protected-page', search: '', hash: '', state: null }),
  };
});

const TestProtectedRouteWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <TestWrapper>
      {children}
    </TestWrapper>
  </BrowserRouter>
);

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = false;
    mockAuth.user = null;
    mockAuth.isLoading = false;
  });

  describe('Loading State', () => {
    it('should show loading spinner when authentication is being checked', () => {
      mockAuth.isLoading = true;

      render(
        <TestProtectedRouteWrapper>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestProtectedRouteWrapper>
      );

      expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Authentication Required (Default Behavior)', () => {
    it('should redirect to login when user is not authenticated', () => {
      mockAuth.isAuthenticated = false;

      render(
        <TestProtectedRouteWrapper>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestProtectedRouteWrapper>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        from: { pathname: '/protected-page', search: '', hash: '', state: null }
      });
    });

    it('should render children when user is authenticated', () => {
      mockAuth.isAuthenticated = true;
      mockAuth.user = createMockUser();

      render(
        <TestProtectedRouteWrapper>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestProtectedRouteWrapper>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should redirect to custom path when specified', () => {
      mockAuth.isAuthenticated = false;

      render(
        <TestProtectedRouteWrapper>
          <ProtectedRoute redirectTo="/custom-login">
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestProtectedRouteWrapper>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/custom-login', {
        from: { pathname: '/protected-page', search: '', hash: '', state: null }
      });
    });
  });

  describe('Public Routes', () => {
    it('should render children when user is not authenticated', () => {
      mockAuth.isAuthenticated = false;

      render(
        <TestProtectedRouteWrapper>
          <ProtectedRoute requireAuth={false}>
            <div>Public Content</div>
          </ProtectedRoute>
        </TestProtectedRouteWrapper>
      );

      expect(screen.getByText('Public Content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should redirect to dashboard when user is authenticated', () => {
      mockAuth.isAuthenticated = true;
      mockAuth.user = createMockUser();

      render(
        <TestProtectedRouteWrapper>
          <ProtectedRoute requireAuth={false}>
            <div>Public Content</div>
          </ProtectedRoute>
        </TestProtectedRouteWrapper>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', undefined);
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow access when user has required role', () => {
      mockAuth.isAuthenticated = true;
      mockAuth.user = createMockUser({ role: 'ADMIN' });

      render(
        <TestProtectedRouteWrapper>
          <ProtectedRoute requiredRole="ADMIN">
            <div>Admin Content</div>
          </ProtectedRoute>
        </TestProtectedRouteWrapper>
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should allow access when user has higher role than required', () => {
      mockAuth.isAuthenticated = true;
      mockAuth.user = createMockUser({ role: 'SUPER_ADMIN' });

      render(
        <TestProtectedRouteWrapper>
          <ProtectedRoute requiredRole="ADMIN">
            <div>Admin Content</div>
          </ProtectedRoute>
        </TestProtectedRouteWrapper>
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should deny access when user has insufficient role', () => {
      mockAuth.isAuthenticated = true;
      mockAuth.user = createMockUser({ role: 'USER' });

      render(
        <TestProtectedRouteWrapper>
          <ProtectedRoute requiredRole="ADMIN">
            <div>Admin Content</div>
          </ProtectedRoute>
        </TestProtectedRouteWrapper>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('You don\'t have permission to access this page. This area requires admin privileges.')).toBeInTheDocument();
      expect(screen.getByText('Your current role: user')).toBeInTheDocument();
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('should show role hierarchy correctly', () => {
      mockAuth.isAuthenticated = true;
      mockAuth.user = createMockUser({ role: 'ADMIN' });

      render(
        <TestProtectedRouteWrapper>
          <ProtectedRoute requiredRole="USER">
            <div>User Content</div>
          </ProtectedRoute>
        </TestProtectedRouteWrapper>
      );

      expect(screen.getByText('User Content')).toBeInTheDocument();
    });
  });

  describe('Convenience Wrapper Components', () => {
    it('should work with PublicRoute wrapper', () => {
      mockAuth.isAuthenticated = false;

      render(
        <TestProtectedRouteWrapper>
          <PublicRoute>
            <div>Public Content</div>
          </PublicRoute>
        </TestProtectedRouteWrapper>
      );

      expect(screen.getByText('Public Content')).toBeInTheDocument();
    });

    it('should work with AdminRoute wrapper', () => {
      mockAuth.isAuthenticated = true;
      mockAuth.user = createMockUser({ role: 'ADMIN' });

      render(
        <TestProtectedRouteWrapper>
          <AdminRoute>
            <div>Admin Content</div>
          </AdminRoute>
        </TestProtectedRouteWrapper>
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('should work with SuperAdminRoute wrapper', () => {
      mockAuth.isAuthenticated = true;
      mockAuth.user = createMockUser({ role: 'SUPER_ADMIN' });

      render(
        <TestProtectedRouteWrapper>
          <SuperAdminRoute>
            <div>Super Admin Content</div>
          </SuperAdminRoute>
        </TestProtectedRouteWrapper>
      );

      expect(screen.getByText('Super Admin Content')).toBeInTheDocument();
    });

    it('should deny access with AdminRoute when user is regular user', () => {
      mockAuth.isAuthenticated = true;
      mockAuth.user = createMockUser({ role: 'USER' });

      render(
        <TestProtectedRouteWrapper>
          <AdminRoute>
            <div>Admin Content</div>
          </AdminRoute>
        </TestProtectedRouteWrapper>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing user when role is required', () => {
      mockAuth.isAuthenticated = true;
      mockAuth.user = null;

      render(
        <TestProtectedRouteWrapper>
          <ProtectedRoute requiredRole="ADMIN">
            <div>Admin Content</div>
          </ProtectedRoute>
        </TestProtectedRouteWrapper>
      );

      // Should render content since role check is skipped when user is null
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('should handle unauthenticated user with role requirement', () => {
      mockAuth.isAuthenticated = false;
      mockAuth.user = null;

      render(
        <TestProtectedRouteWrapper>
          <ProtectedRoute requiredRole="ADMIN">
            <div>Admin Content</div>
          </ProtectedRoute>
        </TestProtectedRouteWrapper>
      );

      // Should redirect to login since authentication is required first
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        from: { pathname: '/protected-page', search: '', hash: '', state: null }
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility attributes for access denied state', () => {
      mockAuth.isAuthenticated = true;
      mockAuth.user = createMockUser({ role: 'USER' });

      render(
        <TestProtectedRouteWrapper>
          <ProtectedRoute requiredRole="ADMIN">
            <div>Admin Content</div>
          </ProtectedRoute>
        </TestProtectedRouteWrapper>
      );

      const accessDeniedHeading = screen.getByRole('heading', { name: 'Access Denied' });
      expect(accessDeniedHeading).toBeInTheDocument();
    });

    it('should have descriptive loading message', () => {
      mockAuth.isLoading = true;

      render(
        <TestProtectedRouteWrapper>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestProtectedRouteWrapper>
      );

      expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
    });
  });
});