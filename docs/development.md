# Developer Guide

Welcome to the FeexSystems development guide. This document covers setting up your local environment, running the system, and writing code that complies with the platform's architectural invariants.

## 1. Local Environment Setup

### Prerequisites
- **Node.js**: v20.x or v22.x LTS
- **Package Manager**: npm 10+
- **Database**: PostgreSQL 15+ (with `pgvector` extension)
- **Cache / Messaging**: Redis 7+

### Initializing the Project

1. **Clone and Install**
   ```bash
   git clone https://github.com/FeexSystems/FeexSystems-Living-Intelligence-World.git
   cd FeexSystems-Living-Intelligence-World
   npm install
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env
   ```
   **Required Configuration**:
   - `DATABASE_URL`: Connection string to your local PostgreSQL instance (e.g., `postgresql://user:pass@localhost:5432/feexsystems`).
   - `REDIS_URL`: Connection string to your local Redis instance (e.g., `redis://localhost:6379`).
   - `SESSION_SECRET`: A secure random string for session signing.
   - `GEMINI_API_KEY`: API key for Gemini model integrations.
   - `PAYSTACK_SECRET_KEY`: (Optional for basic dev) Paystack test secret key for billing features.
   - `USE_MOCK_AUTH`: (Optional) Set to `true` to bypass Firebase Auth for local UI testing.

3. **Database Initialization**
   The database requires `pgvector` for semantic search.
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Apply migrations and seed the database
   npm run db:init
   ```

## 2. Running the System

Start the integrated Vite and Express development server:
```bash
npm run dev
```

The system will start simultaneously:
- **Frontend**: Vite HMR server on `http://localhost:5173` (proxied via Express)
- **Backend**: Express API on `http://localhost:8080`

### Key Endpoints
- **Application**: `http://localhost:8080`
- **Spatial World**: `http://localhost:8080/world`
- **Health Check**: `http://localhost:8080/health/ready`
- **Swagger Docs**: `http://localhost:8080/api/docs`

## 3. Testing Workflow

FeexSystems relies on `vitest` for fast unit and integration tests.

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Testing Principles
- **Mocking**: We use Vitest's `vi.mock()` for external services (Redis, Gemini, Paystack, Database). When mocking modules that export custom errors, always use `importOriginal` to preserve error classes (e.g., `AuthError`).
- **Database Independence**: Tests must not hang if the live database is unavailable. Mock database interactions in service tests.

## 4. Development Standards

1. **Provider-Neutral Models**: Do not hardcode OpenAI or Gemini SDKs directly in route controllers. Use the `aiService` adapter.
2. **Non-Blocking Init**: Services like Redis and the Database must connect asynchronously. Never `await` a connection at the top level of a file in a way that blocks the Express server from listening.
3. **Shared Database Client**: Import the canonical `prisma` (or `db`) instance from `server/lib/database.ts` instead of constructing `new PrismaClient()` inside services or middleware. The shared module guards against duplicate connections in development via `globalThis.__prisma` and centralizes `$connect`/`$disconnect` and health checks. Services that accept a Prisma client as a constructor parameter should default to the shared import (e.g. `new SomeService(prisma)`), mirroring the marketing navigator pattern, so tests can inject a mock. Direct `new PrismaClient()` calls should only appear in standalone seed scripts and test harnesses.
4. **Canonical State**: The frontend is a projection. Mutations must occur via the backend API and be stored in the World Model.
