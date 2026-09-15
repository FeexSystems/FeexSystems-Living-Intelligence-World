# FeexSystems Critical Blockages — Bugfix Design

## Overview

This design formalizes the fix approach for four critical blocking issues in the FeexSystems codebase that prevent CI/CD execution, schema consistency, and public access to canonical experiences. The fixes are targeted, minimal, and preserve backward compatibility. Each bug has a well-defined condition and validation approach that ensures the fix is correct and doesn't introduce regressions.

The bugs will be fixed in sequence:
1. **Bug 1**: TypeScript compilation error (highest impact — blocks entire build)
2. **Bug 2**: Database schema inconsistency (data corruption — marketing telemetry loss)
3. **Bug 3**: Routing access control violation (breaks canonical principles)
4. **Bug 4**: Orphaned build artifacts (cleanup — reduces bloat, fixes Docker issues)

## Glossary

- **Bug_Condition (C)**: The specific condition(s) that trigger each bug
- **Property (P)**: The desired behavior when the bug condition is met
- **Preservation**: Existing behavior that must remain unchanged for non-buggy inputs
- **apiClient**: The `ApiClient` class in `client/lib/api-client.ts` that manages API requests and error handling
- **errorReporter**: The callback function for handling API errors; can be set via `initialize()` or legacy `onError` property
- **MarketingEvent**: The Prisma model in `prisma/schema.prisma` that records marketing content lifecycle events
- **metadata**: JSON field that should store event context (previousState, newState, context)
- **contentOSService**: The service in `server/lib/marketing/content-os.service.ts` that manages content lifecycle transitions
- **Public Route**: Routes accessible to both authenticated and unauthenticated users (principle: Dual Mode Routing)
- **Protected Route**: Routes requiring authentication; should only wrap dashboard and admin routes
- **Orphaned Artifacts**: `.js` files in source directories (`client/`, `server/`) that should only exist in `dist/`

---

## Bug 1: TypeScript Compilation Error — Duplicate 'onError' Identifier

### Bug Details

#### Bug Condition

The bug manifests in `client/lib/api-client.ts` where two conflicting error callback properties exist in the same class scope:
- Line 24: `private errorReporter: ((error: ApiError) => void) | null = null;`
- Line 25: `public onError?: (error: ApiError) => void;`

When TypeScript strict mode processes this class, it reports TS2300 (duplicate identifier) because both are error callbacks with overlapping purpose but different visibility and naming.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug1(input)
  INPUT: input of type TypeScriptCompilationContext
  OUTPUT: boolean
  
  RETURN (fileBeingCompiled = "client/lib/api-client.ts")
         AND (strictModeEnabled = true)
         AND (identifiersInScope.contains("errorReporter") AND 
              identifiersInScope.contains("onError"))
         AND (bothAreErrorCallbacks = true)
