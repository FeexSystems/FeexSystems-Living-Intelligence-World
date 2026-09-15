import * as Sentry from '@sentry/node';

// Alert thresholds configuration
const ALERT_THRESHOLDS = {
  ERROR_RATE: 0.1, // 10% error rate threshold
  RESPONSE_TIME: 1000, // 1 second response time threshold
  ERROR_SEVERITY: {
    CRITICAL: ['DatabaseError', 'SecurityError', 'PaymentError'],
    HIGH: ['ValidationError', 'AuthenticationError'],
    MEDIUM: ['NetworkError', 'CacheError'],
  },
};

// Custom alert conditions
export const configureAlerts = () => {
  // Monitor error rates
  Sentry.addEventProcessor((event) => {
    if ((event as any).type === 'error' || !event.type) {
      const errorType = event.exception?.values?.[0]?.type;
      
      // Check for critical errors
      if (errorType && ALERT_THRESHOLDS.ERROR_SEVERITY.CRITICAL.includes(errorType)) {
        notifyTeam('critical', event);
      }
      
      // Check for high-priority errors
      if (errorType && ALERT_THRESHOLDS.ERROR_SEVERITY.HIGH.includes(errorType)) {
        notifyTeam('high', event);
      }
    }
    return event;
  });
};

// Custom error grouping
export const configureErrorGrouping = () => {
  Sentry.init({
    ...Sentry.init,
    beforeSend(event) {
      // Group similar validation errors
      if (event.exception?.values?.[0]?.type === 'ValidationError') {
        const message = event.exception.values[0].value;
        if (message) {
          event.fingerprint = ['validation-error', message];
        }
      }

      // Group API errors by endpoint
      if (event.exception?.values?.[0]?.type === 'APIError') {
        const url = event.request?.url;
        if (url) {
          event.fingerprint = ['api-error', new URL(url).pathname];
        }
      }

      return event;
    },
  });
};

// Notification system (implement based on your notification service)
const notifyTeam = async (priority: 'critical' | 'high' | 'medium', event: Sentry.Event) => {
  // Implement your notification logic here
  // This could be Slack, email, SMS, etc.
  console.log(`[${priority.toUpperCase()}] Error Alert:`, {
    type: event.exception?.values?.[0]?.type,
    message: event.exception?.values?.[0]?.value,
    url: event.request?.url,
    timestamp: event.timestamp,
  });
};

// Performance monitoring thresholds
export const configurePerformanceAlerts = () => {
  Sentry.addEventProcessor((event) => {
    if (event.type === 'transaction' && event.timestamp && event.start_timestamp) {
      const duration = event.timestamp - event.start_timestamp;
      
      if (duration > ALERT_THRESHOLDS.RESPONSE_TIME) {
        notifyTeam('medium', {
          ...event,
          message: `Slow transaction detected: ${duration}ms`,
        } as any);
      }
    }
    return event;
  });
};
