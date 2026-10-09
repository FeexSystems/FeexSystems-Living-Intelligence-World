# Performance Budgets

**Task Reference:** Phase 1, Sprint 3, Task 12

## Overview

Dependency budgets configured using `size-limit` to enforce bundle size limits and prevent regressions.

## Budget Configuration

File: `.size-limit.json`

| Bundle | Path | Limit (gzipped) | Current (gzipped) | Status |
|--------|------|----------------|-------------------|--------|
| Landing Entry Chunk | `dist/spa/assets/index-*.js` | 850 kB | 822.01 kB | ✅ Within budget |
| Client CSS Bundle | `dist/spa/assets/index-*.css` | 100 kB | 23.11 kB | ✅ Within budget |
| Three.js Vendor Chunk | `dist/spa/assets/three-vendor-*.js` | 200 kB | 173.31 kB | ✅ Within budget |
| R3F Vendor Chunk | `dist/spa/assets/r3f-vendor-*.js` | 500 kB | 473.12 kB | ✅ Within budget |
| UI Vendor Chunk | `dist/spa/assets/ui-vendor-*.js` | 150 kB | 133.94 kB | ✅ Within budget |

## Installation

```bash
npm install --save-dev @size-limit/preset-big-lib size-limit
```

## Usage

```bash
# Check bundle sizes against budgets
npm run size-limit

# Check budgets as part of build
npm run build && npm run size-limit
```

## CI Integration

Add to `.github/workflows/test.yml`:

```yaml
- name: Check bundle sizes
  run: |
    npm run build:client
    npm run size-limit
```

## Notes

- **Landing Entry Chunk Limit:** Set to 850 kB to accommodate the large Three.js vendor dependencies that are eagerly loaded for the cinematic landing experience. The size-limit tool measures the entry chunk including all its dependencies.
- **R3F Vendor Chunk Limit:** Set to 500 kB based on actual bundle size of 473.12 kB gzipped.
- **size-limit Behavior:** Measures actual gzipped file sizes including all dependencies; the "Loading time" estimates are calculated based on the measured size using slow 3G and Snapdragon 410 benchmarks.

## Rationale

Budgets are set based on the current bundle analysis (see `docs/BUNDLE_ANALYSIS.md`). The limits are set slightly above current sizes to allow for minor growth while preventing significant regressions.

- **Landing entry chunk** is large (822 kB gzipped) because it eagerly loads Three.js vendor chunks for the cinematic landing experience. This is acceptable as users visiting non-3D routes (`/projects`, `/navigator`, `/dashboard`) don't download these bundles due to route-level code splitting.
- **Three.js chunks** are large but necessary for the cinematic landing experience and Spatial World
- **UI vendor chunk** (Radix UI + lucide-react) is acceptable given the component library provides comprehensive UI primitives

## Enforcement

Currently enforced manually via `npm run size-limit`. Future work:
- Add to CI workflow to fail PRs that exceed budgets
- Add automated PR comments with bundle size diffs
- Configure size-limit to compare against a baseline commit