END FUNCTION
```

#### Examples

1. **Concrete Example 1**: Running `npm run typecheck` on the current codebase produces:
   ```
   client/lib/api-client.ts:26:10 - error TS2300: Duplicate identifier 'onError'
   26  public onError?: (error: ApiError) => void;
   ```

2. **Concrete Example 2**: The class has overlapping error handling patterns:
   - `initialize(getIdToken, errorReporter)` sets `this.errorReporter`
   - `initialize()` also sets `this.onError` to delegate to `errorReporter`
   - External code can assign directly to `apiClient.onError = handler`
   - Both properties serve the same purpose with different names

3. **Concrete Example 3**: The duplication causes the CI/CD pipeline to fail:
   ```bash
   $ npm run typecheck
   # Fails with TS2300 error, blocking build
   ```

### Expected Behavior

#### Preservation Requirements

**Unchanged Behaviors:**
- Direct assignment: `apiClient.onError = handler` must continue to work (legacy code)
- Method call: `apiClient.initialize(getIdToken, errorReporter)` must continue to work
- Error handling: When API errors occur, the callback must be invoked as before
- CSRF, auth, timeout: All request handling mechanisms remain unchanged

**Scope:**
All inputs that do NOT involve the TypeScript compilation of `api-client.ts` should be completely unaffected. This includes:
- API request/response handling
- Network error scenarios
- Authentication flows
- Any code using the ApiClient

### Hypothesized Root Cause

The most likely issue is:

1. **Legacy Code Debt**: `onError` was originally a public property (legacy pattern), but a new `errorReporter` private property was added for better encapsulation, creating a duplicate.

2. **Incomplete Refactoring**: The `initialize()` method was added to set both properties, but the duplicate identifier issue was not resolved.

3. **TypeScript Strictness**: With `strict: true` enabled, TypeScript now strictly enforces unique identifier scoping, catching what was previously overlooked.

### Correctness Properties

Property 1: Bug Condition - Duplicate Identifier Resolution

_For any_ TypeScript compilation context where the code in `client/lib/api-client.ts` is processed with strict mode enabled, the fixed class SHALL have a single, unified error callback mechanism with no identifier duplication.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Error Handling Compatibility

_For any_ code that invokes error handling (whether via `initialize(getIdToken, errorReporter)` or legacy `apiClient.onError = handler` assignment), the fixed code SHALL produce identical error callback invocations and behavior as the original code.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Fix Implementation

**File**: `client/lib/api-client.ts`

**Strategy**: Consolidate the two properties into a single mechanism by:
1. Keeping `private errorReporter` as the canonical internal storage
2. Removing the public `onError` property declaration
3. Adding a getter/setter for `onError` that delegates to `errorReporter` (backward compatibility)
4. Ensuring both initialization paths set the same internal property

**Specific Changes**:
1. **Remove duplicate property declaration** (line 25)
   - Delete: `public onError?: (error: ApiError) => void;`
   - Reason: Eliminates identifier duplication; unified via getter/setter

2. **Add getter/setter for `onError`** (after line 50, in the ApiClient class)
   - Add getter: `get onError() { return this.errorReporter; }`
   - Add setter: `set onError(callback) { this.errorReporter = callback; }`
   - Reason: Maintains backward compatibility for `apiClient.onError = handler` pattern

3. **Verify `initialize()` method** (line 51)
   - Confirm it sets `this.errorReporter` correctly
   - Remove the old assignment: `this.onError = errorReporter ? (e) => errorReporter(e) : undefined;`
   - Reason: With the getter/setter, assignment is automatic

---

## Bug 2: Missing Database Field — MarketingEvent metadata

### Bug Details

#### Bug Condition

The bug manifests when `contentOSService.transitionState()` attempts to persist event metadata to the database:
- Lines 53-60 in `server/lib/marketing/content-os.service.ts` create a `MarketingEvent` with a `metadata` field
- The Prisma schema defines `MarketingEvent` model WITHOUT a `metadata` field
- The mismatch causes data loss or silent failures

**Formal Specification:**
```
FUNCTION isBugCondition_Bug2(input)
  INPUT: input of type MarketingEventWriteOperation
  OUTPUT: boolean
  
  RETURN (operation = "MarketingEvent.create" OR "MarketingEvent.update")
         AND (dataObject.includes("metadata"))
         AND (PrismaSchema["MarketingEvent"].fields.contains("metadata") = false)
