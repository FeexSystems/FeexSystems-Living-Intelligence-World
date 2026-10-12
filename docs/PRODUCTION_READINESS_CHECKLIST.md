# FeexSystems Production Readiness Checklist

This checklist ensures the FeexSystems Living Intelligence Platform is ready for a production deployment, maintaining the canonical invariants and security standards.

## Status: 🟡 NEARLY READY — 1 release blocker open

Last verified: 2026-10-12 (local, commit `2328f07` + security/CI changes).

**Verified evidence** (reproduced via `npm run`):
- `npm run build` → exit 0 (client `dist/spa` + server `dist/server/node-build.mjs`).
- `npm run typecheck` → exit 0.
- `npm run lint` → 0 errors (877 warnings, CI threshold `--max-warnings 2000`).
- `npm run test:unit` → **1430 passed**, 88 skipped, 116 files passed.
- `npm audit --omit=dev` → **0 production vulnerabilities** (was 14 at the start of this pass).

**Open release blockers:**
1. 🔴 **Production deploy is not automated** — `.github/workflows/deploy.yml` triggers on `main` but all Cloud Run push/deploy steps are **commented out**; it only builds the Docker image. First production rollout is still a manual step.

**Resolved during this pass:**
- ✅ **Dependency vulnerabilities (production): 14 → 0.** Two-stage fix:
  - `npm audit fix` (non-breaking) cleared the critical `proxy-addr` plus `sharp`, `multer`, `fast-uri`, `brace-expansion`.
  - The 9 remaining were **unreachable upstream** — `@firebase/firestore@4.x` pins `@grpc/grpc-js: ~1.9.0` even at latest (4.18.0), and `uuid` is pulled at old majors by `bull`/`node-cron`/`gaxios`/`dockerode`. Resolved via package.json `overrides`: `@grpc/grpc-js@^1.14.6` (already proven in-tree elsewhere) and `uuid@^11.1.1` (direct dep bumped `^10`→`^11`; CJS `require()` + ESM `import` both verified on Node 22). Re-validated: typecheck, build, lint, 1430 tests all pass after the override.
  - **Reachability note:** the `uuid` advisory (`GHSA-w5hq-g745-h8pq`) only affects `v3/v5/v6` **with a buffer argument** — this app and every consumer (`bull`, `node-cron`, `dockerode`) call **only `v4()`**, so it was not exploitable here; it was flagged by version. The `@grpc/grpc-js` HIGH (auth-context certificate validation) **was** genuinely reachable and is now pinned to a patched version.
- ✅ Production smoke test (`pass10-production-smoke.yml`) now gated on `main` push + PR (was manual-dispatch only).
- ✅ Secrets hygiene: `.env` and `*service-account*.json` are gitignored; only `.env.production.template` is tracked.
- ✅ Non-blocking `validateEnv()` at boot with production guards (mock-auth forbidden, `SENTRY_DSN` + `ENCRYPTION_KEY` required).

**Known test-suite caveat:** `client/test/integration/password-reset-flow.test.tsx` intermittently emits an unhandled post-test `waitFor` timeout under full parallel load (suite exit 1) even though all 1430 assertions pass; it passes in isolation (12/12). Pre-existing flake, unrelated to dependency changes.

## 1. Infrastructure & Security 🔒
- [ ] **Environment Variables Audited:** No secrets logged. All keys in `.env` match `.env.example`. `validateEnv()` passes on boot (it `process.exit(1)` on any schema violation).
- [ ] **JWT Secrets:** `JWT_SECRET` and `JWT_REFRESH_SECRET` are each at least 32 characters and are not reused for any other secret.
- [ ] **Encryption Key:** `ENCRYPTION_KEY` is set (≥32 characters) — required in production for data encryption.
- [ ] **Error Tracking:** `SENTRY_DSN` is set — required in production.
- [ ] **Mock Auth Disabled:** `USE_MOCK_AUTH` is unset or `false` (forbidden in production; mock secrets must never be present).
- [ ] **Database Passwords & Connection Strings:** Use strong passwords for PostgreSQL and Redis. Ensure `DATABASE_URL` is correct.
- [ ] **CORS Configuration:** `CORS_ORIGIN` is explicitly set to the production domain (e.g., `https://feexsystems.codes`).
- [ ] **Rate Limiting:** Global rate limit (500/15min), Auth rate limit (20/15min on login, register, Google, sync-user, and password flows), and Hard Query rate limit (5/15min) active.
- [ ] **Security Headers:** Helmet enabled (with CSP/COEP disabled for WebGL support).
- [ ] **HTTPS Enforced:** 301 redirects to HTTPS are active.

## 2. World Model & Database 🧠
- [ ] **Database Migrations:** `npx prisma migrate deploy` executed successfully.
- [ ] **Indexes Validated:** `@@index` directives are present for high-traffic fields.
- [ ] **Redis Connection:** Background queues (Bull) and caches are connected.

## 3. Frontend & Build ⚡
- [ ] **Bundle Split:** Vendor chunking is correctly configured (`manualChunks`).
- [ ] **Lazy Loading:** Heavy routes (`/world`, `/admin`) are lazy-loaded via `React.lazy` and `<Suspense>`.
- [ ] **Asset Optimization:** WebGL assets and large images are compressed (WebP/optimized PNG).
- [ ] **Font Preloading:** Critical fonts have `<link rel="preload">` in `index.html`.
- [ ] **Build Command Success:** `npm run build` runs without errors (client & server).

## 4. Observability & Monitoring 📊
- [ ] **Health Checks:** `/health`, `/health/ready`, and `/health/metrics` are reachable by load balancers.
- [ ] **Structured Logging:** Winston is logging in JSON format. `NODE_ENV=production`.
- [ ] **APM / OpenTelemetry:** Tracing initialized successfully.

## 5. Deployment Process 🚀
- [ ] **Docker Multi-Stage Build:** `Dockerfile` is building correctly.
- [ ] **CI/CD Pipeline:** `.github/workflows/deploy.yml` passing (lint → typecheck → test → build).
- [ ] **Zero-Downtime Strategy:** Rolling updates configured in Cloud Run / Kubernetes.
