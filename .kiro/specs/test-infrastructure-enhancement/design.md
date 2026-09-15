# Test Infrastructure Enhancement — Design

## Introduction

This design establishes a comprehensive testing foundation for FeexSystems by solving three critical challenges:

1. **Canvas/WebGL Support**: Enable Vitest to run Three.js components without browser context
2. **Strategic Test Coverage**: Build high-value unit, integration, and E2E tests targeting critical paths
3. **Mock & CI Infrastructure**: Establish reusable mocks, fixtures, and automated testing in GitHub Actions

The design prioritizes **initial 40% coverage** with high-value tests rather than exhaustive coverage, targeting auth, API client, services, and critical user flows.

---

## Architecture Overview

### Test Layers (Testing Pyramid)

```
                  E2E (Playwright)
                  5-10 critical user journeys
                 /
                / Integration
               /  (Database, Redis, Firebase mocks)
              /
             /  Unit Tests
            /   (Pure functions, middleware, utilities)
           /
          / Canvas/WebGL Unit Tests
         /   (Three.js components with polyfill)
        /___________________________
```

### Codebase Organization

```
FeexSystems-Living-Intelligence-World/
├── client/
│   ├── test/
│   │   ├── setup.ts                    # Browser environment mocks (exists)
│   │   ├── auth/                       # Auth middleware tests
│   │   ├── api/                        # API client tests
│   │   ├── components/
│   │   │   ├── webgl/                  # Canvas/WebGL component tests
│   │   │   └── ui/                     # UI component tests
│   │   ├── services/                   # Business logic service tests
│   │   ├── lib/                        # Utility function tests
│   │   ├── fixtures/                   # Reusable test data
│   │   └── mocks/                      # MSW handlers, Firebase mocks
│   └── *.spec.ts                       # Co-located component specs
├── server/
│   ├── test/
│   │   ├── setup-env.ts                # Server env & Prisma mock setup
│   │   ├── auth/                       # JWT middleware, auth service tests
│   │   ├── routes/                     # Express route handler tests
│   │   ├── services/                   # Business service tests
│   │   ├── fixtures/                   # Test database seeds
│   │   └── mocks/                      # Firebase, Redis mock setup
│   └── *.spec.ts                       # Co-located route/service specs
├── e2e/
│   ├── helpers/                        # Playwright utilities (page objects)
│   ├── auth.spec.ts                    # Login/signup flows (exists)
│   ├── critical-flows.spec.ts          # NEW: World model navigation
│   ├── world-interaction.spec.ts       # NEW: 3D spatial world tests
│   ├── project-discovery.spec.ts       # NEW: Project/evidence browsing
│   └── README.md
├── vitest.config.ts                    # UPDATED: Canvas polyfill
├── playwright.config.ts                # UNCHANGED
└── package.json
```

### Testing Responsibility Matrix

| Component | Unit | Integration | E2E | Strategy |
|-----------|------|-------------|-----|----------|
| Auth Middleware (JWT validation) | ✅ | ✅ | ❌ | Round-trip: token generation → validation → extraction |
| API Client (fetch wrapper) | ✅ | ✅ | ✅ | Error scenarios, timeout, retry logic |
| Database Layer (Prisma) | ✅ | ✅ | ❌ | Prismock for in-memory, real DB for integration |
| Redis Cache | ✅ | ✅ | ❌ | Mock for unit, real for integration |
| Firebase Auth | ✅ | ❌ | ✅ | Mock token verification, E2E with real flow |
| Three.js Components | ✅ | ❌ | ❌ | Canvas polyfill for WebGL context |
| Form/UI Components | ✅ | ❌ | ✅ | User interactions via Playwright |
| API Routes | ✅ | ✅ | ✅ | Supertest for unit/integration, Playwright for E2E |
| Critical User Flows | ❌ | ❌ | ✅ | End-to-end journey validation |

---

## Component Design

### 1. Vitest Canvas/WebGL Configuration

#### Problem Statement

Three.js requires `HTMLCanvasElement.getContext('webgl')` which jsdom doesn't implement. Without this, WebGL component tests fail with:
```
TypeError: Cannot read property 'getContext' of null
```

#### Solution: Canvas Context Polyfill

Use `@vitest/canvas` or implement a lightweight polyfill that mocks WebGL context. This approach:
- Avoids heavyweight node-canvas dependency
- Provides minimal but sufficient WebGL API surface
- Allows shader compilation simulation without actual rendering
- Integrates with existing jsdom setup