END FUNCTION
```

#### Examples

1. **Concrete Example 1**: When `contentOSService.transitionState("asset-123", "DRAFT")` runs:
   ```typescript
   // Line 53-60 in content-os.service.ts
   await db.marketingEvent.create({
     data: {
       eventType: `content_transitioned_to_draft`,
       assetId: "asset-123",
       metadata: {  // THIS FIELD DOESN'T EXIST IN SCHEMA
         previousState: "BRIEF",
         newState: "DRAFT",
         context: { ... }
       }
     }
   });
   // Result: Prisma throws error or silently ignores metadata
   ```

2. **Concrete Example 2**: The Prisma schema (line 1135 of schema.prisma) defines:
   ```prisma
   model MarketingEvent {
     id                  String   @id @default(cuid())
     // ... other fields ...
     occurredAt          DateTime @default(now()) @map("occurred_at")
     // NO metadata field defined here
   }
   ```

3. **Concrete Example 3**: Without the schema field, telemetry data is lost:
   ```
   $ npm run db:migrate
   # Migration fails or metadata silently discarded
   ```

### Expected Behavior

#### Preservation Requirements

**Unchanged Behaviors:**
- Other `MarketingEvent` creation operations (campaigns, products, channels) work unchanged
- Foreign key relationships to projects, products, assets, campaigns remain intact
- Indexes and query patterns continue to function
- All other fields of `MarketingEvent` are preserved

**Scope:**
All `MarketingEvent` operations that do NOT write to the `metadata` field should be completely unaffected. This includes:
- Creating events for product launches
- Recording campaign activities
- Tracking channel engagements

### Hypothesized Root Cause

1. **Schema Lag**: The `metadata` field was added to the code (`content-os.service.ts`) but the Prisma schema was not updated to match.

2. **Migration Skipped**: No database migration was created/ran to add the `metadata` column to `marketing_events` table.

3. **Type Safety Gap**: Even though TypeScript is strict, Prisma's create payload is flexible enough to accept fields that don't error at compile time.

### Correctness Properties

Property 1: Bug Condition - Schema Field Existence

_For any_ code attempting to write `metadata` to a `MarketingEvent`, the fixed Prisma schema SHALL include a `metadata Json @default("{}")` field that persists the data to the database.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Related Event Operations

_For any_ `MarketingEvent` operations that do NOT involve the `metadata` field (product events, campaign events, channel events), the fixed schema SHALL produce identical query results and relationships as the original code.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Fix Implementation

**File**: `prisma/schema.prisma` (and subsequent migration)

**Strategy**: Add the missing `metadata` JSON field to the `MarketingEvent` model and create a migration to sync the database schema.

**Specific Changes**:
1. **Add `metadata` field to `MarketingEvent` model** (after `occurredAt`, line ~1142)
   ```prisma
   metadata            Json     @default("{}")
   ```
   - Type: `Json` (PostgreSQL JSONB)
   - Default: Empty object `"{}"` to match code
   - Reason: Captures event context (previousState, newState, context)

2. **Generate and run Prisma migration**
   ```bash
   npx prisma migrate dev --name add_marketing_event_metadata
   ```
   - Creates SQL migration to add column to `marketing_events` table
   - Applies migration to development database

3. **Verify code writes match schema**
   - Confirm `content-os.service.ts` line 58 writes `metadata` as JSON object
   - No code changes needed in the service layer

---

## Bug 3: Routing Access Control Violation — Public Routes Incorrectly Protected

### Bug Details

#### Bug Condition

The bug manifests in `client/App.tsx` where two canonical public routes are incorrectly wrapped in the `<Protected>` access control component:
- Line 85: `/navigator` is wrapped in `<Protected>` instead of `<Public>`
- Line 86: `/evidence` is wrapped in `<Protected>` instead of `<Public>`

This violates the canonical Dual Mode Routing principle: public routes should be accessible to all users.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug3(input)
  INPUT: input of type RouteDefinition
  OUTPUT: boolean
  
  RETURN (route = "/navigator" OR route = "/evidence")
         AND (wrapper = "<Protected>")
         AND (publicAccessRequired = true)
END FUNCTION
```

#### Examples

1. **Concrete Example 1**: An unauthenticated user navigates to `https://feexsystems.codes/navigator`:
   ```
   Actual behavior: Redirects to `/login`
   Expected behavior: Displays public Navigator interface
   ```

2. **Concrete Example 2**: An unauthenticated user navigates to `https://feexsystems.codes/evidence`:
   ```
   Actual behavior: Redirects to `/login`
   Expected behavior: Displays public Evidence Ledger
   ```

3. **Concrete Example 3**: The architecture specifies (AGENTS.md):
   ```
   Dual Mode Routing: Public routes (/,/projects, /navigator, /world) 
   are accessible to all users (both guests and authenticated users).
   ```
   Current routing violates this principle.

### Expected Behavior

#### Preservation Requirements

**Unchanged Behaviors:**
- Authenticated users accessing `/navigator` see personalization/history
- Authenticated users accessing `/evidence` see full ledger (possibly with user filters)
- Login/register routes continue to redirect authenticated users
- Dashboard and admin routes remain protected
- `<GuestOnlyRoute>` on auth routes prevents authenticated user re-authentication

