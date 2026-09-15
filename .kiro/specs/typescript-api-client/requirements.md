# TypeScript API Client Generation & Integration — Requirements

## Overview

Generate and integrate a production-ready TypeScript API client from the OpenAPI specification for frontend consumption.

## Current State

- OpenAPI spec complete (`docs/openapi.3.0.yaml`)
- Frontend manually constructs API calls via raw `fetch` and `apiClient`
- No type-safe generated client
- **Zero type hints** for API responses in frontend code

## Desired State

- **Generated Client**: `@feexsystems/api-client` npm package
- **Type-safe**: Full TypeScript types for all endpoints and responses
- **Frontend Integration**: Components import and use generated client
- **Maintainability**: Client regenerates on spec changes, stays in sync

## Requirements

### REQ-1: Client Generation Setup
1.1 WHEN spec is finalized THEN OpenAPI Generator creates TypeScript client
1.2 WHEN client generated THEN directory structure is clean with `src/`, `dist/`, `package.json`
1.3 WHEN client built THEN both ES modules and CommonJS output available
1.4 WHEN client package.json configured THEN main/module/types entry points correct

### REQ-2: Generated Client Integration
2.1 WHEN frontend needs World Model projects THEN imports from `@feexsystems/api-client`
2.2 WHEN API call made THEN response is fully typed (no `any`)
2.3 WHEN response accessed THEN IDE autocomplete works (field names, methods)
2.4 WHEN API contract changes THEN frontend compilation breaks (catches breaking changes early)

### REQ-3: Authentication & Configuration
3.1 WHEN client instantiated THEN Firebase token or mock auth configured
3.2 WHEN requests made THEN Bearer token injected automatically
3.3 WHEN CSRF required THEN client handles CSRF token in headers
3.4 WHEN base URL changes THEN client configuration accepts environment overrides

### REQ-4: Error Handling
4.1 WHEN API returns error THEN client types error response schema
4.2 WHEN error caught THEN code can access error.code, error.message, error.details
4.3 WHEN rate limit hit THEN client exposes retry-after duration

### REQ-5: Type Export & Usage
5.1 WHEN component imports client types THEN all response types available (Project, User, etc.)
5.2 WHEN code uses types THEN `npm run typecheck` passes cleanly
5.3 WHEN new endpoint added to spec THEN type must be generated and available to frontend

## Acceptance Criteria

✅ **Package Published**: `@feexsystems/api-client` available on npm  
✅ **Zero `any` Types**: Full type coverage (no escape hatches)  
✅ **Frontend Usage**: At least 5 components updated to use generated client  
✅ **Type Safety**: `npm run typecheck` passes with strict mode  
✅ **Regeneration Script**: `npm run generate:client` regenerates from spec  

## Scope

- **In Scope**: Client generation, npm publishing, frontend integration, type exports
- **Out of Scope**: Backend SDK generation, other language clients