#### Implementation

**File: `client/test/canvas-polyfill.ts` (NEW)**

```typescript
import { vi } from 'vitest';

/**
 * Mock WebGL context for canvas testing.
 * Allows Three.js to initialize without actual rendering.
 */
class MockWebGLRenderingContext {
  VERTEX_SHADER = 0x8b31;
  FRAGMENT_SHADER = 0x8b30;
  COMPILE_STATUS = 0x8b81;
  LINK_STATUS = 0x8b82;
  ACTIVE_UNIFORMS = 0x8b86;
  ACTIVE_ATTRIBUTES = 0x8b89;

  viewport = vi.fn();
  clear = vi.fn();
  clearColor = vi.fn();
  useProgram = vi.fn();
  createProgram = vi.fn(() => ({}));
  createShader = vi.fn(() => ({}));
  attachShader = vi.fn();
  compileShader = vi.fn();
  linkProgram = vi.fn();
  getProgramParameter = vi.fn((prog, param) => {
    if (param === this.LINK_STATUS) return true;
    return true;
  });
  getShaderParameter = vi.fn((shader, param) => {
    if (param === this.COMPILE_STATUS) return true;
    return 0;
  });
  getUniformLocation = vi.fn(() => ({}));
  getAttribLocation = vi.fn(() => 0);
  enableVertexAttribArray = vi.fn();
  vertexAttribPointer = vi.fn();
  uniform1f = vi.fn();
  uniform2f = vi.fn();
  uniform3f = vi.fn();
  uniform4f = vi.fn();
  uniformMatrix4fv = vi.fn();
  createBuffer = vi.fn(() => ({}));
  bindBuffer = vi.fn();
  bufferData = vi.fn();
  createTexture = vi.fn(() => ({}));
  bindTexture = vi.fn();
  texImage2D = vi.fn();
  drawArrays = vi.fn();
  drawElements = vi.fn();
  enable = vi.fn();
  disable = vi.fn();
  blendFunc = vi.fn();
  depthFunc = vi.fn();
  cullFace = vi.fn();
  getExtension = vi.fn((name: string) => {
    if (name === 'WEBGL_lose_context') {
      return { loseContext: vi.fn(), restoreContext: vi.fn() };
    }
    return null;
  });
}

class MockWebGL2RenderingContext extends MockWebGLRenderingContext {
  // Extends WebGL 1.0 with WebGL 2.0 methods
  createVertexArray = vi.fn(() => ({}));
  bindVertexArray = vi.fn();
  vertexAttribDivisor = vi.fn();
  drawArraysInstanced = vi.fn();
}

/**
 * Install canvas polyfill globally for tests.
 * Call this in vitest setup file before Three.js imports.
 */
export function setupCanvasPolyfill() {
  if (typeof HTMLCanvasElement === 'undefined') return;

  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = function (
    contextType: string,
    ...args: unknown[]
  ): any {
    if (contextType === 'webgl') {
      return new MockWebGLRenderingContext();
    }
    if (contextType === 'webgl2') {
      return new MockWebGL2RenderingContext();
    }
    // Fall back to original for 2d, etc.
    return originalGetContext.call(this, contextType, ...args);
  };
}
```

**Updated: `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      './client/test/setup.ts',
      './client/test/canvas-polyfill.ts',  // NEW: Canvas polyfill
      './server/test/prisma-mock.ts'
    ],
    include: [
      'client/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'server/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: ['node_modules', 'dist', '.git', '.cache'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['client/**', 'server/lib/**', 'server/routes/**'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/test/**'
      ]
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@server": path.resolve(__dirname, "./server"),
      "@test": path.resolve(__dirname, "./test")
    }
  }
});
```

**Updated: `client/test/setup.ts`**

```typescript
// (after imports)
import { setupCanvasPolyfill } from './canvas-polyfill';

// Call polyfill BEFORE any Three.js imports
setupCanvasPolyfill();

// ... rest of existing setup
```

---

### 2. Fixture & Mock Strategy

#### MSW (Mock Service Worker) Setup

