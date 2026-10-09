// Global error handling utilities

export interface ErrorReport {
  message: string;
  stack?: string;
  type: 'javascript' | 'promise' | 'network' | 'auth' | 'validation';
  errorId: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
  additionalContext?: Record<string, any>;
}

class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorQueue: ErrorReport[] = [];
  private isInitialized = false;

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  initialize() {
    if (this.isInitialized) {
      return;
    }

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);

    // Handle JavaScript errors
    window.addEventListener('error', this.handleJavaScriptError);

    // Handle resource loading errors
    window.addEventListener('error', this.handleResourceError, true);

    this.isInitialized = true;
    console.log('🛡️ Global error handler initialized');
  }

  destroy() {
    if (!this.isInitialized) {
      return;
    }

    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.removeEventListener('error', this.handleJavaScriptError);
    window.removeEventListener('error', this.handleResourceError, true);

    this.isInitialized = false;
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('Unhandled promise rejection:', event.reason);

    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    
    this.reportError({
      message: error.message || 'Unhandled promise rejection',
      stack: error.stack,
      type: 'promise',
      additionalContext: {
        reason: event.reason,
        promise: event.promise,
      },
    });

    // Prevent the default browser behavior (logging to console)
    event.preventDefault();
  };

  private handleJavaScriptError = (event: ErrorEvent) => {
    // Resource loading errors (img/script/link) are dispatched as plain
    // 'error' events with no message and no Error object. Without this guard
    // both this listener and handleResourceError() reported the same failure,
    // duplicating every resource error in the queue.
    if (!event.message && !event.error) {
      return;
    }

    console.error('JavaScript error:', event.error);

    this.reportError({
      message: event.message || 'JavaScript error',
      stack: event.error?.stack,
      type: 'javascript',
      additionalContext: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  };

  private handleResourceError = (event: Event) => {
    const target = event.target as HTMLElement;
    
    // Only handle resource loading errors (img, script, link, etc.)
    if (target && (target as any) !== window && 'src' in target) {
      console.error('Resource loading error:', target);

      this.reportError({
        message: `Failed to load resource: ${(target as any).src || (target as any).href}`,
        type: 'network',
        additionalContext: {
          tagName: target.tagName,
          src: (target as any).src,
          href: (target as any).href,
        },
      });
    }
  };

  reportError(errorData: Partial<ErrorReport>) {
    const errorReport: ErrorReport = {
      message: errorData.message || 'Unknown error',
      stack: errorData.stack,
      type: errorData.type || 'javascript',
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId(),
      additionalContext: errorData.additionalContext,
    };

    // Add to queue for batch processing
    this.errorQueue.push(errorReport);

    // Show toast for unexpected errors (excluding resource loading)
    if (errorReport.type !== 'network' && typeof window !== 'undefined') {
      import('sonner').then(({ toast }) => {
        toast.error('An unexpected error occurred', {
          description: 'Our team has been notified. Please try refreshing the page if the issue persists.',
          duration: 5000,
        });
      }).catch(() => { /* ignore */ });
    }

    // Log in development
    const isDev = typeof process !== 'undefined' && process?.env?.NODE_ENV 
      ? process.env.NODE_ENV === 'development' 
      : Boolean(import.meta.env?.DEV);

    if (isDev) {
      console.group('🚨 Global Error Report');
      console.error('Error ID:', errorReport.errorId);
      console.error('Type:', errorReport.type);
      console.error('Message:', errorReport.message);
      if (errorReport.stack) {
        console.error('Stack:', errorReport.stack);
      }
      if (errorReport.additionalContext) {
        console.error('Context:', errorReport.additionalContext);
      }
      console.groupEnd();
    }

    // Send to error reporting service
    this.sendErrorReport(errorReport);
  }

  private getCurrentUserId(): string | undefined {
    // Try to get user ID from auth store or localStorage
    try {
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.user?.id;
      }
    } catch (error) {
      // Ignore errors when getting user ID
    }
    return undefined;
  }

  private async sendErrorReport(errorReport: ErrorReport) {
    try {
      if (!import.meta.env?.DEV) {
        await fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorReport),
          // Non-blocking: use keepalive so the request survives page unloads
          keepalive: true,
        });
      }
    } catch {
      // Swallow — fallback to local storage
      this.storeErrorLocally(errorReport);
    }
  }

  private storeErrorLocally(errorReport: ErrorReport) {
    try {
      const storedErrors = localStorage.getItem('pending-error-reports');
      const errors = storedErrors ? JSON.parse(storedErrors) : [];
      errors.push(errorReport);
      
      // Keep only the last 10 errors to avoid filling up localStorage
      if (errors.length > 10) {
        errors.splice(0, errors.length - 10);
      }
      
      localStorage.setItem('pending-error-reports', JSON.stringify(errors));
    } catch (error) {
      console.error('Failed to store error locally:', error);
    }
  }

  // Method to manually report errors from application code
  captureException(error: Error, context?: Record<string, any>) {
    this.reportError({
      message: error.message,
      stack: error.stack,
      type: 'javascript',
      additionalContext: context,
    });
  }

  // Method to report custom messages
  captureMessage(message: string, type: ErrorReport['type'] = 'javascript', context?: Record<string, any>) {
    this.reportError({
      message,
      type,
      additionalContext: context,
    });
  }

  // Get error queue for debugging
  getErrorQueue(): ErrorReport[] {
    return [...this.errorQueue];
  }

  // Clear error queue
  clearErrorQueue() {
    this.errorQueue = [];
  }
}

// Export singleton instance
export const globalErrorHandler = GlobalErrorHandler.getInstance();

// Convenience functions
export const captureException = (error: Error, context?: Record<string, any>) => {
  globalErrorHandler.captureException(error, context);
};

export const captureMessage = (message: string, type: ErrorReport['type'] = 'javascript', context?: Record<string, any>) => {
  globalErrorHandler.captureMessage(message, type, context);
};

// Initialize on import
if (typeof window !== 'undefined') {
  globalErrorHandler.initialize();
}