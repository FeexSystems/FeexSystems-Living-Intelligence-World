# Test Infrastructure Guide

## Overview

This guide covers the test infrastructure for FeexSystems, including unit tests, integration tests, E2E tests, and CI/CD automation.

## Getting Started

### Installation

All test dependencies are included in `package.json`. Install with:

```bash
npm install
```

### Quick Start

Run the test suite:

```bash
npm test
```

## Running Tests

### Unit & Integration Tests

Run all tests once:

```bash
npm test
```

Run tests in watch mode (auto-rerun on file changes):

```bash
npm test -- --watch
```

Run tests matching a pattern:

```bash
npm test -- --grep "auth"
```

Run specific file:

```bash
npm test -- client/lib/api-client.test.ts
```

### Coverage Reports

Generate coverage report:

```bash
npm test -- --coverage
```

View HTML coverage report:

```bash
npm test -- --coverage
open coverage/index.html  # macOS
start coverage/index.html  # Windows
```

Coverage target: **40% minimum** across statements, branches, functions, and lines.

### E2E Tests (Playwright)

Run all E2E tests:

```bash
npm run test:e2e
```

Run E2E tests in headed mode (see browser):

```bash
npm run test:e2e -- --headed
```

Run specific E2E test file:

```bash
npm run test:e2e -- e2e/auth.spec.ts
```

View E2E test report after run:

```bash
npx playwright show-report
```

### Type Checking

Run TypeScript type checks:

```bash
npm run typecheck
```

## Writing Tests

### Test File Structure

Test files follow the pattern: `*.spec.ts` or `*.test.ts` co-located with source files.

```
client/
  lib/
    api-client.ts           # Source file
    api-client.spec.ts      # Test file (same directory)
server/
  lib/
    auth.ts                 # Source file
    auth.spec.ts            # Test file (same directory)
```

### Unit Test Pattern (AAA - Arrange, Act, Assert)

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/my-function';

describe('myFunction', () => {
  it('should return expected result', () => {
    // Arrange: set up test data
    const input = { value: 42 };
    
    // Act: execute the code under test
    const result = myFunction(input);
    
    // Assert: verify the result
    expect(result).toBe(42);
  });
});
```

### Mock Fixture Pattern

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('User Service', () => {
  let testUser: User;

  beforeEach(() => {
    // Create fresh fixtures for each test
    testUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  it('should create user', () => {
    const result = userService.create(testUser);
    expect(result.id).toBe('user-123');
  });
});
```

### MSW Handler Pattern (API Mocking)

Use MSW (Mock Service Worker) to mock HTTP requests:

```typescript
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { apiClient } from '@/lib/api-client';

describe('API Client', () => {
  it('should handle successful request', async () => {
    // MSW handlers are pre-configured and auto-intercept
    const response = await apiClient.get('/api/users');
    
    expect(response).toBeDefined();
  });

  it('should handle error response', async () => {
    // Override handler for this test
    server.use(
      http.get('/api/error', () => {
        return HttpResponse.json(
          { error: 'Server error' },
          { status: 500 }
        );
      })
    );

    try {
      await apiClient.get('/api/error');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
```

### E2E Page Object Pattern (Playwright)

```typescript
import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async fillEmail(email: string) {
    await this.page.fill('input[name="email"]', email);
  }

  async fillPassword(password: string) {
    await this.page.fill('input[name="password"]', password);
  }

  async clickLogin() {
    await this.page.click('button:has-text("Login")');
  }

  async assertErrorMessage(message: string) {
    await expect(this.page.locator('[role="alert"]')).toContainText(message);
  }
}

// Usage in test
import { test, expect } from '@playwright/test';

test('should login successfully', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.goto();
  await loginPage.fillEmail('user@example.com');
  await loginPage.fillPassword('password123');
  await loginPage.clickLogin();
  
  await expect(page).toHaveURL('/dashboard');
});
```

## Project Structure

