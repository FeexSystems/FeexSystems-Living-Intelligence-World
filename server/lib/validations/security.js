import { z } from 'zod';

// Scan target validation
export const scanTargetSchema = z.object({
  type: z.enum(['url', 'ip', 'domain', 'repository', 'file']),
  value: z.string().min(1, 'Target value is required'),
  port: z.number().int().min(1).max(65535).optional(),
  credentials: z.object({
    username: z.string().optional(),
    password: z.string().optional(),
    apiKey: z.string().optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

// Scan configuration validation
export const scanConfigurationSchema = z.object({
  depth: z.enum(['shallow', 'medium', 'deep']).optional(),
  timeout: z.number().int().min(30).max(3600).optional(), // 30 seconds to 1 hour
  maxConcurrency: z.number().int().min(1).max(10).optional(),
  excludePatterns: z.array(z.string()).optional(),
  includePatterns: z.array(z.string()).optional(),
  customRules: z.array(z.string()).optional(),
  reportFormat: z.enum(['json', 'xml', 'html', 'pdf']).optional(),
});

// Security scan request validation
export const securityScanRequestSchema = z.object({
  target: scanTargetSchema,
  scanType: z.enum(['VULNERABILITY', 'PENETRATION', 'COMPLIANCE']),
  configuration: scanConfigurationSchema.optional(),
  scheduledAt: z.string().datetime().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
});

// Scan query parameters validation
export const scanQuerySchema = z.object({
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().int().min(1).max(100)).optional(),
  offset: z.string().transform(val => parseInt(val)).pipe(z.number().int().min(0)).optional(),
  status: z.enum(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED']).optional(),
  scanType: z.enum(['VULNERABILITY', 'PENETRATION', 'COMPLIANCE']).optional(),
});

// CVE search validation
export const cveSearchSchema = z.object({
  keyword: z.string().min(1, 'Search keyword is required'),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().int().min(1).max(100)).optional(),
});

/**
 * Validate scan target based on type
 */
export function validateScanTarget(target) {
  const errors = [];

  try {
    scanTargetSchema.parse(target);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.errors.map(e => e.message));
    }
    return { isValid: false, errors };
  }

  // Additional validation based on target type
  switch (target.type) {
    case 'url':
      if (!isValidUrl(target.value)) {
        errors.push('Invalid URL format');
      }
      break;
    case 'ip':
      if (!isValidIP(target.value)) {
        errors.push('Invalid IP address format');
      }
      break;
    case 'domain':
      if (!isValidDomain(target.value)) {
        errors.push('Invalid domain format');
      }
      break;
    case 'repository':
      if (!isValidRepository(target.value)) {
        errors.push('Invalid repository URL');
      }
      break;
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate scan configuration
 */
export function validateScanConfiguration(config) {
  const errors = [];

  try {
    scanConfigurationSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.errors.map(e => e.message));
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Sanitize scan configuration
 */
export function sanitizeScanConfiguration(config) {
  const sanitized = { ...config };

  // Remove any potentially dangerous configurations
  delete sanitized.executable;
  delete sanitized.command;
  delete sanitized.script;

  // Ensure timeout is within limits
  if (sanitized.timeout) {
    sanitized.timeout = Math.min(Math.max(sanitized.timeout, 30), 3600);
  }

  // Ensure concurrency is within limits
  if (sanitized.maxConcurrency) {
    sanitized.maxConcurrency = Math.min(Math.max(sanitized.maxConcurrency, 1), 10);
  }

  // Sanitize patterns to prevent injection
  if (sanitized.excludePatterns) {
    sanitized.excludePatterns = sanitized.excludePatterns
      .filter((pattern) => typeof pattern === 'string')
      .map((pattern) => pattern.replace(/[;&|`$()]/g, ''));
  }

  if (sanitized.includePatterns) {
    sanitized.includePatterns = sanitized.includePatterns
      .filter((pattern) => typeof pattern === 'string')
      .map((pattern) => pattern.replace(/[;&|`$()]/g, ''));
  }

  return sanitized;
}

/**
 * Validate request size
 */
export function validateRequestSize(data, maxSize = 1024 * 1024) {
  const jsonString = JSON.stringify(data);
  const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
  return sizeInBytes <= maxSize;
}

// Helper validation functions
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch (e2) {
    return false;
  }
}

function isValidIP(ip) {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

function isValidDomain(domain) {
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return domainRegex.test(domain) && domain.length <= 253;
}

function isValidRepository(repo) {
  const repoRegex = /^https?:\/\/(github\.com|gitlab\.com|bitbucket\.org)\/[\w\-\.]+\/[\w\-\.]+/;
  return repoRegex.test(repo);
}