import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ArrowLeft, Home } from 'lucide-react';
import { globalErrorHandler } from '@/lib/error-handler';
import { AmbientLivingBackground } from '@/landing/cinematic';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Log 404 error for monitoring
    globalErrorHandler.captureMessage(
      `404 Error: User attempted to access non-existent route: ${location.pathname}`,
      'javascript',
      {
        pathname: location.pathname,
        search: location.search,
        referrer: document.referrer,
      }
    );
  }, [location.pathname, location.search]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 relative overflow-hidden font-mono">
      <AmbientLivingBackground fixed={true} opacity={38} linesOpacity={18} />
      <Card className="w-full max-w-md text-center relative z-10 border-white/15 bg-black/85 backdrop-blur-xl shadow-2xl">
        <CardHeader>
          <div className="mx-auto mb-4">
            <Search className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-4xl font-bold mb-2">404</CardTitle>
          <CardTitle>Page Not Found</CardTitle>
          <CardDescription>
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button onClick={handleGoBack} className="w-full flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            <Button onClick={handleGoHome} variant="outline" className="w-full flex items-center gap-2">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            <p>Check the URL for typos or use the navigation menu to find what you're looking for.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
