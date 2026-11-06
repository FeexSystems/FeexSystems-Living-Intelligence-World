# Architecture Review — FeexSystems Living Intelligence World

**Date**: 2026-11-05
**Scope**: Full-stack monolith (React 18 SPA + Express 5 + PostgreSQL/Prisma + Redis)
**Reviewer**: iCline (automated architecture review)

---

## 1. Executive Summary

FeexSystems is a large, feature-rich monolith that has grown organically through 5 "missions" (AI Operations, Workflow Lifecycle, World Model Interpretations, RentAll SmartOps, Knowledge/Farm AI). The codebase demonstrates strong domain understanding and evidence-first design principles, but suffers from **monolithic coupling**, **missing module boundaries**, and **scalability constraints** typical of rapidly-evolved SaaS platforms. The recent full-spectrum audit (C+ grade) identified test coverage at 42% and integration gaps.

**Overall Architecture Grade: C+**

| Dimension | Grade | Key Issue |
|-----------|-------|-----------|
| Module Boundaries | D | No module system; flat service directory with 100+ files |
| Coupling | C- | Direct service-to-service imports; god services |
| Layering | D+ | No repository pattern; business logic in routes; mixed concerns |
| Scalability | C | Single-process; in-memory WebSocket state; no horizontal scaling path |
| Maintainability | C | Compiled `.js` committed; 1500-line Prisma schema; mixed patterns |
| Testability | D | 42% coverage; no DI; hard-to-mock singletons |

---

## 2. System Overview

### 2.1 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + React Router 7 + TypeScript + Vite 7 + TailwindCSS 4 + Three.js (@react-three/fiber) |
| Backend | Express 5 + TypeScript (ESM) |
| Database | PostgreSQL 15+ via Prisma ORM |
| Cache/Queue | Redis (ioredis) + Bull |
| Auth | Firebase Auth (client) + JWT (server) |
| AI | Provider-neutral adapters (Gemini, Anthropic, OpenAI) |
| Vector Search | pgvector (raw SQL) |
| Observability | OpenTelemetry + Prometheus + Sentry |
| Deployment | Firebase Hosting + Cloud Functions + Docker |

### 2.2 Application Shape

```
Browser (React SPA) -- Vite build --> dist/spa
  Public routes: /, /projects, /navigator, /world, /evidence
  Auth routes: /login, /register (guest-only)
  Protected: /dashboard/*, /admin/*, /operations, /rental
         |
         | HTTP / WebSocket
         v
Express 5 Server (single process)
  Middleware: CORS, Helmet, compression, auth, rate-limit
  30+ route files (world-model, ai, devops, security, ...)
  100+ service files (flat directory)
  WebSocket: deployment, telemetry, security, team, AI
  Bull queues: embedding, security-scan, AI requests
         |
         v
PostgreSQL (Prisma) + Redis + External APIs
  50+ Prisma models (5 missions)
  pgvector embeddings (raw SQL)
  Redis (cache + Bull queues)
  GitHub, OpenAI, Gemini, Anthropic, Firebase, Paystack
```

---

## 3. Module Boundaries

### 3.1 Current State: No Module System

The codebase has **no enforced module boundaries**. All server-side code lives in a flat structure:

```
server/
  lib/
    services/          # 100+ files -- all domains mixed
      ai.service.ts
      ai-gateway.service.ts
      ai-provider.service.ts
      ai-queue.service.ts
      ai-registry.service.ts
      ai-request.service.ts
      ai-websocket.service.ts
      analytics.service.ts
      billing.service.ts
      cache.service.ts
      embedding.service.ts
      github-pinned.service.ts   # GOD SERVICE (~3000+ lines)
      hybrid-retrieval.service.ts
      omni-command.service.ts
      rental.service.ts
      security.service.ts
      ... (90 more)
      bigquery/                  # Subdirectory (inconsistent)
      git-providers/             # Subdirectory (inconsistent)
    middleware/        # Auth, tenant, rate-limiting
    tenant/            # Tenant context
    types/             # Shared types
    validations/       # Zod schemas
    world-model/       # World model sync/retrieve (inconsistent location)
    config/            # Environment validation
    logging/           # Sentry, Winston
    monitoring/        # OpenTelemetry
    marketing/         # Marketing content OS
    docs/              # Swagger
  routes/                # 30+ route files
  test/                  # Test helpers, fixtures, integration
  index.ts               # Monolithic entry point (365 lines)
```

