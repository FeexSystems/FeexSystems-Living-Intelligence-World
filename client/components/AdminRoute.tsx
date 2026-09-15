import { useFirebaseAuth } from "@/lib/firebase-auth";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";

export function AdminRoute() {
  const { user, isAuthenticated, isLoading } = useFirebaseAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <LoadingSpinner />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show access denied if not admin
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Access denied. Administrator privileges are required to view this page.
            </AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button
              onClick={() => window.location.href = '/dashboard'}
              variant="default"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}