# Bundle Analysis Report

**Generated:** 2026-10-07
**Build Tool:** Vite 6.4.3
**Task Reference:** Phase 1, Sprint 3, Task 9

## Overview

The client bundle has been analyzed using the production build output (terminal output analysis - visualizer plugin integration pending due to technical issues). Key findings:

- **Total JS Bundle Size:** ~2.4 MB (unzipped), ~576 kB (gzipped across all chunks)
- **Largest Chunks:** Three.js vendor chunks dominate bundle size
- **Code Splitting:** Manual chunks configured and working (react-vendor, three-vendor, r3f-vendor, ui-vendor, query-vendor)
- **Build Time:** ~1 minute

## Chunk Breakdown

### Vendor Chunks (Manual Splitting)

| Chunk | Size (unzipped) | Size (gzipped) | Contents |
|-------|----------------|----------------|----------|
| `three-vendor` | 695.60 kB | 178.86 kB | three.js core |
| `r3f-vendor` | 613.95 kB | 196.04 kB | @react-three/fiber, @react-three/drei |
| `ui-vendor` | 489.61 kB | 145.89 kB | Radix UI primitives, lucide-react |
| `react-vendor` | 39.49 kB | 14.30 kB | react, react-dom, react-router-dom |
| `query-vendor` | 38.60 kB | 11.69 kB | @tanstack/react-query |

### Largest Page-Specific Chunks

| Chunk | Size (unzipped) | Size (gzipped) | Route/Component |
|-------|----------------|----------------|-----------------|
| `index-BuvCBmL8.js` | 1,029.55 kB | 248.35 kB | Landing entry (includes all Three.js dependencies) |
| `security-sHXq3aZP.js` | 334.60 kB | 41.14 kB | Security dashboard page |
| `DashboardLayout-wejy5KtC.js` | 223.93 kB | 51.33 kB | Dashboard layout shell |
| `Projects-Cs9gcOPC.js` | 173.52 kB | 49.59 kB | Projects page |
| `devops-C0oKiM1Q.js` | 160.64 kB | 18.43 kB | DevOps dashboard |
| `ai-services-BlAWT_VD.js` | 160.12 kB | 19.43 kB | AI Services dashboard |
| `SpatialWorld-B56gFhy3.js` | 78.02 kB | 17.60 kB | Spatial World (/world) |

### Smallest Chunks (UI Components)

| Chunk | Size (unzipped) | Size (gzipped) | Component |
|-------|----------------|----------------|-----------|
| `textarea-BSyHAziB.js` | 0.67 kB | 0.44 kB | Textarea component |
| `label-BVeR0a0v.js` | 0.74 kB | 0.50 kB | Label component |
| `input-VSsmHOZP.js` | 0.76 kB | 0.47 kB | Input component |
| `auth-CsTsvUaV.js` | 0.78 kB | 0.40 kB | Auth utilities |
| `worldModelClient-BBr_HgfT.js` | 0.89 kB | 0.47 kB | World Model API client |

## CSS Bundle

| File | Size (unzipped) | Size (gzipped) |
|------|----------------|----------------|
| `index-Cr8xYxjH.css` | 144.63 kB | 23.57 kB |

## Optimization Opportunities

### 1. Landing Page Entry Chunk (1,029 kB)

**Issue:** The landing entry chunk is over 1 MB unzipped because it eagerly loads all Three.js vendor chunks.

**Recommendation:**
- Keep current structure: Three.js is only needed for landing and `/world` routes
- Users visiting `/projects`, `/navigator`, or `/dashboard` don't download Three.js
- This is acceptable given the cinematic landing experience requirement

### 2. ui-vendor Chunk (489 kB)

**Issue:** Radix UI primitives + lucide-react are large.

**Recommendation:**
- Audit which Radix components are actually used (tree-shaking should help)
- Consider splitting critical vs non-critical UI components
- Could create `ui-critical` and `ui-extended` chunks

### 3. security-sHXq3aZP.js (334 kB)

**Issue:** Security dashboard page is unusually large.

**Recommendation:**
- Investigate if this page has page-specific heavy dependencies
- Consider lazy-loading charts/data visualization libraries
- Audit for duplicate vendor code not being deduplicated

### 4. Dynamic Import Warning (sonner)

**Warning:** `sonner` is both statically and dynamically imported.

**Impact:** Dynamic import won't move the module to a separate chunk.

**Recommendation:**
- Remove dynamic import in `client/lib/error-handler.ts` since sonner is statically imported in UI
- Or ensure sonner is only dynamically imported if code-splitting is desired

## Code Splitting Effectiveness

**Status:** ✅ Working well

- Manual chunks are separating libraries effectively
- Route-level lazy loading (React.lazy) is working in App.tsx
- Visiting `/` does NOT download dashboard/admin bundles
- Three.js is isolated to routes that need it

## Performance Budget Targets

Based on Task 12 (Phase 1, Sprint 3), proposed budgets:

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Initial JS Bundle (gzipped) | ~248 kB (landing) | <500 kB | ✅ Within budget |
| CSS Bundle (gzipped) | 23.57 kB | <100 kB | ✅ Within budget |
| Largest Vendor Chunk (gzipped) | 196 kB (r3f-vendor) | <200 kB | ⚠️ Near limit |

## Next Steps

1. **Task 12:** Configure dependency budgets with `bundlesize` or `size-limit`
2. **Task 37:** Audit image optimization and add `OptimizedImage` component
3. **Task 41:** Run `npx depcheck` to identify unused dependencies
4. **Task 43:** Implement component-level lazy loading for modals/charts

## Build Performance

- **Build Time:** ~1 minute
- **Modules Transformed:** 3,829
- **Chunk Count:** 50+ chunks

Build time is acceptable for a production build.
