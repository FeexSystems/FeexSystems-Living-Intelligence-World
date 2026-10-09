import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Monitor } from 'lucide-react';
import { globalErrorHandler } from '@/lib/error-handler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

/**
 * WebGL/Canvas-specific error boundary for 3D routes (/world, landing)
 * Handles WebGL context loss, shader compilation errors, and canvas rendering failures
 */
class WebGLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `webgl-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
      });
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('WebGLErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    try {
      globalErrorHandler.captureException(error, {
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        context: 'webgl-canvas',
      });
    } catch {
      // Ignore in tests or offline
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    const isDev = typeof process !== 'undefined' && process?.env?.NODE_ENV
      ? process.env.NODE_ENV === 'development'
      : Boolean(import.meta.env?.DEV);

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <Monitor className="h-16 w-16 text-destructive" />
              </div>
              <CardTitle className="text-2xl">3D Rendering Error</CardTitle>
              <CardDescription>
                The 3D scene failed to load. This may be due to WebGL compatibility issues or a temporary rendering problem.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {this.state.errorId && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm font-medium mb-1">Error ID:</p>
                  <code className="text-xs text-muted-foreground font-mono">
                    {this.state.errorId}
                  </code>
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-md border border-blue-200 dark:border-blue-900">
                <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">
                  <strong>Troubleshooting:</strong>
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 list-disc list-inside space-y-1">
                  <li>Try refreshing the page</li>
                  <li>Check if your browser supports WebGL 2.0</li>
                  <li>Disable hardware acceleration in browser settings</li>
                  <li>Update your graphics drivers</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>

                <Button onClick={this.handleReload} variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>

                <Button onClick={this.handleGoHome} variant="outline" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </div>

              {this.state.error && isDev && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium mb-2 flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Diagnostic Details ({this.state.error.name || 'Error'})
                  </summary>

                  <div className="bg-muted p-4 rounded-md space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">Error Message:</p>
                      <code className="text-xs text-destructive font-mono block bg-background p-2 rounded">
                        {this.state.error.message}
                      </code>
                    </div>

                    {this.state.error.stack && (
                      <div>
                        <p className="text-sm font-medium mb-1">Stack Trace:</p>
                        <pre className="text-xs text-muted-foreground font-mono bg-background p-2 rounded overflow-auto max-h-40">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}

                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <p className="text-sm font-medium mb-1">Component Stack:</p>
                        <pre className="text-xs text-muted-foreground font-mono bg-background p-2 rounded overflow-auto max-h-40">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="text-center text-sm text-muted-foreground">
                <p>
                  If this problem persists, please contact support with the error ID above.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WebGLErrorBoundary;