**Problems:**
1. **No domain modules**: Services for AI, World Model, Security, Rental, Marketing, DevOps, Billing are all siblings in one directory. There is no `modules/ai/`, `modules/world-model/` structure.
2. **Inconsistent subdirectories**: `bigquery/` and `git-providers/` are subdirectories, but `world-model/` is at `lib/world-model/` (not under services). `marketing/` is at `lib/marketing/`. No consistent convention.
3. **No public API per module**: Routes import services directly by file path. There is no `index.ts` barrel per domain.
4. **God services**: `github-pinned.service.ts` handles project sync, graph building, evidence retrieval, webhook processing, and commit verification. It is likely 3000+ lines.

### 3.2 Recommended Module Structure

```
server/
  modules/
    world-model/
      domain/           # Entities, value objects
      application/      # Use cases (sync, navigate, evidence)
      infrastructure/   # Prisma repos, GitHub client, pgvector
      presentation/     # Route handlers, DTOs
      index.ts          # Public API
    ai/
      domain/
      application/
      infrastructure/
      index.ts
    security/
    rental/
    marketing/
    devops/
    billing/
    auth/
  shared/
    kernel/               # Cross-cutting: logging, config, middleware
    database/             # Prisma client, migrations
    cache/                # Redis client
  index.ts                  # Composition root
```

---

## 4. Coupling Analysis

### 4.1 Direct Service-to-Service Imports (Tight Coupling)

Services import each other directly without interfaces:

```typescript
// ai.service.ts (AIServiceManager)
import { aiServiceRegistry } from './ai-registry.service';
import { aiRequestService } from './ai-request.service';
import { aiQueueService } from './ai-queue.service';
```

This creates a **spider web** of dependencies. Changing any service's internal API ripples through all dependents.

### 4.2 God Service: `github-pinned.service.ts`

This single file is imported by:
- `server/routes/world-model.ts` (12 named imports)
- `server/index.ts` (syncPinnedProjects)
- `server/lib/services/webhook-provisioning.service.ts`
- `server/lib/services/world-model-maintenance.service.ts`
- `server/lib/services/hybrid-retrieval.service.ts`

It handles: project sync, graph building, evidence retrieval, webhook processing, commit verification, artifact content fetching. This is a **Single Responsibility Principle violation** and a **change hotspot**.

### 4.3 Circular Dependency Risk

The following cluster forms a potential cycle:
- `ai.service.ts` -> `ai-queue.service.ts` -> (triggers reindex) -> `embedding.service.ts` -> `github-pinned.service.ts` -> `hybrid-retrieval.service.ts` -> `ai.service.ts`

The `SERVICE_DEPENDENCY_MAP.md` claims "NO circular dependencies detected" but this is based on static analysis of imports, not runtime call graphs. The actual call graph likely has cycles.

### 4.4 Route-Level Coupling

Routes directly instantiate and call services:

```typescript
// server/routes/world-model.ts
import { getPinnedWorldModelProjects, getWorldModelGraph, getProjectEvidence, ... } from "../lib/services/github-pinned.service";
import { retrieveWorldHybrid } from "../lib/services/hybrid-retrieval.service";
import { reindexWorldModelEmbeddings, ensureEmbeddingTables } from "../lib/services/embedding.service";
// ... 8 more imports
```

There is **no facade/gateway layer** despite the AGENTS.md mentioning one. The `server/lib/gateway/` directory contains only an empty 0-byte file.

### 4.5 Shared State via Singletons

