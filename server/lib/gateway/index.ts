/**
 * Gateway / Facade Layer
 *
 * This module provides a clean facade over the underlying services,
 * decoupling route handlers from service implementation details.
 * Routes should import from this gateway rather than directly from services.
 *
 * @module gateway
 */

// Re-export service modules through the gateway
// This allows us to change service implementations without
// updating route handlers.

export * from './world-model.gateway';
export * from './ai.gateway';
export * from './security.gateway';
export * from './billing.gateway';
export * from './rental.gateway';
export * from './devops.gateway';
export * from './auth.gateway';