**Scope:**
All routes that do NOT involve `/navigator` and `/evidence` should be completely unaffected. This includes:
- `/` landing page (already public)
- `/projects` project explorer (already public)
- `/world` spatial galaxy (already public)
- `/login`, `/register` (remain guest-only)
- `/dashboard/*`, `/admin/*` (remain protected)

### Hypothesized Root Cause

1. **Overly Restrictive Access Control**: The original developer assumed Navigator and Evidence needed authentication to protect features, but the specification requires them to be public.

2. **Incomplete Dual Mode Implementation**: The Dual Mode routing principle wasn't fully applied to all public routes at implementation time.

3. **Feature Fragmentation**: Navigator and Evidence were treated as premium features when they should be part of the public World Model experience.

### Correctness Properties

Property 1: Bug Condition - Public Route Accessibility

_For any_ unauthenticated user navigating to `/navigator` or `/evidence`, the fixed routing SHALL wrap these routes in `<Public>` instead of `<Protected>`, allowing access without authentication.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Authenticated Access and Protected Routes

_For any_ authenticated user accessing `/navigator` or `/evidence`, or for any route not involving `/navigator` or `/evidence`, the fixed routing SHALL produce identical access patterns and redirection behavior as the original code.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Fix Implementation

**File**: `client/App.tsx`

**Strategy**: Change the route wrapper for `/navigator` and `/evidence` from `<Protected>` to `<Public>`, restoring the canonical Dual Mode routing principle.

**Specific Changes**:
1. **Update `/navigator` route** (line 85)
   - Change from: `<Route path="/navigator" element={<Protected><Navigator /></Protected>} />`
   - Change to: `<Route path="/navigator" element={<Public><Navigator /></Public>} />`
   - Reason: Restore public access to AI Navigator

2. **Update `/evidence` route** (line 86)
   - Change from: `<Route path="/evidence" element={<Protected><EvidenceExplorer /></Protected>} />`
   - Change to: `<Route path="/evidence" element={<Public><EvidenceExplorer /></Public>} />`
   - Reason: Restore public access to Evidence Ledger

3. **Update `/evidence/:projectId` route** (line 87)
   - Change from: `<Route path="/evidence/:projectId" element={<Protected><EvidenceExplorer /></Protected>} />`
   - Change to: `<Route path="/evidence/:projectId" element={<Public><EvidenceExplorer /></Public>} />`
   - Reason: Restore public access to project-specific evidence

---

## Bug 4: Orphaned Build Artifacts in Source Tree

### Bug Details

#### Bug Condition

The bug manifests when the source repository contains compiled `.js` files interspersed with `.ts` sources:
- `server/test-webhook.js` (test file compiled to JS)
- `server/test/setup-env.js` (test setup compiled to JS)
- Any other `.js` files in `client/` or `server/` directories

These orphaned artifacts should only exist in `dist/` after build.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug4(input)
  INPUT: input of type FileSystemPath
  OUTPUT: boolean
  
  RETURN (fileExtension = ".js")
         AND (path.contains("client/") OR path.contains("server/"))
         AND (fileIsNotConfiguration = true)  // Exclude postcss.config.js, etc.
         AND (fileIsNotInPublic = true)       // Exclude public/sw.js
         AND (NOT path.contains("dist/"))     // Only source tree