Most services are exported as singleton instances:

```typescript
export const aiService = new AIServiceManager();
export const securityService = new SecurityService();
```

This makes **unit testing impossible** without module mocking, and prevents **horizontal scaling** (state is per-process).

---

## 5. Layering

### 5.1 Current Layers (Implicit)

| Layer | Location | Concerns |
|-------|----------|----------|
| Presentation | `server/routes/*.ts` | HTTP handling, validation, response formatting |
| Business Logic | `server/lib/services/*.ts` | Domain logic, orchestration, external API calls |
| Data Access | Scattered in services | Prisma queries, raw SQL, Redis calls |
| Infrastructure | `server/lib/database.ts`, `redis.ts` | Client initialization |

### 5.2 Layering Violations

1. **Routes contain business logic**: Route handlers call multiple services, orchestrate workflows, and format responses. Example: `world-model.ts` route for `/evidence/verify` calls `verifyRepositoryCommit` directly.

2. **No repository pattern**: Prisma queries are scattered across service files. `embedding.service.ts` uses `$queryRawUnsafe` directly. `github-pinned.service.ts` likely contains hundreds of Prisma calls.

3. **Services mix concerns**: A single service file handles:
   - Database access (Prisma)
   - External API calls (GitHub, OpenAI)
   - Business logic (validation, transformation)
   - Caching (Redis)
   - WebSocket broadcasting

4. **No DTO layer**: Request/response shapes are defined inline in route handlers, not as shared DTOs.

5. **Domain models are Prisma models**: The domain layer is confluent with the data layer. There is no separation between "WorldModelProject" (domain entity) and the Prisma `WorldModelProject` (persistence model).

### 5.3 Recommended Layering

```
Presentation Layer (routes, controllers)
    |
    v
Application Layer (use cases, orchestration, DTOs)
    |
    v
Domain Layer (entities, value objects, domain services, interfaces)
    |
    v
Infrastructure Layer (Prisma repos, HTTP clients, Redis, queues)
```

Each module should implement this layered architecture independently.

---

## 6. Scalability Risks

### 6.1 Single-Process Monolith

- The entire backend runs in a single Node.js process (`startServer()` in `index.ts`).
- WebSocket state (deployment, telemetry, security, team, AI) is held **in-memory** per process.
- **Cannot horizontally scale** without sticky sessions and shared state.

### 6.2 Database Access Patterns

| Risk | Location | Impact |
|------|----------|--------|
| N+1 queries | `github-pinned.service.ts` (graph building) | High latency on large graphs |
| No pagination | Many `findMany()` without `take`/`skip` | Memory exhaustion |
| Raw SQL | `embedding.service.ts` (`$queryRawUnsafe`) | SQL injection risk, no type safety |
| No connection pooling config | `database.ts` | Connection exhaustion under load |
| Sequential processing | `embedding.service.ts` (200 rows, 100ms delay) | Slow reindex (20+ seconds) |

### 6.3 Caching

- Redis is used for Bull queues and some caching, but **no systematic caching strategy**.
- No CDN for static assets (Firebase Hosting provides this, but API responses are uncached).
- No query result caching (e.g., world model graph is rebuilt on every request).

### 6.4 AI Provider Concurrency

- No circuit breakers exist in the current codebase.
- AI calls are made directly without concurrency limits.
- **Risk**: Burst traffic can overwhelm AI providers, causing cascading failures.

### 6.5 Embedding Reindex

- `reindexWorldModelEmbeddings()` processes 200 rows with 100ms delays between batches.
- Full reindex takes ~20+ seconds.
- No incremental reindex triggered on sync.

### 6.6 Frontend Bundle

- Manual chunk splitting exists in `vite.config.ts` (react-vendor, three-vendor, r3f-vendor, ui-vendor, query-vendor).
- But 30+ lazy-loaded routes still share large common chunks.
- Three.js (~600KB) is loaded even on non-3D pages via shared chunks.
- No bundle size budget enforcement (size-limit configured but not in CI).

