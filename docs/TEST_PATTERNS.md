# Test Patterns & Examples

This guide documents the canonical test patterns used in FeexSystems test infrastructure.

## Unit Test Pattern (AAA - Arrange, Act, Assert)

The AAA pattern structures tests into three phases:

### Pattern Definition

```typescript
describe('Feature Under Test', () => {
  it('should produce expected behavior', () => {
    // ARRANGE: Set up test conditions
    const input = prepareTestData();
    const expected = 'expected result';
    
    // ACT: Execute the code being tested
    const actual = functionUnderTest(input);
    
    // ASSERT: Verify the result matches expectations
    expect(actual).toBe(expected);
  });
});
```

### Pattern Example: API Client

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { apiClient } from '@/lib/api-client';
import { server } from '../mocks/server';

describe('ApiClient.get', () => {
  beforeEach(() => {
    // Setup: Initialize client with test configuration
    apiClient.initialize(() => Promise.resolve('test-token'));
  });

  it('should fetch and return JSON data', async () => {
    // ARRANGE
    const expectedData = {
      id: 'project-1',
      name: 'Test Project',
      description: 'A test project'
    };
    
    // Note: MSW server is pre-configured with handlers
    // The /api/world-model/projects handler returns this data by default

    // ACT
    const result = await apiClient.get('/world-model/projects');

    // ASSERT
    expect(result).toBeDefined();
    expect((result as any).projects).toBeInstanceOf(Array);
  });

  it('should reject request on 401 Unauthorized', async () => {
    // ARRANGE
    server.use(
      http.get('/api/protected', () => {
        return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
      })
    );

    // ACT & ASSERT
    try {
      await apiClient.get('/protected');
      expect.fail('Should have thrown error');
    } catch (error) {
      expect(error).toBeDefined();
      expect((error as any).status).toBe(401);
    }
  });

  it('should include Authorization header when token present', async () => {
    // ARRANGE
    const testToken = 'test-access-token-xyz';
    apiClient.initialize(() => Promise.resolve(testToken));

    let capturedHeader = '';
    server.use(
      http.get('/api/secure-endpoint', ({ request }) => {
        capturedHeader = request.headers.get('Authorization') || '';
        return HttpResponse.json({ data: 'secure' });
      })
    );

    // ACT
    await apiClient.get('/secure-endpoint', { requireAuth: true });

    // ASSERT
    expect(capturedHeader).toBe(`Bearer ${testToken}`);
  });
});
```

### Key Properties

- **Clarity**: Each phase is distinct and easy to understand
- **Isolation**: Tests don't depend on previous test state
- **Single Concern**: Each test verifies one behavior
- **Readability**: Comments mark each phase for clarity

---

## Mock Fixture Pattern

The fixture pattern creates reusable test data that's consistent across tests.

### Pattern Definition

```typescript
interface Fixture<T> {
  // Factory function creates fresh instance
  create: (overrides?: Partial<T>) => T;
}