```
FeexSystems-Living-Intelligence-World/
├── client/
│   ├── test/
│   │   ├── setup.ts                  # Vitest setup (globals, DOM)
│   │   ├── canvas-polyfill.ts        # WebGL canvas mock
│   │   ├── mocks/
│   │   │   ├── handlers.ts           # MSW request handlers
│   │   │   ├── server.ts             # MSW server setup
│   │   │   ├── firebase.ts           # Firebase token mock
│   │   │   └── api.ts                # Mock API responses
│   │   └── fixtures/                 # Reusable test data
│   ├── lib/
│   │   ├── api-client.spec.ts        # API client tests
│   │   ├── error-handler.spec.ts     # Error handling tests
│   │   └── ... (other library tests)
│   └── components/
│       └── webgl/
│           ├── WaveBackground.tsx
│           └── WaveBackground.spec.ts
│
├── server/
│   ├── test/
│   │   ├── setup-env.ts              # Server test env setup
│   │   ├── prisma-mock.ts            # Database mock setup
│   │   ├── fixtures/
│   │   │   ├── auth-user.ts          # User test data
│   │   │   └── world-model.ts        # World model test data
│   │   ├── routes/
│   │   │   ├── auth.integration.spec.ts
│   │   │   └── ... (route integration tests)
│   │   └── services/
│   │       ├── cache.integration.spec.ts
│   │       └── ... (service integration tests)
│   └── lib/
│       ├── auth.spec.ts              # Auth utilities tests
│       └── ... (library tests)
│
├── e2e/
│   ├── helpers/                      # Playwright utilities
│   ├── auth.spec.ts                  # Auth flow E2E
│   ├── world-interaction.spec.ts     # World model E2E
│   ├── protected-routes.spec.ts      # Route protection E2E
│   └── ... (other E2E tests)
│
├── vitest.config.ts                  # Vitest configuration
├── playwright.config.ts              # Playwright configuration
└── package.json                      # Test scripts
```

## Debugging Tests

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test", "--", "--inspect-brk"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

Then press F5 to debug.

### Debug in Terminal

```bash
npm test -- --inspect-brk
```

Then open `chrome://inspect` in Chrome.

### Print Debug Info

```typescript
import { describe, it, expect } from 'vitest';

describe('Debug Example', () => {
  it('should show debug output', () => {
    const data = { foo: 'bar' };
    console.log('Debug:', data);  // Visible in test output
    expect(data.foo).toBe('bar');
  });
});
```

### Watch Single File

```bash
npm test -- --watch api-client.spec.ts
```

## CI/CD Pipeline

Tests run automatically on:
- **Push to `main` or `develop`**
- **Pull requests to `main` or `develop`**

### Workflow Jobs

1. **Unit Tests** - Run all unit tests, report coverage
2. **Integration Tests** - Run tests with database/Redis services
3. **E2E Tests** - Run Playwright tests, upload artifacts
4. **Type Check** - Verify TypeScript compilation
5. **Coverage Report** - Comment on PR with coverage metrics

View workflow status: `.github/workflows/test.yml`

## Test Strategy

### Coverage Target: 40%

Priority areas:
- ✅ Authentication & security (JWT, password validation, token blacklist)
- ✅ API client (requests, errors, headers, CSRF)
- ✅ Core services (world model, caching, database)
- ✅ Critical user flows (login, navigation, project discovery)

### Test Types

| Type | Scope | Tool | Count |
|------|-------|------|-------|
| Unit | Individual functions | Vitest | 30+ |
| Integration | Database, Redis, Firebase | Vitest + services | 10+ |
| E2E | Complete user journeys | Playwright | 5+ |

## Best Practices

1. **Test naming**: Use descriptive names that explain what is tested
   ```typescript
   it('should return 401 when token is expired', () => { ... });
   ```

2. **Single responsibility**: Each test should verify one behavior
   ```typescript
   // ❌ Bad: Tests too much
   it('should handle all auth scenarios', () => { ... });
   
   // ✅ Good: Tests one thing
   it('should reject expired token', () => { ... });
   ```

3. **No test interdependence**: Tests should run independently
   ```typescript
   // ✅ Good: Each test sets up its own data
   beforeEach(() => {
     user = createTestUser();
   });
   ```

4. **Mock external services**: Don't make real HTTP requests or DB calls in unit tests
   ```typescript
   // ✅ Good: Use MSW for HTTP mocking
   server.use(http.get('/api/data', () => { ... }));
   ```

5. **Test behavior, not implementation**: Verify outputs, not how they're computed
   ```typescript
   // ❌ Bad: Tests implementation detail
   expect(getUserById).toHaveBeenCalledWith(123);
   
   // ✅ Good: Tests behavior
   const user = await userService.get(123);
   expect(user.id).toBe(123);
   ```

## Troubleshooting

### Tests Timeout

Increase timeout:
```typescript
it('should do something slow', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Canvas/WebGL Errors

The canvas polyfill is automatically loaded via `vitest.config.ts`. If you see canvas errors:

1. Verify `client/test/canvas-polyfill.ts` exists
2. Check `client/test/setup.ts` calls `setupCanvasPolyfill()`
3. Verify vitest.config.ts includes both files in `setupFiles`

### MSW Not Intercepting

Ensure:
1. Test imports from `../mocks/server.ts` (not defining a new server)
2. Handler URL matches exactly (e.g., `/api/users` not `/api/users/`)
3. HTTP method matches (GET vs POST)

### Type Errors in Tests

Add types:
```typescript
import { User } from '@prisma/client';

const testUser: User = {
  id: 'test-123',
  email: 'test@example.com',
  // ... other required fields
};
```

## References

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Testing Library](https://testing-library.com/)
