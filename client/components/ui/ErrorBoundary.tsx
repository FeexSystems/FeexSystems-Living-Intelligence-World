import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  /** Optionally override the fallback UI entirely */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary — catches unhandled errors in the React component tree.
 * Provides a premium fallback UI with reset + navigation options.
 * Reports errors to the console (and optionally to a monitoring endpoint).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Structured error report — in production, POST to /api/errors
    console.error('[ErrorBoundary]', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Non-blocking: attempt to report to server error endpoint
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Swallow — we cannot let error reporting cause more errors
      });
    }
  }

  handleReset = () => {
    this.setState({ error: null, errorInfo: null });
  };

  render() {
    const { error, errorInfo } = this.state;

    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.handleReset);
      }

      const isDev = process.env.NODE_ENV !== 'production';

      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
          <div className="max-w-xl w-full">
            {/* Card */}
            <div className="bg-gray-900/80 border border-red-500/30 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
              {/* Icon */}
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 mb-6 mx-auto">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>

              {/* Title */}
              <h1 className="text-xl font-semibold text-white text-center mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-400 text-sm text-center mb-6">
                An unexpected error occurred. The team has been notified.
              </p>

              {/* Dev-mode stack trace */}
              {isDev && (
                <details className="mb-6 text-xs">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-300 transition-colors mb-2">
                    Show error details
                  </summary>
                  <pre className="bg-gray-950 text-red-400 rounded-lg p-3 overflow-auto max-h-48 text-[11px] leading-relaxed whitespace-pre-wrap">
                    {error.message}
                    {'\n\n'}
                    {error.stack}
                    {errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </button>
                <a
                  href="/"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go home
                </a>
                {isDev && (
                  <button
                    onClick={() => navigator.clipboard?.writeText(`${error.message}\n${error.stack}`)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm font-medium transition-colors"
                    title="Copy error to clipboard"
                  >
                    <Bug className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Subtle brand mark */}
            <p className="text-center text-gray-600 text-xs mt-6">
              FeexSystems Living Intelligence Platform
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Route-level error boundary — lighter weight, designed to wrap individual
 * dashboard sections rather than the full app. Shows an inline error card.
 */
export function SectionErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-300 mb-1">Failed to load this section</p>
            <p className="text-xs text-gray-500 truncate">
              {process.env.NODE_ENV !== 'production' ? error.message : 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={reset}
            className="flex-shrink-0 text-xs text-gray-400 hover:text-white transition-colors underline"
          >
            Retry
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
