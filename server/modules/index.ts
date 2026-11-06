/**
 * Server Modules
 *
 * Modular monolith structure. Each module contains:
 * - domain/: Entities, value objects, domain events
 * - application/: Use cases, application services
 * - infrastructure/: Repositories, external service adapters
 * - presentation/: Route handlers, controllers
 */

export * as worldModel from './world-model';
export * as ai from './ai';
export * as auth from './auth';
export * as billing from './billing';
export * as rental from './rental';
export * as farm from './farm';
export * as knowledge from './knowledge';
export * as operations from './operations';
export * as security from './security';
export * as devops from './devops';
export * as teams from './teams';
export * as marketing from './marketing';
