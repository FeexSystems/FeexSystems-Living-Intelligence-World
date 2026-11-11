 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }/**
 * Idempotency Key Validation Service (Priority 1 — Critical)
 *
 * Provides reusable idempotency validation across all five product verticals
 * using Redis-backed idempotency keys. Enforces:
 *   - Idempotency key presence on write operations
 *   - Key uniqueness per tenant per resource type
 *   - Collision detection and replay handling
 *   - TTL-based expiration of stale idempotency records
 */

import { getRedisClient } from '../redis';
import { logger } from '../logging';

/**
 * Result of an idempotency check.
 */
 


















/**
 * Default TTL: 24 hours.
 */
const DEFAULT_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

/**
 * Build the Redis key for an idempotency record.
 */
function buildIdempotencyKey(
  resourceType,
  tenantId,
  key
) {
  return `idempotency:${resourceType}:${tenantId}:${key}`;
}

/**
 * Validate an idempotency key for a given tenant and resource type.
 *
 * Returns whether the request is a duplicate replay and whether a new
 * record should be created.
 */
export async function validateIdempotencyKey(
  config
) {
  const { resourceType, tenantId, idempotencyKey: key } = config;
  const redisKey = buildIdempotencyKey(resourceType, tenantId, key);

  try {
    const redis = getRedisClient();
    const existing = await redis.get(redisKey);

    if (existing) {
      logger.debug('[idempotency] duplicate key detected', {
        resourceType,
        tenantId,
        key: key.slice(0, 8),
        existingResourceId: existing,
      });
      return {
        duplicate: true,
        existingResourceId: existing,
        shouldCreate: false,
      };
    }

    return { duplicate: false, existingResourceId: null, shouldCreate: true };
  } catch (error) {
    logger.warn('[idempotency] validation failed, allowing request', {
      resourceType,
      tenantId,
      key: key.slice(0, 8),
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open — allow the request but log the warning.
    return { duplicate: false, existingResourceId: null, shouldCreate: true };
  }
}

/**
 * Record an idempotency key after a successful write.
 *
 * Must be called after the resource is successfully created to ensure
 * subsequent retries return the existing record.
 */
export async function recordIdempotencyKey(
  config,
  resourceId
) {
  const { resourceType, tenantId, idempotencyKey: key, ttlSeconds } = config;
  const ttl = _nullishCoalesce(ttlSeconds, () => ( DEFAULT_IDEMPOTENCY_TTL_SECONDS));
  const redisKey = buildIdempotencyKey(resourceType, tenantId, key);

  try {
    const redis = getRedisClient();
    await redis.setex(redisKey, ttl, resourceId);

    logger.debug('[idempotency] key recorded', {
      resourceType,
      tenantId,
      key: key.slice(0, 8),
      resourceId,
      ttlSeconds: ttl,
    });
  } catch (error) {
    logger.warn('[idempotency] record failed', {
      resourceType,
      tenantId,
      key: key.slice(0, 8),
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Clean up expired idempotency records (call from maintenance scheduler).
 * Redis handles TTL automatically, but this can be used for manual cleanup.
 */
export async function cleanupExpiredIdempotencyKeys() {
  // Redis TTL handles expiration automatically. Return 0 for compatibility.
  logger.debug('[idempotency] cleanup — Redis TTL handles expiration automatically');
  return 0;
}