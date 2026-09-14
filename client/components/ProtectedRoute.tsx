import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useFirebaseAuth } from '@/lib/firebase-auth';
import { Shield } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requiredRole,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useFirebaseAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredRole && user) {
    const roleHierarchy = { USER: 0, ADMIN: 1, SUPER_ADMIN: 2 };
    const userRoleLevel = roleHierarchy[user.role];
    const requiredRoleLevel = roleHierarchy[requiredRole];

    if (userRoleLevel < requiredRoleLevel) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-4">
              <Shield className="h-16 w-16 text-destructive mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this page. This area requires {requiredRole.toLowerCase()} privileges.
            </p>
            <p className="text-sm text-muted-foreground">
              Your current role: {user.role.toLowerCase()}
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute requiredRole="ADMIN">{children}</ProtectedRoute>;
}

export function SuperAdminRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute requiredRole="SUPER_ADMIN">{children}</ProtectedRoute>;
}

export function PublicRoute({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function GuestOnlyRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute requireAuth={false}>{children}</ProtectedRoute>;
}