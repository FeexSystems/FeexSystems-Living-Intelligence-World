# FeexSystems Critical Blockages — Bugfix Requirements

## Introduction

This bugfix spec addresses four critical blocking issues preventing CI/CD pipeline execution, schema synchronization, and public access to canonical World Model experiences. These bugs violate core architectural principles (type safety, dual-mode routing, canonical data consistency) and must be fixed in sequence to restore system stability. The fixes maintain backward compatibility and preserve all existing functionality.

## Bug Analysis

### Bug 1: TypeScript Compilation Error — Duplicate 'onError' Identifier

#### Current Behavior (Defect)

1.1 WHEN TypeScript strict mode (`strict: true`) runs type checking on `client/lib/api-client.ts` THEN the compiler reports error TS2300: duplicate identifier 'onError' in the same scope (line 26)

1.2 WHEN the module `ApiClient` class contains both `private errorReporter: ((error: ApiError) => void) | null` (line 24) and `public onError?: (error: ApiError) => void` (line 25) THEN the TypeScript compiler cannot resolve two conflicting error callback properties

1.3 WHEN `npm run typecheck` is executed on the codebase THEN the build fails with the duplicate identifier error, blocking CI/CD pipeline

#### Expected Behavior (Correct)

2.1 WHEN TypeScript strict mode runs type checking on the corrected `client/lib/api-client.ts` THEN the compiler SHALL emit no errors related to identifier duplication

2.2 WHEN the `ApiClient` class has a single, consistent error callback mechanism THEN both legacy code using `apiClient.onError = handler` and new code using `apiClient.initialize(getIdToken, errorReporter)` SHALL work without type conflicts

2.3 WHEN `npm run typecheck` is executed on the corrected codebase THEN it SHALL complete successfully with no TS2300 errors

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN code calls `apiClient.initialize(getIdToken, errorReporter)` THEN it SHALL CONTINUE TO set the internal error callback mechanism exactly as before

3.2 WHEN code directly assigns to `apiClient.onError` property THEN it SHALL CONTINUE TO work (backward compatibility for legacy code)

3.3 WHEN error responses are received from API calls THEN the error reporter callback SHALL CONTINUE TO be invoked exactly as before, preserving error handling behavior

3.4 WHEN CSRF token validation, authentication headers, or timeout handling occurs THEN they SHALL CONTINUE TO work identically to the current implementation

---

### Bug 2: Missing Database Field — MarketingEvent metadata

#### Current Behavior (Defect)

1.1 WHEN `contentOSService.transitionState()` is called and it reaches the "Record Event" step (line 53-54) THEN it attempts to create a `MarketingEvent` with a `metadata` JSON field

1.2 WHEN the Prisma schema defines `MarketingEvent` model WITHOUT a `metadata` field THEN the code at line 58 writes to a field that does not exist in the database schema

1.3 WHEN the database migration is executed THEN it either fails silently or the metadata is discarded, causing marketing telemetry data loss

1.4 WHEN TypeScript compiles the code THEN there are NO type errors because `metadata` is part of the Prisma create payload but the schema doesn't explicitly forbid it

#### Expected Behavior (Correct)

2.1 WHEN the Prisma schema includes `metadata Json @default("{}")` field in the `MarketingEvent` model THEN the `transitionState()` method SHALL successfully persist all event metadata to the database

2.2 WHEN `contentOSService.transitionState()` creates an event with metadata THEN the metadata (previousState, newState, context) SHALL be stored in the database and retrievable

2.3 WHEN Prisma migrations are run THEN they SHALL create the `metadata` column on the `marketing_events` table without errors

2.4 WHEN the database is queried for `MarketingEvent` records THEN the metadata field SHALL be present and populated with the transition context

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN other `MarketingEvent` creation operations occur (campaigns, products, channels) THEN they SHALL CONTINUE TO work exactly as before, with no changes to schema dependencies

3.2 WHEN existing `MarketingEvent` records are queried THEN they SHALL CONTINUE TO return all other fields unchanged

3.3 WHEN foreign key relationships to `worldModelProject`, `product`, `asset`, `campaign`, or `channel` are used THEN they SHALL CONTINUE TO work identically

3.4 WHEN indexes and query patterns are used on `MarketingEvent` THEN they SHALL CONTINUE TO function without performance regressions

---

### Bug 3: Routing Access Control Violation — Public Routes Incorrectly Protected

