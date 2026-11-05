# Dependency Audit Report
## FeexSystems-Living-Intelligence-World

**Generated**: 2024-11-04
**Scope**: Root `package.json` dependencies (excluding `node_modules` nested packages)

---

## 1. Outdated Packages

There are **87 packages** with newer versions available. Below is the prioritized upgrade list, grouped by risk level.

### High-Priority Updates (Security & Bug Fixes)

| Package | Current | Latest | Risk | Notes |
|---------|---------|--------|------|-------|
| `@opentelemetry/api` | 1.9.1 | 1.10.0 | ⚠️ Minor | API changes; compatible with SDK 2.x |
| `@opentelemetry/resources` | 2.11.0 | 3.0.0 | ⚠️ Major | Breaking changes in resource detection |
| `@opentelemetry/sdk-trace-node` | 2.11.0 | 2.12.0 | ✅ Safe | Patch-only update |
| `@opentelemetry/sdk-trace-base` | 2.11.0 | 2.12.0 | ✅ Safe | Patch-only update |
| `@opentelemetry/semantic-conventions` | 1.43.0 | 1.44.0 | ✅ Safe | Patch-only update |
| `@opentelemetry/exporter-trace-otlp-http` | 0.222.0 | 0.300.0 | ⚠️ Major | New HTTP exporter format |
| `@opentelemetry/instrumentation-http` | 0.222.0 | 0.300.0 | ⚠️ Major | Instrumentation API changes |
| `@opentelemetry/instrumentation-express` | 0.70.0 | 0.72.0 | ✅ Safe | Patch-only update |
| `@opentelemetry/instrumentation-redis` | 0.70.0 | 0.72.0 | ✅ Safe | Patch-only update |
| `@google/genai` | 2.22.0 | 2.32.0 | ⚠️ Minor | Gemini API client; check breaking changes |
| `zod` | 3.25.76 | 4.6.7 | ⚠️ Major | **CRITICAL**: Memory exhaustion vulnerability; API changes in 4.x |
| `typescript` | 5.5.3 | 7.0.2 | ⚠️ Major | Breaking changes in type system; strict cleaning needed |
| `vite` | 6.4.5 | 8.3.5 | ⚠️ Major | Plugin API changes, Vite 5+ migration |
| `react` | 18.3.1 | 19.0.0 | ⚠️ Major | React 19 introduces JSX transforms, RSC changes |
| `react-dom` | 18.3.1 | 19.0.0 | ⚠️ Major | Must upgrade react concurrently |
| `react-router-dom` | 7.18.3 | 7.18.5 | ✅ Safe | Patch-only, minor improvements |
| `tailwindcss` | 4.3.3 | 4.3.4 | ✅ Safe | Patch-only |
| `@tailwindcss/postcss` | ^4.3.3 | ^4.3.3 | ✅ Safe | Already on v4 |
| `eslint` | 9.39.5 | 10.0.1 | ⚠️ Major | Flat config migration required |
| `eslint-plugin-storybook` | ^10.6.5 | ^10.6.5 | ⚠️ Moderate | Peer dep changes |
| `vitest` | ^5.0.5 | ^5.1.0 | ✅ Safe | Patch-only |
| `vitest-axe` | ^0.1.0 | ^0.2.0 | ✅ Safe | Patch-only |
| `vitest-mock-extended` | ^3.1.1 | ^5.1.1 | ⚠️ Minor | API changes in v5 |
| `@radix-ui/react-accordion` | 1.2.0 | 1.3.1 | ✅ Safe | Radix v1.x patches |
| `@radix-ui/react-alert-dialog` | 1.1.1 | 1.2.1 | ✅ Safe | Radix v1.x patches |
| `@radix-ui/react-aspect-ratio` | 1.1.0 | 1.2.0 | ✅ Safe | Radix v1.x patches |
| `@radix-ui/react-avatar` | 1.1.0 | 1.3.1 | ✅ Safe | Radix v1.x patches |
| `@radix-ui/react-dialog` | (not in outdated list) | - | - | - |
| `embla-carousel-react` | ^8.3.0 | - | - | - |
| `date-fns` | ^3.6.0 | - | - | - |
| `react-day-picker` | ^8.10.1 | - | - | - |
| `recharts` | ^2.12.7 | ^2.15.4 / ^3.10.1 | ⚠️ Major | **v3 is a rewrite**; v2→v3 breaking |
| `sonner` | ^1.5.0 | ^1.7.4 / ^2.0.8 | ✅ Safe | Minor features |
| `clsx` | ^2.1.1 | - | - | - |
| `class-variance-authority` | ^0.7.1 | - | - | - |
| `lucide-react` | ^0.462.0 | - | - | - |
| `msw` | ^2.15.0 | - | - | - |
| `react-hook-form` | ^7.53.0 | - | - | - |
| `react-resizable-panels` | ^2.1.3 | - | - | - |
| `react-router-dom` | ^7.18.3 | ^7.18.5 | ✅ Safe | - |
| `tailwind-merge` | ^2.5.2 | ^2.6.1 / ^3.7.0 | ⚠️ Minor | API changes in v3 |
| `tailwindcss` | ^4.3.3 | ^4.3.4 | ✅ Safe | - |
| `three` | ^0.176.0 | ^0.187.0 | ⚠️ Major | **Three.js r176 → r177+**: significant API changes |
| `zustand` | ^4.5.2 | ^4.5.7 / ^5.0.16 | ⚠️ Minor | v5 introduces stores API changes |
| `size-limit` | ^14.1.0 | ^14.1.0 | ✅ Safe | Same major version |
| `@size-limit/preset-big-lib` | ^14.1.0 | ^14.1.0 | ✅ Safe | - |
| `@storybook/addon-a11y` | ^10.6.5 | - | - | - |
| `@storybook/addon-docs` | ^10.6.5 | - | - | - |
| `@storybook/addon-mcp` | ^10.6.5 | - | - | - |
| `@storybook/addon-vitest` | ^10.6.5 | - | - | - |
| `@storybook/react-vite` | ^10.6.5 | - | - | - |
| `storybook` | ^10.6.5 | - | - | - |
| `@storybook/react-vite` | ^10.6.5 | - | - | - |
| `@swc/core` | ^1.11.24 | - | - | - |
| `@types/react` | ^18.3.23 | - | - | - |
| `@types/react-dom` | ^18.3.0 | - | - | - |
| `@types/node` | ^22.17.2 | - | - | - |
| `@types/three` | ^0.158.0 | - | - | - |
| `vite-plugin-compression2` | ^2.2.0 | ^2.5.4 | ⚠️ Minor | API changes |
| `vite-plugin-pwa` | ^1.0.3 | ^1.3.0 / ^2.0.0 | ⚠️ Minor | Workbox 6.x changes |
| `sonner` | ^1.5.0 | ^1.7.4 / ^2.0.8 | ✅ Safe | - |
| `supertest` | ^7.1.4 | ^7.3.1 | ✅ Safe | Patch-only |
| `serverless-http` | ^3.2.0 | ^4.0.0 | ⚠️ Minor | Express v5 compatibility |
| `playwright` | ^1.40.0 | - | - | - |
| `@vitest/browser-playwright` | ^5.0.5 | - | - | - |
| `crypto-keys-helpers` | (implicit via `@google/genai`) | - | - | - |