**File: `client/test/mocks/handlers.ts` (NEW)**

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', () =>
    HttpResponse.json({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      user: { id: 'user-1', email: 'test@feex.local', role: 'user' }
    })
  ),

  http.post('/api/auth/refresh', () =>
    HttpResponse.json({
      accessToken: 'new-access-token'
    })
  ),

  // World model endpoints
  http.get('/api/world-model/projects', () =>
    HttpResponse.json({
      projects: [
        { id: 'proj-1', name: 'FEEX Core', description: 'Core platform' }
      ]
    })
  ),

  http.get('/api/world-model/graph', () =>
    HttpResponse.json({
      nodes: [
        { id: 'n1', label: 'Node 1', type: 'project' }
      ],
      edges: []
    })
  ),
];

// Error scenario handlers
export const errorHandlers = {
  auth401: http.get('/api/protected', () =>
    HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
  ),
  
  auth403: http.get('/api/protected', () =>
    HttpResponse.json({ error: 'Forbidden' }, { status: 403 })
  ),

  server500: http.get('/api/data', () =>
    HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  ),

  timeout: http.get('/api/slow', async () => {
    await new Promise(r => setTimeout(r, 35000)); // Exceeds 30s timeout
    return HttpResponse.json({ data: 'never reached' });
  })
};
```

**File: `client/test/mocks/server.ts` (NEW)**

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// Enable MSW before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset MSW state after each test
afterEach(() => server.resetHandlers());

// Cleanup after all tests
afterAll(() => server.close());
```

#### Firebase Mock Decorator

**File: `client/test/mocks/firebase.ts` (NEW)**

```typescript
import { vi } from 'vitest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

/**
 * Create a mock Firebase ID token for testing.
 * Mimics Firebase token structure without actual Firebase Admin SDK.
 */
export function createMockFirebaseToken(
  uid: string,
  email: string,
  customClaims?: Record<string, unknown>
): string {
  const payload = {
    iss: 'https://securetoken.google.com/test-project',
    aud: 'test-project',
    auth_time: Math.floor(Date.now() / 1000),
    user_id: uid,
    sub: uid,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    email,
    email_verified: true,
    ...customClaims,
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

/**
 * Mock Firebase auth context for component testing.
 */
export const mockFirebaseAuth = {
  currentUser: {
    uid: 'test-user-123',
    email: 'test@example.com',
    getIdToken: vi.fn(async () => createMockFirebaseToken('test-user-123', 'test@example.com')),
  },
  signInWithEmailAndPassword: vi.fn(async (email: string, password: string) => ({
    user: { uid: 'test-user-123', email }
  })),
  signOut: vi.fn(async () => undefined),
  onAuthStateChanged: vi.fn((callback) => {
    callback(mockFirebaseAuth.currentUser);
    return () => {};
  }),
};
```

#### Prismock Database Fixtures

**File: `server/test/fixtures/auth-user.ts` (NEW)**

```typescript
import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Create a test user fixture with hashed password.
 */
export async function createTestUser(overrides?: Partial<User>): Promise<User> {
  const passwordHash = await bcrypt.hash('TestPassword123!', 10);

  return {
    id: 'user-test-001',
    email: 'test@feex.local',
    passwordHash,
    role: 'user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Create admin user fixture.
 */
export async function createAdminUser(
  overrides?: Partial<User>
): Promise<User> {
  return createTestUser({ role: 'admin', ...overrides });
}

/**
 * Create multiple test users.
 */
export async function createTestUsers(
  count: number = 3
): Promise<User[]> {
  const users: User[] = [];
  for (let i = 0; i < count; i++) {
    users.push(
      await createTestUser({
        id: `user-test-${i.toString().padStart(3, '0')}`,
        email: `user${i}@feex.local`,
      })
    );
  }
  return users;
}
```

**File: `server/test/fixtures/world-model.ts` (NEW)**

```typescript
import { Project, Repository, Technology } from '@prisma/client';

export function createProjectFixture(
  overrides?: Partial<Project>
): Project {
  return {
    id: 'proj-001',
    name: 'FeexSystems Core',
    description: 'Core platform',
    gitHubUrl: 'https://github.com/feexsystems/core',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export function createRepositoryFixture(
  projectId: string,
  overrides?: Partial<Repository>
): Repository {
  return {
    id: 'repo-001',
    projectId,
    name: 'core',
    gitHubUrl: 'https://github.com/feexsystems/core',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}
```

---

### 3. Test Strategy Matrix

#### Unit Tests (20+)

**Priority 1: Auth & Security (8 tests)**
- `server/lib/auth.spec.ts`
  - JWT token generation
  - JWT token verification (valid, expired, invalid)
  - Token extraction from header
  - Password strength checking
  - Token blacklist add/verify