// Usage
const fixture = {
  create: (overrides?: Partial<User>): User => ({
    id: 'user-123',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

// In test
const user = fixture.create({ email: 'custom@example.com' });
```

### Pattern Example: Database Fixtures

```typescript
// File: server/test/fixtures/auth-user.ts

import { User } from '@prisma/client';
import bcryptjs from 'bcryptjs';

export async function createTestUser(
  overrides?: Partial<User>
): Promise<User> {
  const passwordHash = await bcryptjs.hash('TestPassword123!', 10);

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

export async function createAdminUser(
  overrides?: Partial<User>
): Promise<User> {
  return createTestUser({ role: 'admin', ...overrides });
}
```

### Pattern Example: Using Fixtures in Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestUser, createAdminUser } from '../fixtures/auth-user';

describe('User Authorization', () => {
  let testUser: User;
  let adminUser: User;

  beforeEach(async () => {
    // Create fresh fixtures for each test
    testUser = await createTestUser();
    adminUser = await createAdminUser();
  });

  it('should grant admin access to admin users', () => {
    // Use fixture directly
    expect(adminUser.role).toBe('admin');
    expect(canAccessAdminPanel(adminUser)).toBe(true);
  });

  it('should deny admin access to regular users', () => {
    expect(testUser.role).toBe('user');
    expect(canAccessAdminPanel(testUser)).toBe(false);
  });

  it('should customize fixture data', async () => {
    // Override fixture properties
    const powerUser = await createTestUser({
      email: 'power@feex.local',
      role: 'power_user',
    });

    expect(powerUser.email).toBe('power@feex.local');
    expect(powerUser.role).toBe('power_user');
  });

  it('should create multiple fixtures', async () => {
    // Generate multiple test users
    const users = await Promise.all([
      createTestUser({ email: 'user1@feex.local' }),
      createTestUser({ email: 'user2@feex.local' }),
      createTestUser({ email: 'user3@feex.local' }),
    ]);

    expect(users).toHaveLength(3);
    expect(users[0].email).toBe('user1@feex.local');
    expect(users[1].email).toBe('user2@feex.local');
    expect(users[2].email).toBe('user3@feex.local');
  });
});
```

### Key Properties

- **Reusability**: Fixtures used across many tests
- **Consistency**: Same test data structure everywhere
- **Flexibility**: Partial overrides customize for specific tests
- **Maintainability**: Update fixture definition once, all tests benefit

---

## MSW Handler Pattern (HTTP Mocking)

The MSW (Mock Service Worker) pattern intercepts HTTP requests for testing.

### Pattern Definition

```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Define handlers
export const handlers = [
  http.get('/api/resource', () => {
    return HttpResponse.json({ data: 'default response' });
  }),
];

// Setup server with handlers
export const server = setupServer(...handlers);

// Lifecycle (in setup.ts)
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Pattern Example: Auth Handlers

```typescript
// File: client/test/mocks/handlers.ts

import { http, HttpResponse } from 'msw';

export const handlers = [
  // Success case
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    
    if (body.email === 'invalid@example.com') {
      return HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      accessToken: 'mock-access-token-12345',
      refreshToken: 'mock-refresh-token-67890',
      user: { id: 'user-1', email: body.email, role: 'user' }
    });
  }),

  // Protected endpoint
  http.get('/api/protected', ({ request }) => {
    const auth = request.headers.get('Authorization');
    
    if (!auth?.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return HttpResponse.json({ data: 'protected data' });
  }),

  // Refresh token endpoint
  http.post('/api/auth/refresh', async ({ request }) => {
    const body = await request.json() as { refreshToken: string };

    if (body.refreshToken === 'invalid-token') {
      return HttpResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      accessToken: 'new-access-token-xyz'
    });
  }),
];

export const errorHandlers = {
  // Override specific handler for error testing
  server500: http.get('/api/data', () => {
    return HttpResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }),

  timeout: http.get('/api/slow', async () => {
    await new Promise(resolve => setTimeout(resolve, 35000));
    return HttpResponse.json({ data: 'never reached' });
  }),
};
```

### Pattern Example: Using MSW in Tests

```typescript
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { apiClient } from '@/lib/api-client';

describe('Authentication Flow with MSW', () => {
  it('should successfully login', async () => {
    // Arrange: MSW server uses default handlers (success case)
    
    // Act
    const result = await apiClient.post('/auth/login', {
      email: 'user@example.com',
      password: 'password123'
    });

    // Assert
    expect((result as any).accessToken).toBeDefined();
    expect((result as any).user.email).toBe('user@example.com');
  });

  it('should reject invalid credentials', async () => {
    // Arrange: MSW handler returns 401 for specific email
    
    // Act & Assert
    try {
      await apiClient.post('/auth/login', {
        email: 'invalid@example.com',
        password: 'anything'
      });
      expect.fail('Should have thrown');
    } catch (error) {
      expect((error as any).status).toBe(401);
    }
  });

  it('should require auth token for protected endpoint', async () => {
    // Arrange: Override handler to always deny in this test
    server.use(
      http.get('/api/protected', () => {
        return HttpResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      })
    );

    // Act & Assert
    try {
      await apiClient.get('/protected');
      expect.fail('Should have thrown');
    } catch (error) {
      expect((error as any).status).toBe(401);
    }
  });

  it('should handle server errors', async () => {
    // Arrange: Use error handler override
    server.use(
      http.get('/api/failing', () => {
        return HttpResponse.json(
          { error: 'Server error occurred' },
          { status: 500 }
        );
      })
    );

    // Act & Assert
    try {
      await apiClient.get('/failing');
      expect.fail('Should have thrown');
    } catch (error) {
      expect((error as any).status).toBe(500);
    }
  });

  it('should attach CSRF token to state-mutating requests', async () => {
    // Arrange: Mock CSRF token
    const csrfToken = 'csrf-token-xyz';
    const metaTag = document.createElement('meta');
    metaTag.name = 'csrf-token';
    metaTag.content = csrfToken;
    document.head.appendChild(metaTag);

    let capturedCSRFToken = '';
    server.use(
      http.post('/api/data', ({ request }) => {
        capturedCSRFToken = request.headers.get('X-CSRF-Token') || '';
        return HttpResponse.json({ success: true });
      })
    );

    // Act
    await apiClient.post('/data', { test: 'value' });

    // Assert
    expect(capturedCSRFToken).toBe(csrfToken);

    // Cleanup
    document.head.removeChild(metaTag);
  });
});
```

### Key Properties

- **Transparent**: Intercepts real fetch calls without code changes
- **Flexible**: Override handlers per-test
- **Type-safe**: Full TypeScript support
- **Realistic**: Tests behavior as if hitting real API

---

## E2E Page Object Pattern (Playwright)

The page object pattern encapsulates UI interactions and selectors.

### Pattern Definition

```typescript
import { Page, expect } from '@playwright/test';

export class PageObject {
  constructor(protected page: Page) {}

  // Navigation
  async goto(path: string) {
    await this.page.goto(`${process.env.BASE_URL || 'http://localhost:3000'}${path}`);
  }

  // Interactions (return this for chaining)
  async fillForm(data: Record<string, string>) {
    for (const [name, value] of Object.entries(data)) {
      await this.page.fill(`input[name="${name}"]`, value);
    }
    return this;
  }

  // Assertions
  async expectToBeVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  // Helpers
  protected async waitForNavigation(action: () => Promise<void>) {
    await Promise.all([
      this.page.waitForNavigation(),
      action()
    ]);
  }
}
```

### Pattern Example: Login Page

```typescript
// File: e2e/pages/LoginPage.ts

import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('http://localhost:3000/login');
    await this.page.waitForLoadState('networkidle');
  }

  async fillEmail(email: string) {
    await this.page.fill('input[name="email"]', email);
  }

  async fillPassword(password: string) {
    await this.page.fill('input[name="password"]', password);
  }

  async clickLoginButton() {
    await this.page.click('button:has-text("Login")');
  }

  async fillAndSubmit(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLoginButton();
  }

  async assertErrorMessage(message: string) {
    const alert = this.page.locator('[role="alert"]');
    await expect(alert).toContainText(message);
  }

  async assertSuccessfulLogin() {
    await this.page.waitForURL('**/dashboard');
    await expect(this.page).toHaveURL(/.*dashboard/);
  }

  async isEmailErrorVisible() {
    const error = this.page.locator('text=Invalid email');
    return await error.isVisible();
  }
}
```

### Pattern Example: Using Page Objects

```typescript
// File: e2e/auth.spec.ts