### Moderate-Priority Updates

| Package | Current | Latest | Risk |
|---------|---------|--------|------|
| `@lhci/cli` | 0.15.1 | 0.16.0 | ⚠️ High (vulnerability) |
| `@playwright/test` | 1.58.1 | 1.64.1 | ✅ Safe |
| `@axe-core/playwright` | 4.13.0 | 4.14.0 | ✅ Safe |
| `@axe-core/react` | 4.13.0 | 4.14.0 | ✅ Safe |
| `@chromatic-com/storybook` | 5.4.0 | 5.6.0 | ✅ Safe |
| `@radix-ui/*` | Various | 1.2.1-1.3.1 | ✅ Safe |
| `date-fns` | ^3.6.0 | - | - |
| `dayjs` / `moment` | Not directly listed | - | - |
| `framer-motion` | ^12.6.2 | - | - |
| ` globals` | ^15.15.0 | - | - |
| `input-otp` | ^1.2.4 | - | - |
| `jsdom` | ^22.1.0 | - | - |
| `msw` | ^2.15.0 | - | - |
| `next-themes` | ^0.3.0 | - | - |
| `playwright` | ^1.40.0 | - | - |
| `uuid` | ^11.1.1 (overridden) | ^14.0.3 | ⚠️ Major |
| `vaul` | ^0.9.3 | ^0.9.9 / ^1.1.2 | ✅ Safe |
| `cmdk` | ^1.0.0 | - | - |

