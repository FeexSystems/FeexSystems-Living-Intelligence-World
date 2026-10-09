import 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, WifiOff, ServerCrash } from 'lucide-react';

interface ErrorPageProps {
  type: '500' | 'offline' | 'feature-unavailable';
  title?: string;
  description?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
}

/**
 * User-facing error page component for different error states
 */
export function ErrorPage({ type, title, description, onRetry, onGoHome }: ErrorPageProps) {
  const defaults = {
    '500': {
      icon: ServerCrash,
      title: 'Server Error',
      description: 'Something went wrong on our end. Our team has been notified and is working to fix it.',
    },
    'offline': {
      icon: WifiOff,
      title: 'You\'re Offline',
      description: 'Please check your internet connection and try again.',
    },
    'feature-unavailable': {
      icon: AlertTriangle,
      title: 'Feature Unavailable',
      description: 'This feature is currently unavailable. Please try again later.',
    },
  };

  const config = defaults[type];
  const Icon = config.icon;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Icon className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{title || config.title}</CardTitle>
          <CardDescription>
            {description || config.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <Button onClick={handleRetry} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>

            <Button onClick={handleGoHome} variant="outline" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
