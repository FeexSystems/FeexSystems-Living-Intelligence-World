# Test Infrastructure Enhancement — Implementation Tasks

## Overview

This implementation plan provides 52 actionable tasks for establishing comprehensive test infrastructure across 4 phases. Each task has specific file paths, sub-steps, and acceptance criteria based on the design document.

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "name": "Phase 1: Canvas Polyfill Setup",
      "tasks": [
        "1.1.1",
        "1.2.1", 
        "1.2.3",
        "1.3.1",
        "1.3.2"
      ]
    },
    {
      "name": "Phase 1: Integration & Verification",
      "tasks": [
        "1.1.2",
        "1.1.3",
        "1.2.2",
        "1.2.4",
        "1.1.4"
      ],
      "dependencies": ["1.1.1", "1.2.1", "1.2.3"]
    },
    {
      "name": "Phase 2: Unit Tests",
      "tasks": [
        "2.1.1", "2.1.2", "2.1.3", "2.1.4", "2.1.5",
        "2.2.1", "2.2.2", "2.2.3", "2.2.4",
        "2.3.1", "2.3.2", "2.3.3",
        "2.4.1", "2.4.2"
      ],
      "dependencies": ["1.1.4", "1.3.1", "1.3.2"]
    },
    {
      "name": "Phase 2: Integration Tests",
      "tasks": [
        "2.5.1", "2.5.2", "2.5.3",
        "2.6.1", "2.6.2",
        "2.7.1", "2.7.2"
      ],
      "dependencies": ["2.1.5", "2.2.1"]
    },
    {
      "name": "Phase 3: E2E Tests & CI/CD",
      "tasks": [
        "3.1.1", "3.1.2", "3.1.3", "3.1.4", "3.1.5",
        "3.2.1", "3.2.2",
        "3.3.1"
      ],
      "dependencies": ["2.7.2"]
    },
    {
      "name": "Phase 4: Documentation & Acceptance",
      "tasks": [
        "4.1.1", "4.1.2",
        "4.2.1", "4.2.2"
      ],
      "dependencies": ["3.3.1"]
    }
  ]
}
```

---

## Implementation Tasks

### Task 1.1.1 — Create Canvas Polyfill

- [x] 1.1.1 Create `client/test/canvas-polyfill.ts`
  - Create file with MockWebGLRenderingContext class
  - Implement all WebGL constants (VERTEX_SHADER, FRAGMENT_SHADER, COMPILE_STATUS, LINK_STATUS, etc.)
  - Implement all required methods: viewport, clear, clearColor, useProgram, createProgram, createShader, attachShader, compileShader, linkProgram, getProgramParameter, getShaderParameter, getUniformLocation, getAttribLocation, enableVertexAttribArray, vertexAttribPointer, uniform1f/2f/3f/4f, uniformMatrix4fv, createBuffer, bindBuffer, bufferData, createTexture, bindTexture, texImage2D, drawArrays, drawElements, enable, disable, blendFunc, depthFunc, cullFace, getExtension
  - Create MockWebGL2RenderingContext extending WebGL 1.0
  - Implement setupCanvasPolyfill() function
  - Export setupCanvasPolyfill
  - **Verification**: File created with no TypeScript errors, all methods callable

### Task 1.1.2 — Update Vitest Config

- [x] 1.1.2 Update `vitest.config.ts`
  - Add `./client/test/canvas-polyfill.ts` to setupFiles array (after setup.ts)
  - Verify test patterns and coverage settings
  - **Verification**: setupFiles contains canvas-polyfill.ts, npm test runs without errors

### Task 1.1.3 — Update Client Setup

- [x] 1.1.3 Update `client/test/setup.ts`
  - Import setupCanvasPolyfill from './canvas-polyfill'
  - Call setupCanvasPolyfill() before any Three.js imports
  - Add comment explaining ordering requirement
  - **Verification**: setupCanvasPolyfill imported and called before existing code

### Task 1.1.4 — Verify Canvas Polyfill

- [x] 1.1.4 Create and run verification tests
  - Create `client/test/canvas-polyfill.spec.ts`
  - Write tests for WebGL context creation
  - Write tests for WebGL2 context
  - Write test for 2D fallback
  - Run `npm test -- canvas-polyfill.spec.ts` 
  - Verify all pass
  - Delete temporary test file
  - **Verification**: All canvas polyfill tests pass

### Task 1.2.1 — Create MSW Handlers

- [x] 1.2.1 Create `client/test/mocks/handlers.ts`
  - Import { http, HttpResponse } from 'msw'
  - Create handler for POST /api/auth/login
  - Create handler for POST /api/auth/refresh
  - Create handler for GET /api/world-model/projects
  - Create handler for GET /api/world-model/graph
  - Create error scenario handlers (auth401, auth403, server500, timeout)
  - Export handlers array and errorHandlers object
  - **Verification**: File created with no TypeScript errors, all handlers use correct HTTP methods

### Task 1.2.2 — Create MSW Server

- [x] 1.2.2 Create `client/test/mocks/server.ts`
  - Import { setupServer } from 'msw/node'
  - Import handlers from './handlers'
  - Create server instance
  - Add beforeAll hook: server.listen({ onUnhandledRequest: 'error' })
  - Add afterEach hook: server.resetHandlers()
  - Add afterAll hook: server.close()
  - Export server instance
  - **Verification**: MSW server setup file created with proper lifecycle hooks

### Task 1.2.3 — Create Firebase Mock

- [x] 1.2.3 Create `client/test/mocks/firebase.ts`
  - Import { vi } from 'vitest' and 'jsonwebtoken'
  - Implement createMockFirebaseToken(uid, email, customClaims)
  - Token payload: iss, aud, auth_time, user_id, sub, iat, exp, email, email_verified
  - Sign with JWT_SECRET environment variable
  - Implement mockFirebaseAuth object
  - Use vi.fn() for all callback methods
  - Export both functions and mockFirebaseAuth
  - **Verification**: Token creation produces valid JWT, no TypeScript any types

### Task 1.2.4 — Integrate MSW Setup

- [x] 1.2.4 Update `client/test/setup.ts`
  - Import server from './mocks/server'
  - Verify MSW hooks are called
  - Add comment explaining MSW setup
  - **Verification**: MSW server properly initialized, handlers reset between tests

### Task 1.3.1 — Create Auth Fixture

- [x] 1.3.1 Create `server/test/fixtures/auth-user.ts`
  - Import { User } from '@prisma/client' and bcryptjs
  - Implement createTestUser(overrides?)
  - Implement createAdminUser(overrides?)
  - Implement createTestUsers(count)
  - Export all functions
  - **Verification**: Fixtures return properly typed User objects, password hashed

### Task 1.3.2 — Create World Model Fixture

- [x] 1.3.2 Create `server/test/fixtures/world-model.ts`
  - Import types from '@prisma/client'
  - Implement createProjectFixture(overrides?)
  - Implement createRepositoryFixture(projectId, overrides?)
  - Export both functions
  - **Verification**: Fixtures return properly typed objects, all required fields populated

### Task 2.1.1 — Write JWT Generation Test

- [x] 2.1.1 Create `server/lib/auth.spec.ts`
  - Write test "should generate valid JWT token"
  - Verify token contains user ID and email
  - Verify token is decodable
  - **Verification**: Test passes, token structure valid

### Task 2.1.2 — Write JWT Verification Tests

- [x] 2.1.2 Add to `server/lib/auth.spec.ts`
  - Write test "should verify valid token"
  - Write test "should reject expired token"
  - Write test "should reject invalid signature"
  - Write test "should reject malformed token"
  - **Verification**: All 4 tests pass, error messages informative

### Task 2.1.3 — Write Token Extraction Test

- [x] 2.1.3 Add to `server/lib/auth.spec.ts`
  - Write test "should extract token from Authorization header"
  - Write test "should handle missing Authorization header"
  - Write test "should reject invalid Bearer format"
  - **Verification**: Token extraction works correctly, edge cases handled

### Task 2.1.4 — Write Password Validation Tests

- [x] 2.1.4 Add to `server/lib/auth.spec.ts`
  - Write test for strong passwords
  - Write test for weak passwords
  - Write test for minimum length
  - Write test for character diversity
  - **Verification**: Validation rules enforced, clear error messages

### Task 2.1.5 — Write Token Blacklist Tests

- [x] 2.1.5 Add to `server/lib/auth.spec.ts`
  - Write test "should add token to blacklist"
  - Write test "should verify token in blacklist"
  - Write test "should not blacklist non-existent token"
  - **Verification**: Blacklist functionality works, no false positives

### Task 2.2.1 — Write API Request Test

- [~] 2.2.1 Create `client/lib/api-client.spec.ts`
  - Write test "should make successful request"
  - Use MSW to mock endpoint
  - Call API client and verify response
  - **Verification**: Test passes with MSW mock, response type correct

### Task 2.2.2 — Write API Error Handling Tests

- [~] 2.2.2 Add to `client/lib/api-client.spec.ts`
  - Write test "should handle 400 Bad Request"
  - Write test "should handle 500 Server Error"
  - Write test "should handle request timeout"
  - Use errorHandlers from MSW
  - **Verification**: All error scenarios tested, error types distinct

### Task 2.2.3 — Write CSRF Token Test

- [~] 2.2.3 Add to `client/lib/api-client.spec.ts`
  - Write test "should attach CSRF token to requests"
  - Mock endpoint that checks for CSRF header
  - Verify token present in request headers
  - **Verification**: CSRF token attached correctly, token format valid

### Task 2.2.4 — Write Auth Header Injection Test

- [~] 2.2.4 Add to `client/lib/api-client.spec.ts`
  - Write test "should inject Authorization header"
  - Test with valid token in localStorage
  - Test without token (header should not be present)
  - **Verification**: Header injected when token present, correct Bearer format

### Task 2.3.1 — Write Project Fetching Test

- [~] 2.3.1 Create `server/lib/services/world-model.spec.ts`
  - Write test "should fetch projects from database"
  - Use Prismock fixtures
  - Verify returned projects have correct structure
  - **Verification**: Test passes, fixture data used correctly

### Task 2.3.2 — Write Graph Topology Test

- [~] 2.3.2 Add to `server/lib/services/world-model.spec.ts`
  - Write test "should build graph topology"
  - Verify nodes and edges created
  - Verify relationships correct
  - **Verification**: Graph structure valid, all nodes connected

### Task 2.3.3 — Write Evidence Query Test

- [~] 2.3.3 Add to `server/lib/services/world-model.spec.ts`
  - Write test "should query evidence fabric"
  - Verify evidence records retrieved
  - Verify evidence has provenance (commit SHA, file path, timestamp)
  - **Verification**: Evidence queries work, provenance data complete

### Task 2.4.1 — Write WaveBackground Canvas Test

- [~] 2.4.1 Create `client/components/webgl/WaveBackground.spec.ts`
  - Write test "should have canvas context available"
  - Render WaveBackground component
  - Verify HTMLCanvasElement exists
  - Verify getContext('webgl') returns mock context
  - **Verification**: Canvas context available, no errors on render

### Task 2.4.2 — Write Shader Material Test

- [~] 2.4.2 Add to `client/components/webgl/WaveBackground.spec.ts`
  - Write test "should create shader material"
  - Verify THREE.ShaderMaterial created
  - Verify uniforms defined
  - Verify no rendering errors
  - **Verification**: Shader materials created successfully, uniform structure correct

### Task 2.5.1 — Write User Registration Integration Test

- [~] 2.5.1 Create `server/test/routes/auth.integration.spec.ts`
  - Write test "should register user and persist to database"
  - Call registration endpoint
  - Query database to verify user created
  - Verify password is hashed
  - **Verification**: User persisted to database, password hashed correctly

### Task 2.5.2 — Write Login Integration Test

- [~] 2.5.2 Add to `server/test/routes/auth.integration.spec.ts`
  - Write test "should login user and generate token"
  - Register user first
  - Call login endpoint with credentials
  - Verify token returned and is valid JWT
  - **Verification**: Login returns valid token, token verifiable

### Task 2.5.3 — Write Token Refresh Integration Test

- [~] 2.5.3 Add to `server/test/routes/auth.integration.spec.ts`
  - Write test "should refresh token with database lookup"
  - Use valid refresh token from login
  - Call refresh endpoint
  - Verify new token issued
  - **Verification**: Token refresh works, new token valid

### Task 2.6.1 — Write Redis Blacklist Test

- [~] 2.6.1 Create `server/test/services/cache.integration.spec.ts`
  - Write test "should persist token to blacklist cache"
  - Add token to blacklist via Redis
  - Query Redis for token
  - Verify token exists in cache
  - **Verification**: Token persisted to Redis, query returns cached token

### Task 2.6.2 — Write Redis Cache Test

- [~] 2.6.2 Add to `server/test/services/cache.integration.spec.ts`
  - Write test "should return cache hit"
  - Write test "should return cache miss"
  - Verify cache statistics
  - Verify TTL expiration
  - **Verification**: Hits and misses tracked, TTL respected

### Task 2.7.1 — Write Firebase Verification Integration Test

- [~] 2.7.1 Create `server/test/routes/protected.integration.spec.ts`
  - Write test "should verify Firebase token"
  - Create mock Firebase token
  - Call protected endpoint with token
  - Verify user context extracted from token
  - **Verification**: Firebase token verified, user context extracted

### Task 2.7.2 — Write User Context Extraction Test

- [~] 2.7.2 Add to `server/test/routes/protected.integration.spec.ts`
  - Write test "should extract user context from token"
  - Verify user ID from token
  - Verify email from token
  - Verify custom claims accessible
  - **Verification**: User context properly extracted, all fields accessible

### Task 3.1.1 — Write Landing Page E2E Test

- [~] 3.1.1 Create `e2e/public-landing.spec.ts`
  - Write test "should load landing page without auth"
  - Navigate to /
  - Verify page title
  - Verify WebGL background element present
  - Verify navigation links visible
  - **Verification**: Landing page loads without auth, WebGL background renders

### Task 3.1.2 — Write Auth Flow E2E Test

- [~] 3.1.2 Create/expand `e2e/auth.spec.ts`
  - Write test "should sign up with email"
  - Write test "should login and receive token"
  - Write test "should logout"
  - Verify form validation and error messages
  - Verify token stored in localStorage
  - **Verification**: Full auth flow works, token persisted

### Task 3.1.3 — Write World Model E2E Test

- [~] 3.1.3 Create `e2e/world-interaction.spec.ts`
  - Write test "should login and navigate to /world"
  - Write test "should interact with 3D nodes"
  - Write test "should open node inspector"
  - Verify node data displayed
  - **Verification**: World page loads after auth, 3D scene interactive, node inspector works

### Task 3.1.4 — Write Project Discovery E2E Test

- [~] 3.1.4 Create `e2e/project-discovery.spec.ts`
  - Write test "should view project list"
  - Write test "should filter projects"
  - Write test "should view evidence ledger"
  - Verify pagination if present
  - **Verification**: Project list loads, filters work, evidence accessible

### Task 3.1.5 — Write Protected Routes E2E Test

- [~] 3.1.5 Create `e2e/protected-routes.spec.ts`
  - Write test "should redirect to login when unauthenticated"
  - Write test "should allow access after login"
  - Navigate to /world without token and verify redirect
  - Login and navigate to /world and verify page loads
  - **Verification**: Protected routes redirect unauthenticated users, authenticated access allowed

### Task 3.2.1 — Create GitHub Actions Workflow

- [~] 3.2.1 Create `.github/workflows/test.yml`
  - Define trigger events: push to main/develop, PR to main/develop
  - Define environment variables (NODE_VERSION, DATABASE_URL, JWT secrets)
  - Create unit-tests job: npm test -- --run
  - Create integration-tests job with Postgres + Redis services
  - Create e2e-tests job with Playwright
  - Create type-check job: npm run typecheck
  - **Verification**: Workflow file valid YAML, all jobs defined, proper triggers set

### Task 3.2.2 — Verify GitHub Actions Workflow

- [~] 3.2.2 Test GitHub Actions workflow
  - Push test.yml to repository
  - Trigger workflow on main branch
  - Verify all jobs complete successfully
  - Check that unit tests pass
  - Check that coverage is reported
  - Check that E2E tests pass
  - Check that type checks pass
  - **Verification**: All GitHub Actions jobs pass, coverage reported, no workflow errors

### Task 3.3.1 — Verify Coverage Target

- [~] 3.3.1 Verify test coverage reaches 40%
  - Run `npm test -- --run --coverage`
  - Review coverage/html/index.html
  - Verify statement coverage >= 40%
  - Verify branch coverage >= 35%
  - Verify function coverage >= 40%
  - Verify line coverage >= 40%
  - Document coverage results
  - **Verification**: 40% statement coverage achieved, coverage report generated, all targeted files covered

### Task 4.1.1 — Create Test README

- [~] 4.1.1 Create `docs/TESTING.md`
  - Write "Getting Started" section
  - Write "Running Tests" section: npm test, npm test -- --watch, npm test -- --coverage, npm run test:e2e
  - Write "Writing Tests" section with patterns for unit, integration, E2E tests
  - Write "Debugging Tests" section
  - Write "CI/CD" section
  - **Verification**: Documentation complete, all commands documented, examples provided

### Task 4.1.2 — Create Test Patterns Guide

- [~] 4.1.2 Create `docs/TEST_PATTERNS.md`
  - Document unit test pattern (setup → act → assert)
  - Document mock fixture pattern
  - Document MSW handler pattern
  - Document E2E page object pattern
  - Provide code examples for each
  - **Verification**: All patterns documented, code examples clear and runnable

### Task 4.2.1 — Verify Acceptance Criteria

- [~] 4.2.1 Verify all acceptance criteria
  - Verify Vitest Canvas: Tests run without WebGL errors
  - Verify Watch Mode: npm test enters watch mode
  - Verify 20+ Unit Tests: Count tests in spec.ts files
  - Verify 5+ E2E Tests: Count Playwright test files
  - Verify Type Safety: No TypeScript errors, no any types in mocks
  - Verify Mock Strategy: MSW, Prismock, Firebase integrated
  - Verify GitHub Actions: Tests pass in CI
  - Verify 40% Coverage: Coverage report shows >= 40%
  - Verify Performance: Full test suite completes < 2 minutes
  - Verify Documentation: TESTING.md and TEST_PATTERNS.md exist
  - **Verification**: All 10 acceptance criteria verified, all documentation exists

### Task 4.2.2 — Create Acceptance Report

- [~] 4.2.2 Create `ACCEPTANCE_REPORT.md`
  - Document all 10 acceptance criteria with checkboxes
  - Include coverage metrics
  - Include test count breakdown (unit, integration, E2E)
  - Include GitHub Actions status
  - Include links to test files and documentation
  - Note completion date and time
  - **Verification**: Report created and complete, all criteria documented

---

## Notes

This spec implements a 4-phase approach:

1. **Phase 1 (Weeks 1-2)**: Foundation setup with canvas polyfill, MSW mocks, and database fixtures
2. **Phase 2 (Weeks 3-4)**: Unit, integration, and WebGL tests for critical paths
3. **Phase 3 (Weeks 5-6)**: E2E tests (Playwright) and GitHub Actions CI/CD automation
4. **Phase 4 (Week 7)**: Documentation and acceptance verification

All tasks are executable with specific file paths, sub-steps, and acceptance criteria. Tasks are ordered to respect dependencies and enable parallel execution where possible.