---

## 2. Known Vulnerabilities

**Total**: 53 vulnerabilities (28 moderate, 20 high, 0 critical, 5 low, 0 info)

### High-Severity Vulnerabilities (Require Action)

| Package | Vulnerability | Severity | Fix Range |
|---------|--------------|----------|-----------|
| `zod` < 4.6.6 | Memory exhaustion while validating oversized constrained collections | High | >=4.6.6 |
| `undici` >=4.2.1 <6.29.1 | TLS certificate validation bypass, Denial of Service | High | >=6.29.1 |
| `basic-ftp` <=6.2.0 | Quadratic-time CPU DOS in directory listing | High | >=6.3.0 |
| `postcss-selector-parser` <6.1.5 | Quadratic complexity CSS parsing | Moderate | >=6.1.5 |
| `eslint-plugin-storybook` | Pattern pollution (pr-36141) | Moderate | >=0.9.0 |
| `chromium-bidi` | Various browser automation issues | High | Via @lhci/cli |
| `proxy-agent` | PAC proxy agent issues | High | Via @lhci/cli |
| `pac-proxy-agent` | PAC proxy issues | High | Via @lhci/cli |
| `estimo` | Chrome bin issues | High | Via @size-limit/preset-big-lib |
| `re2js` | Quadratic-time regex DOS | High | - |
| `undici` (multiple) | TLS renegotiation DOS, WebSocket PONG buffering | High/Moderate | >=6.29.1 |
| `qs` | ArrayFormat DoS | Moderate | - |

### Critical Dependency Chains

- **`@google-cloud/pubsub`** → `@opentelemetry/core` (moderate)
- **`firebase-tools`** transitively brings `@google-cloud/pubsub`
- **`@lhci/cli`** has multiple high-severity vulnerabilities via `lighthouse`, `proxy-agent`, `tmp`
- **`workbox-build`** (via `vite-plugin-pwa`) has moderate vulnerabilities
- **`undici`** is a direct dependency used by the HTTP server (OpenTelemetry, custom HTTP handling)

### Recommended Immediate Fixes

1. **Upgrade `zod` to ^4.6.6+** - Fixes memory exhaustion vulnerability
2. **Upgrade `undici` to ^6.29.1+** - Fixes TLS and WebSocket DOS vulnerabilities
3. **Upgrade `basic-ftp`** if used (check usage)
4. **Upgrade `postcss-selector-parser`** to ^6.1.5+
5. **Upgrade `eslint-plugin-storybook`** to ^0.9.0+

---

## 3. Unused Dependencies Assessment

Based on codebase analysis, here are potentially unused or underused packages:

### Likely Unused / Low-Usage

| Package | Reason |
|---------|--------|
| `@joshwooding/vite-plugin-react-docgen-typescript` | Only used for storybook docgen; may not be actively used |
| `@size-limit/preset-big-lib` | Size limiting; verify if CI checks are enforced |
| `prisma-mock` | Mocking for Prisma; check if used in tests |
| `prismock` | Another Prisma mocking library |
| `@axe-core/react` | Only loaded in DEV mode for a11y audits (Task 17) |
| `@chromatic-com/storybook` | Visual testing; may not be in active CI |
| `@lhci/cli` | Lighthouse CI; check if still in pipeline |
| `basic-ftp` | Check if FTP is actually used in the product |
| `estimo` | Chrome bin dependency for size-limit |
| `exegesis` | API documentation; verify usage |
| `postcss-selector-parser` | Internal to Tailwind; may not be direct usage |
| `zip-stream` | Archive functionality; verify usage |
| `archiver-utils` | Dependency of zip-stream |

### Well-Used Core Dependencies (Essential)

