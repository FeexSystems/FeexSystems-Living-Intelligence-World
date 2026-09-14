 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// Global error handling utilities













class GlobalErrorHandler {constructor() { GlobalErrorHandler.prototype.__init.call(this);GlobalErrorHandler.prototype.__init2.call(this);GlobalErrorHandler.prototype.__init3.call(this);GlobalErrorHandler.prototype.__init4.call(this);GlobalErrorHandler.prototype.__init5.call(this); }
  
   __init() {this.errorQueue = []}
   __init2() {this.isInitialized = false}

  static getInstance() {
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

   __init3() {this.handleUnhandledRejection = (event) => {
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
  }}

   __init4() {this.handleJavaScriptError = (event) => {
    console.error('JavaScript error:', event.error);

    this.reportError({
      message: event.message || 'JavaScript error',
      stack: _optionalChain([event, 'access', _3 => _3.error, 'optionalAccess', _4 => _4.stack]),
      type: 'javascript',
      additionalContext: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  }}

   __init5() {this.handleResourceError = (event) => {
    const target = event.target ;
    
    // Only handle resource loading errors (img, script, link, etc.)
    if (target && (target ) !== window && 'src' in target) {
      console.error('Resource loading error:', target);

      this.reportError({
        message: `Failed to load resource: ${(target ).src || (target ).href}`,
        type: 'network',
        additionalContext: {
          tagName: target.tagName,
          src: (target ).src,
          href: (target ).href,
        },
      });
    }
  }}

  reportError(errorData) {
    const errorReport = {
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

    // Log in development
    const isDev = typeof process !== 'undefined' && _optionalChain([process, 'optionalAccess', _5 => _5.env, 'optionalAccess', _6 => _6.NODE_ENV]) 
      ? process.env.NODE_ENV === 'development' 
      : Boolean(_optionalChain([import.meta, 'access', _7 => _7.env, 'optionalAccess', _8 => _8.DEV]));

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

   getCurrentUserId() {
    // Try to get user ID from auth store or localStorage
    try {
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        const parsed = JSON.parse(authData);
        return _optionalChain([parsed, 'access', _9 => _9.user, 'optionalAccess', _10 => _10.id]);
      }
    } catch (error) {
      // Ignore errors when getting user ID
    }
    return undefined;
  }

   async sendErrorReport(errorReport) {
    try {
      // In production, send to error reporting service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(errorReport),
      // });

      // For now, just simulate the API call
      if (Boolean(_optionalChain([import.meta, 'access', _11 => _11.env, 'optionalAccess', _12 => _12.DEV]))) {
        console.log('📤 Error report would be sent to service:', errorReport.errorId);
      }
    } catch (error) {
      console.error('Failed to send error report:', error);
      // Store in localStorage as fallback
      this.storeErrorLocally(errorReport);
    }
  }

   storeErrorLocally(errorReport) {
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
  captureException(error, context) {
    this.reportError({
      message: error.message,
      stack: error.stack,
      type: 'javascript',
      additionalContext: context,
    });
  }

  // Method to report custom messages
  captureMessage(message, type = 'javascript', context) {
    this.reportError({
      message,
      type,
      additionalContext: context,
    });
  }

  // Get error queue for debugging
  getErrorQueue() {
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
export const captureException = (error, context) => {
  globalErrorHandler.captureException(error, context);
};

export const captureMessage = (message, type = 'javascript', context) => {
  globalErrorHandler.captureMessage(message, type, context);
};

// Initialize on import
if (typeof window !== 'undefined') {
  globalErrorHandler.initialize();
}