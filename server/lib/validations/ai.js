import { z } from 'zod';

// AI Request validation schemas
export const aiRequestSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  input: z.any(), // Will be validated based on service requirements
  parameters: z.record(z.any()).optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal')
});

export const aiServiceParameterSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  required: z.boolean(),
  default: z.any().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  options: z.array(z.string()).optional(),
  description: z.string()
});

export const aiServiceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(['chat', 'analysis', 'generation', 'processing']),
  pricing: z.object({
    type: z.enum(['per_request', 'per_token', 'per_minute']),
    cost: z.number().min(0),
    currency: z.string().default('usd')
  }),
  limits: z.object({
    maxRequestsPerHour: z.number().min(1),
    maxRequestsPerDay: z.number().min(1),
    maxTokensPerRequest: z.number().optional(),
    maxRequestSize: z.number().optional()
  }),
  isActive: z.boolean().default(true),
  provider: z.string().min(1),
  endpoint: z.string().optional(),
  parameters: z.record(aiServiceParameterSchema).optional()
});

 


/**
 * Validate AI request input based on service parameters
 */
export function validateAIRequestInput(
  input,
  parameters = {},
  serviceParameters = {}
) {
  const errors = [];

  // Validate input is not empty
  if (input === undefined || input === null || input === '') {
    errors.push('Input is required');
    return { isValid: false, errors };
  }

  // Validate service-specific parameters
  Object.entries(serviceParameters).forEach(([paramName, paramConfig]) => {
    const value = parameters[paramName];
    
    // Check required parameters
    if (paramConfig.required && (value === undefined || value === null)) {
      errors.push(`Parameter '${paramName}' is required`);
      return;
    }

    // Skip validation if parameter is not provided and not required
    if (value === undefined || value === null) {
      return;
    }

    // Type validation
    switch (paramConfig.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Parameter '${paramName}' must be a string`);
        } else if (paramConfig.options && !paramConfig.options.includes(value)) {
          errors.push(`Parameter '${paramName}' must be one of: ${paramConfig.options.join(', ')}`);
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`Parameter '${paramName}' must be a number`);
        } else {
          if (paramConfig.min !== undefined && value < paramConfig.min) {
            errors.push(`Parameter '${paramName}' must be at least ${paramConfig.min}`);
          }
          if (paramConfig.max !== undefined && value > paramConfig.max) {
            errors.push(`Parameter '${paramName}' must be at most ${paramConfig.max}`);
          }
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Parameter '${paramName}' must be a boolean`);
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`Parameter '${paramName}' must be an array`);
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push(`Parameter '${paramName}' must be an object`);
        }
        break;
    }
  });

  return { isValid: errors.length === 0, errors };
}

/**
 * Sanitize AI request parameters
 */
export function sanitizeAIRequestParameters(
  parameters = {},
  serviceParameters = {}
) {
  const sanitized = {};

  Object.entries(serviceParameters).forEach(([paramName, paramConfig]) => {
    let value = parameters[paramName];

    // Use default value if not provided
    if ((value === undefined || value === null) && paramConfig.default !== undefined) {
      value = paramConfig.default;
    }

    // Skip if still undefined/null
    if (value === undefined || value === null) {
      return;
    }

    // Type coercion and sanitization
    switch (paramConfig.type) {
      case 'string':
        sanitized[paramName] = String(value).trim();
        break;

      case 'number':
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          // Apply min/max constraints
          let constrainedValue = numValue;
          if (paramConfig.min !== undefined) {
            constrainedValue = Math.max(constrainedValue, paramConfig.min);
          }
          if (paramConfig.max !== undefined) {
            constrainedValue = Math.min(constrainedValue, paramConfig.max);
          }
          sanitized[paramName] = constrainedValue;
        }
        break;

      case 'boolean':
        sanitized[paramName] = Boolean(value);
        break;

      case 'array':
        if (Array.isArray(value)) {
          sanitized[paramName] = value;
        }
        break;

      case 'object':
        if (typeof value === 'object' && !Array.isArray(value)) {
          sanitized[paramName] = value;
        }
        break;
    }
  });

  return sanitized;
}

/**
 * Validate request size
 */
export function validateRequestSize(input, maxSize) {
  if (!maxSize) return true;
  
  const inputString = typeof input === 'string' ? input : JSON.stringify(input);
  const sizeInBytes = Buffer.byteLength(inputString, 'utf8');
  
  return sizeInBytes <= maxSize;
}