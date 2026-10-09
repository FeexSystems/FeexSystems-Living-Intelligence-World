/**
 * Performance Monitor
 * Task 34: Phase 3, Sprint 9
 *
 * Real User Monitoring (RUM) using web-vitals library.
 * Captures Core Web Vitals metrics and sends them to analytics endpoint.
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

/**
 * Metric type definition
 */
export interface Metric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: PerformanceEntry[];
  navigationType: string;
}

/**
 * Analytics payload
 */
export interface AnalyticsPayload {
  url: string;
  userAgent: string;
  timestamp: number;
  metrics: {
    lcp?: Metric;
    inp?: Metric;
    cls?: Metric;
    fcp?: Metric;
    ttfb?: Metric;
  };
}

/**
 * Send metrics to analytics endpoint
 */
async function sendToAnalytics(metric: Metric) {
  // In production, send to your analytics endpoint
  const payload: AnalyticsPayload = {
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    metrics: {
      [metric.name.toLowerCase()]: metric,
    },
  };

  if (import.meta.env.PROD) {
    try {
      // Send to analytics endpoint
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true, // Ensure request completes even if page unloads
      });
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
    }
  } else {
    // In development, log to console
    console.log('[Performance Monitor]', metric);
  }
}

/**
 * Log metric to console for debugging
 */
function logMetric(metric: Metric) {
  const ratingColors = {
    good: '\x1b[32m', // green
    'needs-improvement': '\x1b[33m', // yellow
    poor: '\x1b[31m', // red
  };

  const color = ratingColors[metric.rating];
  const reset = '\x1b[0m';

  console.log(
    `${color}[${metric.name}]${reset} ${metric.value.toFixed(2)}ms (${metric.rating})`
  );
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
  // Largest Contentful Paint (LCP)
  onLCP((metric) => {
    logMetric(metric);
    sendToAnalytics(metric);
  });

  // Interaction to Next Paint (INP)
  onINP((metric) => {
    logMetric(metric);
    sendToAnalytics(metric);
  });

  // Cumulative Layout Shift (CLS)
  onCLS((metric) => {
    logMetric(metric);
    sendToAnalytics(metric);
  });

  // First Contentful Paint (FCP)
  onFCP((metric) => {
    logMetric(metric);
    sendToAnalytics(metric);
  });

  // First Input Delay (FID) was retired and removed from web-vitals v4+.
  // It is replaced by Interaction to Next Paint (INP), captured above.

  // Time to First Byte (TTFB)
  onTTFB((metric) => {
    logMetric(metric);
    sendToAnalytics(metric);
  });
}

/**
 * Get all metrics at once (for debugging)
 */
export function getMetrics(): Promise<Record<string, Metric>> {
  return new Promise((resolve) => {
    const metrics: Record<string, Metric> = {};
    const expected = 5; // lcp, inp, cls, fcp, ttfb (FID retired in web-vitals v4+)

    onLCP((metric) => {
      metrics.lcp = metric;
      if (Object.keys(metrics).length === expected) resolve(metrics);
    });

    onINP((metric) => {
      metrics.inp = metric;
      if (Object.keys(metrics).length === expected) resolve(metrics);
    });

    onCLS((metric) => {
      metrics.cls = metric;
      if (Object.keys(metrics).length === expected) resolve(metrics);
    });

    onFCP((metric) => {
      metrics.fcp = metric;
      if (Object.keys(metrics).length === expected) resolve(metrics);
    });

    onTTFB((metric) => {
      metrics.ttfb = metric;
      if (Object.keys(metrics).length === expected) resolve(metrics);
    });
  });
}

/**
 * Export metrics for manual inspection
 */
export { onCLS, onFCP, onINP, onLCP, onTTFB };