---

## 7. Maintenance Risks

### 7.1 Compiled JavaScript Committed

Every `.ts` file has a corresponding `.js` file committed to the repository:

```
server/lib/services/ai.service.js
server/lib/services/ai.service.ts
```

This is **57 modified files** in the current git status, most of which are `.js`/`.ts` pairs. This:
- Doubles the repository size
- Creates merge conflicts on every change
- Confuses tooling (which file is canonical?)
- Violates the principle that build artifacts should not be committed

**Recommendation**: Remove all `.js` files from `server/` and `shared/`. Add to `.gitignore`. Build via `npm run build:server`.

### 7.2 Monolithic Prisma Schema

The `prisma/schema.prisma` is **1558 lines** with 50+ models spanning 5 different product domains. This:
- Makes migrations risky (one schema change affects everything)
- Slows down Prisma client generation
- Makes it hard to understand domain boundaries

**Recommendation**: Split into domain-specific schemas using Prisma's multi-schema support (PostgreSQL schemas) or separate databases per bounded context.

### 7.3 Mixed Patterns

| Pattern | Usage | Consistency |
|---------|-------|-------------|
| Class-based services | `AIServiceManager`, `ServiceFactory` | Some |
| Function-based services | `embedding.service.ts`, `github-pinned.service.ts` | Most |
| Singleton instances | `export const aiService = new ...()` | Most |
| Static factory classes | `GitProviderFactory` | Some |
| Dependency injection | `ServiceFactory` (only User/Auth) | Minimal |

No consistent pattern. New developers must learn 4 different service patterns.

### 7.4 Hardcoded Configuration

- Model names hardcoded: `text-embedding-3-small`, `text-embedding-004`
- API endpoints hardcoded: `https://api.openai.com/v1/embeddings`
- Magic numbers: `take: 100`, `batchSize: 10`, `delay: 100ms`
- These should be in configuration/environment.

### 7.5 No API Versioning

- All routes are `/api/...` with no version prefix.
- Breaking changes to API contracts affect all clients simultaneously.
- No deprecation strategy.

### 7.6 Test Coverage

Per the full-spectrum audit:
- **Overall: 42/100** (F grade)
- Unit tests: ~55% adequate for model CRUD
- Integration tests: ~25% — major gap
- E2E tests: ~15% — critical gaps
- Type coverage: ~80% (Prisma schemas well-typed)

**Missing test suites:**
- Enquiry lifecycle (submit -> draft -> approve -> complete)
- Workflow step input/output JSON schema validation
- Interpretation claim proof verification
- Full rental lifecycle
- Knowledge processing pipeline
- Cross-product integration tests
- Rate limiting and spam prevention
- Idempotency key collision handling
- Tenant isolation across product boundaries

### 7.7 Security Concerns (from audit)

1. **Tenant isolation**: Middleware exists (`tenant-key.middleware.ts`) but enforcement across all routes is inconsistent.
2. **Rate limiting**: Applied to some routes (`hardQueryRateLimiter`) but not all.
3. **Input validation**: Zod schemas exist but coverage is incomplete.
4. **Raw SQL**: `$queryRawUnsafe` in embedding service — potential SQL injection if inputs aren't sanitized.
5. **Secrets**: `.env` files present in repo (should be gitignored, but `.env` is tracked).

---

## 8. Dependency Health

### 8.1 Outdated Packages (87 packages)

Per `DEPENDENCY_AUDIT_REPORT.md`:
- **Critical**: `zod` v3 -> v4 (memory exhaustion vulnerability)
- **Critical**: `undici` upgrade needed
- **Major**: React 18 -> 19, Vite 6 -> 8, TypeScript 5 -> 7
- **Major**: Three.js r176 -> r177+ (breaking API changes)
- **Major**: ESLint 9 -> 10 (flat config migration)

### 8.2 Unused Dependencies

