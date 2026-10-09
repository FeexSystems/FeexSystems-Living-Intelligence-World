/**
 * Sentry Integration for Error Monitoring
 * 
 * This file provides integration with Sentry for production error tracking.
 * To enable Sentry, install @sentry/react and configure with your DSN.
 * 
 * Installation:
 * npm install @sentry/react
 * 
 * Environment variables needed:
 * VITE_SENTRY_DSN=your-sentry-dsn
 * VITE_ENVIRONMENT=production|staging|development
 */

// Uncommit when Sentry is installed
// import * as Sentry from '@sentry/react';

interface ErrorContext {
    user?: {
        id: string;
        email?: string;
    };
    tags?: Record<string, string>;
    extra?: Record<string, any>;
}

class ErrorMonitor {
    private isInitialized = false;

    /**
     * Initialize error monitoring service
     */
    initialize() {
        if (this.isInitialized) {
            return;
        }

        const dsn = import.meta.env.VITE_SENTRY_DSN;
        const environment = import.meta.env.VITE_ENVIRONMENT || 'development';

        if (!dsn || environment === 'development') {
            console.log('📊 Error monitoring disabled (dev mode or no DSN)');
            return;
        }

        try {
            // Uncomment when Sentry is installed
            /*
            Sentry.init({
              dsn,
              environment,
              integrations: [
                new Sentry.BrowserTracing(),
                new Sentry.Replay({
                  maskAllText: true,
                  blockAllMedia: true,
                }),
              ],
              tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
              replaysSessionSampleRate: 0.1,
              replaysOnErrorSampleRate: 1.0,
              beforeSend(event, hint) {
                // Filter out noise and sensitive data
                if (event.exception) {
                  const error = hint.originalException;
                  // Don't send network errors or expected errors
                  if (error && typeof error === 'object' && 'status' in error) {
                    const status = (error as any).status;
                    if (status === 401 || status === 403 || status === 404) {
                      return null; // Don't report expected auth/not-found errors
                    }
                  }
                }
                return event;
              },
            });
            */

            this.isInitialized = true;
            console.log('📊 Error monitoring initialized');
        } catch (error) {
            console.error('Failed to initialize error monitoring:', error);
        }
    }

    /**
     * Report an error with context
     */
    reportError(error: Error, context?: ErrorContext) {
        if (!this.isInitialized) {
            console.error('Error (not reported):', error, context);
            return;
        }

        try {
            // Uncomment when Sentry is installed
            /*
            if (context?.user) {
              Sentry.setUser(context.user);
            }
      
            if (context?.tags) {
              Object.entries(context.tags).forEach(([key, value]) => {
                Sentry.setTag(key, value);
              });
            }
      
            if (context?.extra) {
              Sentry.setContext('additional', context.extra);
            }
      
            Sentry.captureException(error);
            */

            console.error('Error reported:', error, context);
        } catch (reportError) {
            console.error('Failed to report error:', reportError);
        }
    }

    /**
     * Report a message (non-error event)
     */
    reportMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
        if (!this.isInitialized) {
            console.log(`${level.toUpperCase()}: ${message}`);
            return;
        }

        try {
            // Uncomment when Sentry is installed
            /*
            Sentry.captureMessage(message, level);
            */
            console.log(`${level.toUpperCase()}: ${message}`);
        } catch (error) {
            console.error('Failed to report message:', error);
        }
    }

    /**
     * Set user context for all future error reports
     */
    setUser(user: { id: string; email?: string; username?: string } | null) {
        if (!this.isInitialized) {
            return;
        }

        try {
            // Uncomment when Sentry is installed
            /*
            Sentry.setUser(user);
            */
            console.log('User context set:', user?.id);
        } catch (error) {
            console.error('Failed to set user context:', error);
        }
    }

    /**
     * Add breadcrumb for debugging
     */
    addBreadcrumb(_message: string, _category: string, _data?: Record<string, any>) {
        if (!this.isInitialized) {
            return;
        }

        try {
            // Uncomment when Sentry is installed
            /*
            Sentry.addBreadcrumb({
              message,
              category,
              data,
              level: 'info',
            });
            */
        } catch (error) {
            console.error('Failed to add breadcrumb:', error);
        }
    }
}

// Export singleton instance
export const errorMonitor = new ErrorMonitor();

// Initialize on module load
errorMonitor.initialize();
