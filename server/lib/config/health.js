/**
 * Environment Configuration Health Checks
 *
 * Provides functions to validate environment configuration
 * and check for common misconfigurations.
 */

import { env } from './config';
import { logger } from '../logging';

/**
 * Environment Health Status
 */























/**
 * Check environment configuration health
 * Returns comprehensive health report
 */
export function checkEnvironmentHealth() {
  const warnings = [];
  const critical = [];
  let status = 'healthy';

  // Core checks
  if (!env.DATABASE_URL) {
    critical.push('DATABASE_URL is not set');
  }
  if (!env.REDIS_URL) {
    critical.push('REDIS_URL is not set');
  }
  if (!env.JWT_SECRET) {
    critical.push('JWT_SECRET is not set');
  }
  if (!env.JWT_REFRESH_SECRET) {
    critical.push('JWT_REFRESH_SECRET is not set');
  }
  if (!env.NODE_ENV) {
    critical.push('NODE_ENV is not set');
  }

  // Production-specific checks
  if (env.NODE_ENV === 'production') {
    if (!env.SENTRY_DSN) {
      critical.push('SENTRY_DSN is required in production');
    }
    if (!env.ENCRYPTION_KEY) {
      critical.push('ENCRYPTION_KEY is required in production');
    }
    if (env.USE_MOCK_AUTH === 'true') {
      critical.push('USE_MOCK_AUTH must not be enabled in production');
    }
  }

  // Warning-level checks
  if (!env.GITHUB_TOKEN) {
    warnings.push('GITHUB_TOKEN not set - World Model GitHub sync may be limited');
  }
  if (!env.AI_SERVICE_API_KEY) {
    warnings.push('AI_SERVICE_API_KEY not set - AI features may be limited');
  }
  if (!env.SMTP_HOST) {
    warnings.push('SMTP_HOST not set - Email functionality disabled');
  }
  if (env.CORS_ORIGIN) {
    const origins = env.CORS_ORIGIN.split(',').map(s => s.trim());
    if (origins.length === 0) {
      warnings.push('CORS_ORIGIN is set but empty');
    } else if (origins.includes('*')) {
      warnings.push('CORS_ORIGIN contains wildcard - CORS may be too permissive');
    }
  }

  // Determine overall status
  if (critical.length > 0) {
    status = 'critical';
  } else if (warnings.length > 0) {
    status = 'warning';
  }

  return {
    status,
    message: getStatusMessage(status, warnings, critical),
    timestamp: new Date().toISOString(),
    warnings,
    critical,
  };
}

/**
 * Get human-readable status message
 */
function getStatusMessage(
  status,
  warnings,
  critical
) {
  if (status === 'healthy') {
    return `Environment is healthy (${env.NODE_ENV})`;
  }
  
  if (status === 'warning') {
    return `Environment has ${warnings.length} warning(s) - review configuration`;
  }
  
  return `Environment has ${critical.length} critical issue(s) - startup blocked`;
}

/**
 * Log environment health status
 */
export function logEnvironmentHealth() {
  const health = checkEnvironmentHealth();
  
  if (health.status === 'healthy') {
    logger.info('Environment health: healthy', { health });
  } else if (health.status === 'warning') {
    logger.warn('Environment health: warning', { health });
  } else {
    logger.error('Environment health: critical', { health });
  }
}

/**
 * Exit process if critical issues found
 */
export function failOnCritical() {
  const health = checkEnvironmentHealth();
  
  if (health.status === 'critical') {
    logger.error('Critical environment issues found', { health });
    console.error('\n❌ Environment validation failed - critical issues:\n');
    for (const issue of health.critical) {
      console.error(`  • ${issue}`);
    }
    console.error('\n');
    process.exit(1);
  }
}

/**
 * Check if environment is ready for startup
 * Returns true if all critical checks pass
 */
export function isEnvironmentReady() {
  const health = checkEnvironmentHealth();
  return health.status !== 'critical';
}