- `prisma-mock` / `prismock` — may not be in test workflow
- `basic-ftp` — FTP may not be a product feature
- `@joshwooding/vite-plugin-react-docgen-typescript` — docgen may not be used

### 8.3 Duplicate Lock Files

Both `package-lock.json` (npm) and `pnpm-lock.yaml` (pnpm) exist. This can cause dependency resolution inconsistencies.

---

## 9. Recommendations

### 9.1 Immediate (This Sprint)

1. **Remove committed `.js` files** from `server/` and `shared/`. Add to `.gitignore`.
2. **Fix zod vulnerability** — upgrade to v4.6.6+.
3. **Add concurrency control** to AI service calls (circuit breakers, semaphores).
4. **Implement incremental embedding reindex** triggered on world-model sync.
5. **Add tenant isolation middleware** to all API routes.
6. **Remove duplicate lock file** — choose npm or pnpm.

### 9.2 Short-Term (2-3 Sprints)

1. **Create module boundaries**: Restructure `server/lib/services/` into domain modules.
2. **Extract god services**: Split `github-pinned.service.ts` into sync, graph, evidence, webhook modules.
3. **Implement repository pattern**: Move Prisma queries into repository classes per domain.
4. **Add API versioning**: Prefix all routes with `/api/v1/`.
5. **Create gateway/facade layer**: Decouple routes from services (the `server/lib/gateway/` was intended for this).
6. **Add integration tests**: Focus on the 5 product lifecycles.
7. **Extract hardcoded config**: Move model names, endpoints, magic numbers to environment.

### 9.3 Medium-Term (1-2 Months)

1. **Split Prisma schema**: Use PostgreSQL schemas or separate databases per bounded context.
2. **Implement dependency injection**: Replace singletons with injectable services for testability.
3. **Add horizontal scaling path**: Move WebSocket state to Redis (pub/sub). Use sticky sessions or stateless design.
4. **Add query caching**: Redis cache for world model graph, project lists.
5. **Optimize database queries**: Add indexes, fix N+1, implement cursor pagination everywhere.
6. **Frontend bundle optimization**: Route-based code splitting, lazy-load Three.js only on 3D pages.

### 9.4 Long-Term (Quarterly)

1. **Consider service extraction**: Extract high-traffic domains (AI, World Model) into separate services.
2. **Implement CQRS**: Separate read models (graph, search) from write models (sync, evidence).
3. **Add event sourcing**: For World Model state changes (already partially implemented with `WorldModelEvent`).
4. **Establish dependency update cadence**: Monthly minor, quarterly major.
5. **Set up automated security scanning**: Dependabot, Snyk, or similar.

---

## 10. Architecture Decision Records (Recommended)

The following ADRs should be created to document key decisions:

1. **ADR-001**: Monolith vs. Microservices (current: monolith, recommended: modular monolith first)
2. **ADR-002**: Database per bounded context vs. shared schema (current: shared schema)
3. **ADR-003**: WebSocket state management (current: in-memory, recommended: Redis pub/sub)
4. **ADR-004**: API versioning strategy (current: none, recommended: /api/v1/)
5. **ADR-005**: Service pattern (current: mixed, recommended: class-based with DI)
6. **ADR-006**: Compiled artifact policy (current: committed .js, recommended: gitignored)

---

## 11. Conclusion

FeexSystems has a strong domain model and clear product vision, but the architecture has not kept pace with feature growth. The codebase is at a **critical inflection point**: continuing to add features without addressing module boundaries, coupling, and test coverage will lead to **exponential maintenance costs**.

The most impactful immediate actions are:
1. Remove committed build artifacts (reduces noise by 50%)
2. Fix the zod security vulnerability
3. Add concurrency control to AI calls (prevents production incidents)
4. Create module boundaries (enables parallel development)

The full-spectrum audit's C+ grade is accurate. With focused effort on the recommendations above, the architecture could reach B+ within 2-3 sprints.

---

*This review was generated by iCline based on codebase analysis. For questions or clarifications, refer to the specific sections above.*
