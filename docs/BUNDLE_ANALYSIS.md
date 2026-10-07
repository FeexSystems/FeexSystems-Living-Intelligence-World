# Bundle Analysis — FeexSystems Client

> **Created:** 2026-10-07 (Sprint 1, Task 9 of [FRONTEND_MODERNIZATION_PLAN.md](./FRONTEND_MODERNIZATION_PLAN.md))
> **Method:** `rollup-plugin-visualizer` (wired into `vite.config.ts`) + `npm run build:client`
> **Raw report:** `bundle-stats.html` (repo root, gitignored — regenerate with any client build)

## Headline Numbers (production build, `vite v6.4.3`)

| Metric | Value |
|--------|-------|
| Build time | 58.5 s (Windows, cold) |
| Modules transformed | 3,829 |
| Total assets emitted | ~5,275 kB raw |
| Initial HTML | 3.65 kB (gzip 1.21 kB) |
| Initial CSS | 144.63 kB (gzip 23.57 kB) |
| Main entry chunk | **1,029.55 kB (gzip 248.36 kB)** ⚠️ over 1,000 kB warning |

## Chunk Map (largest first)

| Chunk | Raw | Gzip | Notes |
|-------|-----|------|-------|
| `index` (main entry) | 1,029.55 kB | 248.36 kB | ⚠️ App shell + react-dom + eager landing deps — **top optimization target** |
| `three-vendor` | 695.60 kB | 178.86 kB | Three.js isolated (lazy `/world` only) |
| `r3f-vendor` | 613.95 kB | 196.04 kB | React Three Fiber + drei (lazy `/world` only) |
| `ui-vendor` | 489.61 kB | 145.89 kB | Radix primitives + lucide-react icons |
| `security` | 334.60 kB | 41.13 kB | Dashboard security page (lazy) |
| `DashboardLayout` | 223.93 kB | 51.33 kB | Authenticated shell (lazy) |
| `Projects` | 173.52 kB | 49.60 kB | Public projects page (lazy) |
| `devops` | 160.64 kB | 18.43 kB | Lazy dashboard route |
| `ai-services` | 160.12 kB | 19.43 kB | Lazy dashboard route |
| `OmniCommand` | 101.30 kB | 15.94 kB | Lazy public route |
| `index-CsjcOGO2` (landing) | 80.38 kB | 22.53 kB | Lazy-loaded landing entry |
| `SpatialWorld` | 77.98 kB | 17.56 kB | Lazy `/world` shell |
| `react-vendor` | 39.49 kB | 14.30 kB | ⚠️ suspiciously small — react-dom likely inside main `index` |

Verified stable: chunk outputs are **byte-identical** before/after the Sprint 1
stale-`.js` cleanup (same content hashes), confirming TypeScript sources were
already canonical for extensionless imports.

## Findings & Optimization Targets

1. **Main `index` chunk exceeds 1,000 kB** (Rollup warns on every build).
   - Investigate composition in `bundle-stats.html` — react-dom appears NOT to
     be captured by `react-vendor` (only 39 kB), so it sits in the entry chunk.
   - Fix candidate: extend `manualChunks` with `react-dom/client` and consider
     moving shared landing/dashboard runtime behind `lazy()`.
2. **`ui-vendor` at 489 kB raw** — lucide-react is bundled wholesale; verify
   tree-shaking (import from `lucide-react` root, avoid barrel re-exports) and
   consider per-icon imports if the report shows whole-pack inclusion.
3. **Three.js stack (1.3 MB raw across 2 chunks)** is correctly isolated behind
   the lazy `/world` route — no action needed, but keep it that way (never
   import `three` from eagerly-loaded modules).
4. **sonner dual-import warning** — `client/lib/error-handler.ts` dynamically
   imports `sonner` while `components/ui/sonner.tsx` imports it statically;
   the dynamic import never splits the chunk. Resolve to one strategy.
5. **Route-level splitting is healthy** — all routes except the landing entry
   are `React.lazy()`; dashboard sub-routes land in separate chunks
   (`security`, `devops`, `ai-services`, etc.).

## Recommended Budgets (for Task 12 enforcement)

| Asset class | Budget (gzip) | Rationale |
|-------------|---------------|-----------|
| Main entry chunk | < 260 kB now → < 200 kB target | Current 248 kB; target requires item 1 |
| Any vendor chunk | < 200 kB gzip | Keeps worst-case first-load acceptable |
| Total CSS | < 30 kB gzip | Currently 23.6 kB |
| Initial load (HTML + CSS + entry) | < 300 kB gzip | First-visit baseline |

## Reproducing

```bash
npm run build:client     # emits bundle-stats.html + dist/spa
npm run check:shadows    # ensures no stale .js files skew results
```