| Package | Usage |
|---------|-------|
| `react`, `react-dom` | Core frontend |
| `react-router-dom` | Routing |
| `tailwindcss`, `tailwind-merge` | Styling |
| `zod` | Schema validation (critical - upgrade needed) |
| `@opentelemetry/*` | Observability |
| `prisma` | Database ORM |
| `express` (via `serverless-http`) | API server |
| `vite` | Build tool |
| `vitest` | Testing |
| `playwright` | E2E testing |
| `msw` | Mock service worker |
| `sentry`* | Error tracking (imported in main.tsx) |
| `@google/genai` | Gemini AI integration |

*Note: `sentry` is imported in `main.tsx` but may need verification of full integration.*

---

## 4. Version Pinning Risks

### Risky Version Ranges

| Package | Current Range | Risk Level | Concern |
|---------|--------------|------------|---------|
| `uuid` | ^11.1.1 (overridden to 11.1.1) | **HIGH** | Override pins old version; latest is 14.0.3 with security fixes |
| `body-parser` | ^2.4.0 (overridden) | **HIGH** | Express v5 compatible; ensure compatibility |
| `@google/genai` | ^2.22.0 | **MEDIUM** | Major version hops (2.x → 3.x) may break API |
| `uuid` override | Why was this overridden? | **MEDIUM** | Check git history for reasoning |
| `body-parser` override | Why this override? | **MEDIUM** | May conflict with Express built-in body-parser |

### Overrides Analysis

```json
"overrides": {
  "@grpc/grpc-js": "^1.14.6",
  "uuid": "^11.1.1",
  "body-parser": "^2.4.0"
}
```

**Concerns**:
1. **`uuid` @ ^11.1.1**: Locked to v11.1.1 while v14.0.3 is latest. v11 may have unpatched CVEs.
2. **`body-parser` @ ^2.4.0**: Express v5 uses new body-parser; this override may cause middleware conflicts.
3. **`@grpc/grpc-js` @ ^1.14.6**: pins an older gRPC version; verify if needed or remove override.

### Recommendations

1. **Remove unnecessary overrides** if they were workarounds for resolved issues
2. **Update `uuid` to at least ^13.0.0** or latest ^14.0.0
3. **Evaluate `body-parser` override** - Express v5 may require the v2 version, but test compatibility
4. **Pin `@google/genai`** to a specific minor version once compatibility is confirmed

---

## 5. Safe Upgrade Order (Recommended Path)

### Phase 1: Security Critical (This Week)

1. **`zod`** → ^4.6.6 (fixes memory exhaustion HIGH vulnerability)
2. **`undici`** → ^6.29.1 (fixes TLS/DOS vulnerabilities HIGH)
3. **`@opentelemetry/core`** → ^2.8.0 (fixes unbounded memory allocation in W3C Baggage)

### Phase 2: Dependency Updates (Next 2 Weeks)

4. **OpenTelemetry ecosystem** → Patch updates within 2.x/0.222.x
   - `@opentelemetry/api` → 1.10.0
   - `@opentelemetry/sdk-trace-node` → 2.12.0
   - `@opentelemetry/sdk-trace-base` → 2.12.0
   - `@opentelemetry/resources` → 3.0.0 **(breaking changes expected - review resource detection API)**
   - `@opentelemetry/exporter-trace-otlp-http` → 0.30.0 **(new format)**

5. **ESLint & Tooling**
   - `eslint` → 10.0.1 **(requires flat config migration - `eslint.config.mjs` already exists, good!)**
   - `eslint-plugin-storybook` → ^0.9.0 (fixes moderate vulnerability)
   - `vite-plugin-compression2` → ^2.5.4
   - `vite-plugin-pwa` → ^1.3.0 (workbox 6.x updates)

6. **React Ecosystem**
   - `@radix-ui/react-*` → 1.3.x (latest v1 patches)
   - `tailwind-merge` → ^2.6.1 or ^3.7.0 **(API changes in v3)**
   - `sonner` → ^1.7.4

### Phase 3: Major Framework Updates (Next Month)

7. **`typescript`** → 5.6.x first, then 7.0.0 **(huge breaking changes)**
   - Must run `npm run typecheck` after each update
   - Check for deprecated APIs, strict mode changes

8. **`vite`** → 7.x or 8.x
   - Plugin API changes
   - Vite 5+ requires Node 18+ (already compatible: `"node": "22.x || 24.x"`)
   - Update `vite-plugin-pwa` peer deps

