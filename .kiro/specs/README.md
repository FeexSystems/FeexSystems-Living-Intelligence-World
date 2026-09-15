# FeexSystems Specs Roadmap

## Phase 1: Critical Bugfixes ✅ COMPLETED

**Status**: All 4 critical blockers fixed and verified

**Specs**:
- `.kiro/specs/feexsystems-critical-blockages/`
  - `bugfix.md` — Requirements for all 4 bugs
  - `design.md` — Design approach and root causes
  - `tasks.md` — 34 executable tasks with verification

**Bugs Fixed**:
1. ✅ TypeScript TS2300 duplicate identifier (Bug 1)
2. ✅ Missing MarketingEvent metadata field (Bug 2)
3. ✅ Routing violations (/navigator, /evidence) (Bug 3)
4. ✅ Orphaned .js build artifacts (Bug 4)

**Impact**:
- CI/CD pipeline unblocked
- TypeScript compilation passes
- Database schema aligned
- Public World Model routes now accessible
- Repository cleaned

---

## Phase 2: Long-Term Infrastructure (NEXT)

### 2a. Test Infrastructure Enhancement
**Location**: `.kiro/specs/test-infrastructure-enhancement/`

**Focus**:
- Fix Vitest canvas/jsdom configuration (enable Three.js WebGL tests)
- Establish 20+ unit tests for auth, API client, services
- Add 5+ E2E tests with Playwright
- Set up GitHub Actions CI with test automation

**Goal**: Move from 0% to 40%+ test coverage

**Timeline**: 1-2 weeks

---

### 2b. OpenAPI CI/CD Integration
**Location**: `.kiro/specs/openapi-ci-cd-integration/`

**Focus**:
- Add pre-commit hook: `swagger-cli validate` on spec changes
- GitHub Actions validation on every PR
- Auto-generate JSON version from YAML
- Auto-publish TypeScript client to npm on release tags
- Contract testing: verify implementation matches spec

**Goal**: Spec becomes source of truth, enforced via CI

**Timeline**: 1 week

---

### 2c. TypeScript API Client Generation
**Location**: `.kiro/specs/typescript-api-client/`

**Focus**:
- Generate `@feexsystems/api-client` from OpenAPI spec
- Full TypeScript types (zero `any`)
- Frontend integration: 5+ components updated to use client
- Auto-regeneration on spec changes

**Goal**: Type-safe API client for frontend developers

**Timeline**: 3-5 days

---

### 2d. API Documentation Publishing
**Location**: `.kiro/specs/api-documentation-publishing/`

**Focus**:
- Deploy Redoc site to dev.feexsystems.codes
- Swagger UI for interactive testing
- Integration guide publishing (React, Next.js, Vue, Python, Go examples)
- Auto-deployment on main branch updates
- Analytics and SEO optimization

**Goal**: Professional, discoverable API documentation

**Timeline**: 1 week

---

## Execution Order

**Recommended sequence** (can be parallelized):

1. **Week 1**: Test Infrastructure (establish confidence)
   - Fix Vitest canvas config
   - Write auth/API client tests
   - Set up GitHub Actions CI

2. **Week 1-2** (parallel): OpenAPI CI/CD Integration
   - Pre-commit hook
   - GitHub Actions validation
   - Contract testing setup

3. **Week 2**: TypeScript Client Generation
   - Generate client from spec
   - Publish to npm
   - Integrate in frontend

4. **Week 2-3**: API Documentation Publishing
   - Deploy Redoc to dev domain
   - Set up Swagger UI
   - Add deployment automation

---

## Quick Status

| Phase | Status | Specs | Ready to Start? |
|-------|--------|-------|----------------|
| Phase 1: Bugfixes | ✅ COMPLETE | 3 files | N/A |
| Phase 2a: Tests | 📋 Ready | 1 file | ✅ YES |
| Phase 2b: CI/CD | 📋 Ready | 1 file | ✅ YES |
| Phase 2c: Client | 📋 Ready | 1 file | ✅ YES |
| Phase 2d: Docs | 📋 Ready | 1 file | ✅ YES |

---

## Next Action

Review and start with Phase 2. All requirement specs are ready to be converted to design docs and task breakdowns.

**Start here**:
```bash
cd .kiro/specs/test-infrastructure-enhancement/
# Or any of the other phase 2 specs
```

Each spec has detailed requirements ready for the feature-requirements-first-workflow to design and task-ify.

---

## Key Files

**Bugfix Completion**:
- `.kiro/specs/feexsystems-critical-blockages/tasks.md` — All verified ✅
- `client/lib/api-client.ts` — onError getter/setter added
- `client/App.tsx` — Routes now <Public>
- `prisma/schema.prisma` — metadata field present

**OpenAPI Documentation** (already published):
- `docs/openapi.3.0.yaml` — Main spec (1700+ lines) ⭐
- `docs/OPENAPI_README.md` — Quick start
- `docs/API_QUICK_REFERENCE.md` — Fast lookup
- `docs/OPENAPI_GUIDE.md` — Detailed guide
- `docs/INTEGRATION_GUIDE.md` — Framework examples
- `docs/INDEX.md` — Navigation

---

**Status**: Phase 1 ✅ Complete. Phase 2 📋 Ready to Begin.