**Priority 1: API Client (6 tests)**
- `client/lib/api-client.spec.ts`
  - Successful request
  - Error handling (4xx, 5xx, timeout)
  - CSRF token attachment
  - Authorization header injection

**Priority 2: Services (6+ tests)**
- `server/lib/services/world-model.spec.ts`
  - Project fetching
  - Graph topology building
  - Evidence fabric queries

**Priority 2: Utilities (4+ tests)**
- `client/lib/utils.spec.ts` (already has skeleton)
- `server/lib/validations/*.spec.ts`

**Priority 3: Canvas/WebGL (3+ tests)**
- `client/components/webgl/WaveBackground.spec.ts`
  - Canvas context availability
  - Component mounting
  - Shader material creation

#### Integration Tests (5-10)

**Database Layer**
- `server/test/routes/auth.integration.spec.ts`
  - User registration → database insert
  - Login → token generation
  - Token refresh → database lookup

**Redis Caching**
- `server/test/services/cache.integration.spec.ts`
  - Token blacklist persistence
  - Cache hit/miss

**Firebase + Local DB**
- `server/test/routes/protected.integration.spec.ts`
  - Firebase token verification
  - User context from token

#### E2E Tests (5+ Playwright)

**Critical Flows**
1. **Public Landing** (`e2e/public-landing.spec.ts`)
   - Load `/` without auth
   - Verify WebGL background renders
   - Navigate to `/projects`

2. **Authentication Flow** (`e2e/auth.spec.ts` - expand)
   - Sign up with email
   - Verify email (mock email service)
   - Login and receive token

3. **World Model Navigation** (`e2e/world-interaction.spec.ts`)
   - Login → navigate to `/world`
   - Interact with 3D nodes
   - Open node inspector

4. **Project Discovery** (`e2e/project-discovery.spec.ts`)
   - View project list
   - Filter projects
   - View evidence ledger

5. **Protected Route Access** (`e2e/protected-routes.spec.ts`)
   - Attempt access without token → redirect to login
   - After login → access granted

---

### 4. Correctness Properties

#### Round-Trip Properties (Serialization/Parsing)

**Property 1: JWT Token Round-Trip**
```
For all valid users U:
  generateAccessToken(U)
  .then(token => verifyAccessToken(token))
  .should_equal(U)
```

**Property 2: API Client Response Serialization**
```
For all valid responses R:
  JSON.parse(JSON.stringify(R))
  .should_deep_equal(R)
```

#### Invariants (Properties That Never Change)

**Property 3: Token Expiration Invariant**
```
For all tokens T:
  isTokenExpired(T) implies getTokenExpirationTime(T) < now()
```

**Property 4: Database User Consistency**
```
For all users U inserted to database:
  select(U.id).email === U.email
  AND select(U.id).role === U.role
```

#### Idempotence Properties (Repeating = Same Result)

**Property 5: Blacklist Add Idempotence**
```
For all tokens T:
  addToBlacklist(T)
  .then(() => addToBlacklist(T))
  .should_equal(addToBlacklist(T) once)
```

**Property 6: State Cache Idempotence**
```
For all cache keys K:
  getCache(K)
  .then(() => getCache(K))
  .should_return_same_value()
```

#### Metamorphic Properties (Relationships Between Inputs)

**Property 7: API Error Status Codes**
```
For all error responses E:
  E.status in [400, 401, 403, 404, 429, 500, 503]
  implies handleApiError(E) !== undefined
```

**Property 8: WebGL Canvas Initialization**
```
For all Three.js components C:
  C renders
  implies HTMLCanvasElement.getContext('webgl') !== null
```

#### Error Condition Properties

**Property 9: Invalid Auth Header Handling**
```
For all invalid auth headers H in [undefined, "", "InvalidBearer", ...]:
  extractTokenFromHeader(H) === null
```

**Property 10: Request Timeout**
```
For all requests R with timeout T < actual_response_time:
  request(R) throws TimeoutError
```

---

### 5. GitHub Actions CI/CD Workflow

**File: `.github/workflows/test.yml` (NEW)**

```yaml
name: Test & Coverage

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '22'
  DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb'
  JWT_SECRET: 'test-jwt-secret-at-least-16-chars'
  JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-at-least-16'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- --run

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm test -- --run --grep "integration"

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript type check
        run: npm run typecheck
```

---