import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Authentication', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should login successfully', async () => {
    // Arrange: Page object hides implementation
    
    // Act: Use high-level interactions
    await loginPage.fillAndSubmit('user@example.com', 'password123');

    // Assert: Page object provides assertion helpers
    await loginPage.assertSuccessfulLogin();
  });

  test('should show error for invalid email', async () => {
    // Act
    await loginPage.fillEmail('invalid-email');
    await loginPage.fillPassword('password123');
    await loginPage.clickLoginButton();

    // Assert
    const isErrorVisible = await loginPage.isEmailErrorVisible();
    expect(isErrorVisible).toBe(true);
  });

  test('should show error for invalid credentials', async () => {
    // Act
    await loginPage.fillAndSubmit('invalid@example.com', 'wrongpassword');

    // Assert
    await loginPage.assertErrorMessage('Invalid credentials');
  });

  test('should navigate to signup from login', async ({ page }) => {
    // Act
    await page.click('a:has-text("Sign up")');

    // Assert
    await expect(page).toHaveURL(/.*signup/);
  });
});
```

### Key Properties

- **Maintainability**: Selectors in one place, tests don't break when UI changes
- **Readability**: Test code reads like user actions
- **Reusability**: Page objects shared across multiple tests
- **Abstraction**: Implementation details hidden from tests

---

## Patterns Summary

| Pattern | Purpose | Use When |
|---------|---------|----------|
| AAA (Arrange-Act-Assert) | Structure unit tests | Testing functions, methods |
| Mock Fixture | Reusable test data | Setting up test state consistently |
| MSW Handler | Mock HTTP requests | Testing API interactions |
| Page Object | Encapsulate UI interactions | Writing E2E tests |

## References

- [Vitest Guide](https://vitest.dev/guide/)
- [MSW - Mock Service Worker](https://mswjs.io/docs)
- [Playwright Page Object Model](https://playwright.dev/docs/pom)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
