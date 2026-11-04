 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }









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
  field = 'confidence'
) {
  const fields = Array.isArray(field) ? field : [field];

  return (req, res, next) => {
    const body = _nullishCoalesce(req.body, () => ( {}));
    const errors = [];

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
  value,
  fieldName = 'confidence'
) {
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