END FUNCTION
```

#### Examples

1. **Concrete Example 1**: Scanning the source tree reveals:
   ```
   f:\...\server\test-webhook.js           (orphaned artifact)
   f:\...\server\test\setup-env.js        (orphaned artifact)
   ```

2. **Concrete Example 2**: When developers clone the repo and run `npm run build`:
   ```
   Issue: The source tree is already polluted with .js files
   Risk: Developers may edit .js files instead of .ts sources
   Problem: Build artifacts bloat the repository size
   ```

3. **Concrete Example 3**: Docker builds with non-root execution:
   ```
   Issue: Permission mismatches between source .js and generated .js
   Risk: Build fails or artifacts are inconsistent
   ```

### Expected Behavior

#### Preservation Requirements

**Unchanged Behaviors:**
- Legitimate config files: `postcss.config.js` (root) remains
- Service worker: `public/sw.js` remains (not a build artifact)
- Build output: `dist/spa/` and `dist/server/` generated as before
- Development mode: `npm run dev` with hot reload unchanged
- Build pipeline: `npm run build` produces identical output

**Scope:**
All files and directories that do NOT contain orphaned `.js` artifacts should be completely unaffected. This includes:
- All `.ts` and `.tsx` source files
- Configuration files in root directory
- Build output in `dist/`
- Test infrastructure

### Hypothesized Root Cause

1. **Manual Test Files**: `test-webhook.js` and `test/setup-env.js` were manually created or compiled for testing but not cleaned up before committing.

2. **Build Process Misconfiguration**: The build system may have previously output to source directories instead of `dist/`.

3. **No `.gitignore` Enforcement**: The `.js` files may have been accidentally added to git tracking without proper exclusion rules.

### Correctness Properties

Property 1: Bug Condition - Artifact Cleanup

_For any_ source directory scan, the fixed repository SHALL contain no orphaned `.js` files in `client/` or `server/` directories (excluding legitimate config files and service worker).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Build Output and Configuration

_For any_ build operation, the fixed repository SHALL produce identical output in `dist/` as the original code, and legitimate configuration files (postcss.config.js, public/sw.js) SHALL remain functional.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Fix Implementation

**Files**: `server/test-webhook.js` (delete), `server/test/setup-env.js` (delete)

**Strategy**: Remove orphaned `.js` files from the source tree and ensure they don't exist in version control.

**Specific Changes**:
1. **Delete `server/test-webhook.js`**
   - Action: Remove file from filesystem and git
   - Reason: Test file; TypeScript equivalent should be in tests
   - Impact: Minimal; file appears to be temporary test harness

2. **Delete `server/test/setup-env.js`**
   - Action: Remove file from filesystem and git
   - Reason: Setup file; should be compiled from source .ts file
   - Impact: Minimal; file is part of test infrastructure

3. **Verify `.gitignore`**
   - Ensure `.js` files in `client/` and `server/` are ignored
   - Add pattern if missing: `client/**/*.js`, `server/**/*.js` (with exceptions)
   - Reason: Prevent future accidental commits

4. **Clean git history** (optional, if files have significant history)
   - Use `git filter-branch` or `git filter-repo` to remove from history
   - Reduces repository size and avoids cloning artifacts

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach for each bug:
1. **Exploratory Phase**: Write tests that demonstrate the bug on unfixed code
2. **Verification Phase**: Confirm the fix works and doesn't break existing behavior

### Bug 1: TypeScript Compilation

**Exploratory Phase**:
- Run `npm run typecheck` on UNFIXED code
- Expected: TS2300 error on duplicate identifier
- Document the error output

**Verification Phase**:
- Run `npm run typecheck` after fix
- Expected: No errors
- Run existing test suite to ensure no regressions

### Bug 2: Database Schema

**Exploratory Phase**:
- Run test that calls `contentOSService.transitionState()`
- Run on UNFIXED code; observe metadata field handling
- Attempt to query `MarketingEvent.metadata` from database

**Verification Phase**:
- Generate and apply migration
- Run test again; verify metadata persists
- Query database to confirm `metadata` column exists

### Bug 3: Routing Access Control

**Exploratory Phase**:
- Navigate to `/navigator` as unauthenticated user in UNFIXED code
- Observe redirect to login
- Navigate to `/evidence` as unauthenticated user
- Observe redirect to login

**Verification Phase**:
- Navigate to `/navigator` after fix; verify it loads without auth
- Navigate to `/evidence` after fix; verify it loads without auth
- Verify authenticated access still works with potential personalization

### Bug 4: Orphaned Artifacts

**Exploratory Phase**:
- Scan `client/` and `server/` for `.js` files
- Document findings
- Verify `.gitignore` coverage

**Verification Phase**:
- Delete orphaned `.js` files
- Verify `npm run build` produces only `dist/` artifacts
- Verify no `.js` files in source tree after build