#### Current Behavior (Defect)

1.1 WHEN an unauthenticated user navigates to `/navigator` THEN the route is wrapped in `<Protected>` component, requiring authentication, and redirects to login instead of showing the public Navigator interface

1.2 WHEN an unauthenticated user navigates to `/evidence` THEN the route is wrapped in `<Protected>` component, requiring authentication, and redirects to login instead of showing the public Evidence Ledger

1.3 WHEN the architectural specification requires `/navigator` and `/evidence` to be public (canonical Dual Mode Routing principle) THEN the current routing violates that specification

1.4 WHEN public users try to explore the World Model using public routes THEN they are blocked from accessing AI Navigator or Evidence Ledger, breaking the public experience

#### Expected Behavior (Correct)

2.1 WHEN an unauthenticated user navigates to `/navigator` THEN the route SHALL be accessible without authentication, displaying the public Navigator interface with evidence provenance

2.2 WHEN an unauthenticated user navigates to `/evidence` THEN the route SHALL be accessible without authentication, displaying the public Evidence Ledger

2.3 WHEN the route is wrapped in `<Public>` instead of `<Protected>` THEN both authenticated and unauthenticated users SHALL be able to access the routes

2.4 WHEN public routes (`/`, `/projects`, `/navigator`, `/world`, `/evidence`, `/omni`) are accessed THEN they SHALL CONTINUE TO be available to all users without authentication gates

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN an authenticated user navigates to `/navigator` THEN it SHALL CONTINUE TO display the Navigator interface exactly as before, with full personalization and history

3.2 WHEN an authenticated user navigates to `/evidence` THEN it SHALL CONTINUE TO display the Evidence Ledger with user-specific filters if applicable

3.3 WHEN login and registration routes (`/login`, `/register`, `/forgot-password`) are accessed by authenticated users THEN they SHALL CONTINUE TO redirect to `/dashboard` to prevent authenticated users from re-authenticating

3.4 WHEN dashboard routes (`/dashboard/*`, `/admin/*`) are accessed THEN they SHALL CONTINUE TO require authentication exactly as before

3.5 WHEN the `<GuestOnlyRoute>` wrapper is used on auth routes THEN it SHALL CONTINUE TO redirect authenticated users away from those routes

---

### Bug 4: Orphaned Build Artifacts in Source Tree

#### Current Behavior (Defect)

1.1 WHEN the repository is scanned for `.js` files in source directories (`client/`, `server/`) THEN multiple compiled `.js` files are found interspersed with `.ts` sources, including `server/test-webhook.js` and `server/test/setup-env.js`

1.2 WHEN developers work in the source tree THEN they may accidentally edit compiled `.js` files instead of the original `.ts` files, causing changes to be overwritten by the build process

1.3 WHEN the repository is built and packaged THEN the combined source + artifact footprint increases bloat and slows clone/build operations

1.4 WHEN Docker builds run with non-root execution THEN orphaned `.js` files in the source tree may cause permission or synchronization issues

1.5 WHEN `npm run build` is executed THEN only `dist/spa/` and `dist/server/` should contain build artifacts, not the source directories

#### Expected Behavior (Correct)

2.1 WHEN the source tree is scanned for `.js` files THEN only configuration files that belong in the root (`postcss.config.js`) and service workers that belong in `/public/` (sw.js) SHALL be present

2.2 WHEN a clean build is executed (`npm run build`) THEN no `.js` files SHALL be generated in `client/` or `server/` directories

2.3 WHEN the git repository is inspected THEN only `.ts`, `.tsx`, and configuration files SHALL exist in source directories, with all compiled artifacts in `.gitignore`

2.4 WHEN developers clone the repository THEN they SHALL see only source files, and running `npm run build` SHALL produce clean output in `dist/` only

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN legitimate configuration files like `postcss.config.js` exist in the root THEN they SHALL CONTINUE TO function exactly as before

3.2 WHEN the service worker (`public/sw.js`) is used for caching and offline support THEN it SHALL CONTINUE TO work identically

3.3 WHEN the build pipeline runs THEN it SHALL CONTINUE TO produce `dist/spa/` and `dist/server/` output directories without changes to the build configuration

3.4 WHEN development mode runs with `npm run dev` THEN it SHALL CONTINUE TO provide hot reload and TypeScript compilation exactly as before