9. **`react`** → 18.3.1 → 19.0.0 **(concurrent with react-dom)**
   - JSX transform changes (`import React from 'react'` may be needed removed)
   - Server Components not applicable for this SPA
   - Verify all third-party React compatibility

### Phase 4: Cleanup & Verification

10. **Review unused deps** and remove:
    - `@joshwooding/vite-plugin-react-docgen-typescript` if docgen not used
    - `prisma-mock` / `prismock` if not in test workflow
    - `basic-ftp` if FTP not product feature

11. **Run full test suite**: `npm test` and verify no regressions
12. **Run `npm audit`** and verify vulnerabilities count reduced
13. **Update CI/CD scripts** to reflect new dependency versions

---

## 6. Breaking Change Notes

### High-Impact Migration Paths

#### 1. `uuid` v11 → v14
- **API change**: `Uuid.parse()` / `Uuid.stringify()` introduced in v4; v14 has additional utils
- **Migration**: Search for `uuid.v4()` → use ` { randomUUID() }` (Node.js built-in) or keep using uuid library but update import syntax
- **Risk**: LOW if using standard `uuid.v4()` pattern

#### 2. `zod` v3 → v4
- **API change**: 
  - `zod.object()` returns `z.ZodObject` vs plain object in some cases
  - `.refine()` signature changes slightly
  - Error format restructuring
- **Migration**: Mostly compatible; run `zod` migration guide. **Critical**: Fix the vulnerability first.

#### 3. `eslint` v9 → v10 (Flat Config)
- **Already partially prepared**: `eslint.config.mjs` exists at root
- **Migration**: Move all `eslint.config*` files to the flat config format in `eslint.config.mjs`
- **Risk**: MEDIUM - mostly additive changes, but some plugin APIs changed

#### 4. `react` v18 → v19
- **Key changes**:
  - New JSX transform: `import React from 'react'` no longer needed (auto-inserted)
  - `react-dom` 19 has new `flushSync`, `createRoot` changes
  - Suspense improvements
- **Migration**: Test thoroughly; most code should work with minor adjustments

#### 5. `vite` v6 → v8
- **Key changes**:
  - Config type changes
  - Build API minor adjustments
  - Better esbuild integration
- **Migration**: Patch releases (6.x → 7.x → 8.x) are safer than jumping major versions

#### 6. OpenTelemetry `resources` v2 → v3
- **Breaking**: `Resource` constructor API changed; new `ResourceBuilder` pattern
- **Migration**: Update all resource creation code to use `ResourceBuilder.addService()`
- **Risk**: HIGH - may affect instrumentation data format

---

## 7. Action Items Summary

### Immediate (This Sprint)
- [ ] Upgrade `zod` to ^4.6.6+
- [ ] Upgrade `undici` to ^6.29.1+
- [ ] Upgrade `@opentelemetry/core` to ^2.8.0+
- [ ] Fix `eslint-plugin-storybook` vulnerability (^0.9.0+)
- [ ] Review and potentially remove unnecessary overrides (`uuid`, `body-parser`)

### Short-term (Next 2-3 Sprints)
- [ ] Update OpenTelemetry packages to latest 2.x / 0.300.x
- [ ] Migrate ESLint to flat config (v10) - already have `eslint.config.mjs`
- [ ] Upgrade `@radix-ui/react-*` components to v1.3.x
- [ ] Upgrade `tailwind-merge` and verify API compatibility
- [ ] Upgrade `vite` to 7.x or 8.x

### Medium-term (Next Month)
- [ ] Upgrade `typescript` cautiously (5.6 → 7.0 with thorough testing)
- [ ] Upgrade `react` / `react-dom` to 19.0.0
- [ ] Clean up unused dependencies
- [ ] Re-run `npm audit` and verify vulnerability reduction

### Long-term (Quarterly)
- [ ] Establish dependency update schedule (monthly minor, quarterly major)
- [ ] Set up Dependabot or similar automated PR generation
- [ ] Maintain compatibility matrix for framework upgrades
- [ ] Regular vulnerability reassessment

---
*Report compiled from `npm outdated`, `npm audit --json`, and codebase import analysis.*