### 6. Rollout Phasing

#### Phase 1: Foundation (Weeks 1-2)
- ✅ Vitest canvas polyfill setup
- ✅ MSW mock server setup
- ✅ Prismock database fixtures
- ✅ 8 auth/JWT unit tests
- ✅ 6 API client unit tests
- **Target**: 15% coverage

#### Phase 2: Core Services (Weeks 3-4)
- ✅ 6+ service unit tests
- ✅ 5-10 integration tests (database, Redis, Firebase)
- ✅ 3+ WebGL canvas component tests
- **Target**: 30% coverage

#### Phase 3: E2E & CI/CD (Weeks 5-6)
- ✅ 5+ Playwright E2E tests
- ✅ GitHub Actions workflow
- ✅ Coverage reporting
- ✅ Performance benchmarking
- **Target**: 40% coverage

---

## Acceptance Criteria Checklist

- [ ] **Vitest Canvas**: Tests run without WebGL context errors
- [ ] **Watch Mode**: `npm test` enters watch mode with canvas polyfill active
- [ ] **20+ Unit Tests**: All critical auth, API client, services covered
- [ ] **5+ E2E Tests**: Critical user flows (login, world model, project discovery) pass
- [ ] **Type Safety**: All mocks use strict TypeScript, zero `any` casts
- [ ] **Mock Strategy**: MSW, Prismock, Firebase mocks fully integrated
- [ ] **GitHub Actions**: Tests run on every PR with coverage reporting
- [ ] **40% Coverage**: Overall test coverage reaches 40% (unit + integration + E2E)
- [ ] **Performance**: Full test suite completes in <2 minutes
- [ ] **Documentation**: Test README with setup, patterns, and debugging guide

---

## Implementation Approach

### Sequence of Implementation

1. **Setup Canvas Polyfill** (`client/test/canvas-polyfill.ts`)
   - Mock WebGL context
   - Update vitest.config.ts
   - Verify with one Three.js component test

2. **Setup MSW & Fixtures** (client/test/mocks, server/test/fixtures)
   - MSW handlers for auth, world model
   - Firebase mock tokens
   - Prismock user fixtures

3. **Write Priority 1 Unit Tests**
   - Auth middleware (8 tests)
   - API client (6 tests)
   - Verify 15% coverage

4. **Write Integration Tests**
   - Database operations
   - Redis operations
   - Firebase token verification

5. **Write E2E Tests** (Playwright)
   - Critical user flows
   - Protected route validation

6. **GitHub Actions Setup**
   - Unit test job
   - Integration test job
   - E2E test job
   - Coverage reporting

### Key Files to Create/Modify

**Create (New Files):**
- `.github/workflows/test.yml`
- `client/test/canvas-polyfill.ts`
- `client/test/mocks/handlers.ts`
- `client/test/mocks/server.ts`
- `client/test/mocks/firebase.ts`
- `server/test/fixtures/auth-user.ts`
- `server/test/fixtures/world-model.ts`
- `client/lib/api-client.spec.ts`
- `server/lib/auth.spec.ts`
- `e2e/critical-flows.spec.ts`

**Modify (Existing):**
- `vitest.config.ts` (add canvas polyfill setup)
- `client/test/setup.ts` (import canvas polyfill)
- `package.json` (ensure test scripts)

---

## Success Metrics

| Metric | Target | Definition |
|--------|--------|-----------|
| Unit Test Coverage | 40% | Lines covered by `npm test` |
| Critical Path Coverage | 100% | Auth, API client, core services |
| E2E Test Count | 5+ | Complete user journeys via Playwright |
| Test Execution Time | <2 min | Full suite (unit + integration + E2E) |
| CI/CD Pass Rate | >95% | Green tests on main branch |
| Type Safety | 0 `any` | No TypeScript `any` in mocks/fixtures |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Canvas polyfill insufficient for complex shaders | Medium | Use happy-dom environment as fallback; test early |
| Flaky E2E tests | Medium | Use explicit waits, retry logic, unique selectors |
| CI/CD timeout | Low | Parallelize jobs, use service containers for DB |
| Firebase mock token mismatch | Medium | Create realistic token structure, test verification |

---

## Out of Scope (Future Phases)

- 100% code coverage (targeting 40% initially)
- Performance profiling & benchmarking
- Contract testing (API versioning)
- Load testing & stress testing
- Mutation testing
- Visual regression testing (screenshots)
