/**
 * Confidence Score Validation Middleware (Priority 1 — Critical)
 *
 * Validates that confidence scores across all AI-related models fall within
 * the [0, 1] range. Rejects requests with invalid confidence values before
 * they reach the database.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * AI-related model fields that carry confidence scores.
 */
const CONFIDENCE_FIELDS = [
  'confidence',
  'aiConfidence',
  'classificationConfidence',
];

/**
 * Middleware factory that validates confidence scores in request body.
 *
 * @param field - The field name(s) containing confidence values to validate.
 */
export function validateConfidenceScores(
  field: string | string[] = 'confidence'
): (req: Request, res: Response, next: NextFunction) => void {
  const fields = Array.isArray(field) ? field : [field];

  return (req: Request, res: Response, next: NextFunction): void => {
    const body = req.body ?? {};
    const errors: Array<{ field: string; value: unknown; message: string }> = [];

    for (const confField of fields) {
      const value = body[confField];
      if (value === undefined || value === null) continue;

      const num = Number(value);
      if (!Number.isFinite(num) || num < 0 || num > 1) {
        errors.push({
          field: confField,
          value,
          message: `Confidence score must be a number between 0 and 1, received: ${String(value)}`,
        });
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Confidence score validation failed',
          code: 'CONFIDENCE_SCORE_INVALID',
          details: errors,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  };
}

/**
 * Standalone validator for confidence scores (usable in services).
 */
export function validateConfidenceScore(
  value: unknown,
  fieldName: string = 'confidence'
): { valid: boolean; error?: string } {
  if (value === undefined || value === null) {
    return { valid: true }; // Optional field — absence is fine
  }

  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 1) {
    return {
      valid: false,
      error: `${fieldName} must be a number between 0 and 1, received: ${String(value)}`,
    };
  }

  return { valid: true };
}