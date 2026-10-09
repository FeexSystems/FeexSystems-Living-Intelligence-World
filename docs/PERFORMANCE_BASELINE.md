# Performance Baseline

**Task Reference:** Phase 3, Sprint 9, Task 33

**Last Updated:** 2026-10-07

## Overview

This document establishes the performance baseline for the FeexSystems Living Intelligence World application using Lighthouse metrics. The baseline is used to track improvements and regressions over time.

## Testing Methodology

### Test Pages

- `/` - Landing page with WebGL background
- `/world` - 3D Spatial Knowledge Galaxy
- `/navigator` - AI-grounded Navigator interface
- `/projects` - Public project explorer

### Test Configuration

- **Device:** Desktop (Chrome)
- **Network:** Throttling (Fast 3G / 4G)
- **Caching:** Disabled
- **Runs:** 3 per page, averaged
- **Lighthouse Version:** Latest

### Core Web Vitals Targets

| Metric | Target | Good | Needs Improvement | Poor |
|--------|--------|------|------------------|------|
| LCP (Largest Contentful Paint) | < 2.5s | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| INP (Interaction to Next Paint) | < 200ms | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS (Cumulative Layout Shift) | < 0.1 | ≤ 0.1 | ≤ 0.25 | > 0.25 |

### Additional Metrics

| Metric | Target | Good | Needs Improvement | Poor |
|--------|--------|------|------------------|------|
| TTFB (Time to First Byte) | < 600ms | ≤ 600ms | ≤ 1800ms | > 1800ms |
| TBT (Total Blocking Time) | < 200ms | ≤ 200ms | ≤ 600ms | > 600ms |
| FCP (First Contentful Paint) | < 1.8s | ≤ 1.8s | ≤ 3.0s | > 3.0s |
| Speed Index | < 3.4s | ≤ 3.4s | ≤ 5.8s | > 5.8s |

## Baseline Results

### Landing Page (`/`)

**Status:** ⏳ Pending Testing

**Test Runs:**

| Run | LCP | INP | CLS | TTFB | TBT | FCP | Speed Index | Performance Score |
|-----|-----|-----|-----|------|-----|-----|-------------|-------------------|
| 1 | - | - | - | - | - | - | - | - |
| 2 | - | - | - | - | - | - | - | - |
| 3 | - | - | - | - | - | - | - | - |
| **Average** | - | - | - | - | - | - | - | - |

**Notes:**

- WebGL canvas may impact LCP and TBT
- Video backgrounds may affect CLS
- Cinematic scene loading may affect initial metrics

### Spatial World (`/world`)

**Status:** ⏳ Pending Testing

**Test Runs:**

| Run | LCP | INP | CLS | TTFB | TBT | FCP | Speed Index | Performance Score |
|-----|-----|-----|-----|------|-----|-----|-------------|-------------------|
| 1 | - | - | - | - | - | - | - | - |
| 2 | - | - | - | - | - | - | - | - |
| 3 | - | - | - | - | - | - | - | - |
| **Average** | - | - | - | - | - | - | - | - |

**Notes:**

- Three.js scene initialization may impact LCP
- Node graph rendering may affect TBT
- DPR clamping to [1, 2] should help performance

### Navigator (`/navigator`)

**Status:** ⏳ Pending Testing

**Test Runs:**

| Run | LCP | INP | CLS | TTFB | TBT | FCP | Speed Index | Performance Score |
|-----|-----|-----|-----|------|-----|-----|-------------|-------------------|
| 1 | - | - | - | - | - | - | - | - |
| 2 | - | - | - | - | - | - | - | - |
| 3 | - | - | - | - | - | - | - | - |
| **Average** | - | - | - | - | - | - | - | - |

**Notes:**

- AI query response time may affect INP
- Results rendering may affect CLS
- Evidence loading may affect TBT

### Projects (`/projects`)

**Status:** ⏳ Pending Testing

**Test Runs:**

| Run | LCP | INP | CLS | TTFB | TBT | FCP | Speed Index | Performance Score |
|-----|-----|-----|-----|------|-----|-----|-------------|-------------------|
| 1 | - | - | - | - | - | - | - | - |
| 2 | - | - | - | - | - | - | - | - |
| 3 | - | - | - | - | - | - | - | - |
| **Average** | - | - | - | - | - | - | - | - |

**Notes:**

- Project card grid may affect CLS
- GitHub sync action may affect INP
- Search filtering may affect TBT

## How to Run Lighthouse Tests

### Using Chrome DevTools

1. Open Chrome DevTools (F12)
2. Navigate to the "Lighthouse" tab
3. Select "Performance" and "Accessibility" categories
4. Choose "Desktop" or "Mobile" device
5. Set network throttling to "Fast 3G" or "Slow 4G"
6. Click "Analyze page load"
7. Wait for the report to generate
8. Record metrics in the table above
9. Repeat 3 times per page for average

### Using Lighthouse CLI

```bash
# Install Lighthouse
npm install -g lighthouse

# Run Lighthouse on localhost
lighthouse http://localhost:8080/ --output=html --output=json --throttling-method=devtools --quiet

# Run with specific categories
lighthouse http://localhost:8080/ --only-categories=performance,accessibility,best-practices,seo

# Run with custom config
lighthouse http://localhost:8080/ --config-path=./lighthouse-config.js
```

### Using Lighthouse CI

```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run Lighthouse CI
lhci autorun --collect.url=http://localhost:8080/
```

## Performance Budgets

Based on the bundle analysis in `docs/BUNDLE_ANALYSIS.md`:

- **Total JS Bundle:** ~2.4 MB (unzipped), ~576 kB (gzipped)
- **Landing Entry Chunk:** ~1.0 MB (unzipped), within 500 kB gzip budget
- **Three.js Vendor:** ~695 kB (unzipped), within 200 kB gzip budget
- **R3F Vendor:** ~614 kB (unzipped), within 500 kB gzip budget
- **UI Vendor:** ~490 kB (unzipped), within 150 kB gzip budget

## Known Performance Issues

### High Priority

1. **Large Three.js Bundle** - 695 kB unzipped, impacts initial load
2. **WebGL Canvas on Landing** - May block main thread during initialization
3. **Video Backgrounds** - Large video files may slow initial load

### Medium Priority

1. **Google Fonts** - 7 families requested, may increase FCP
2. **Recharts for Dashboard** - Heavy library for charts
3. **Radix UI Components** - Multiple small components add up

### Low Priority

1. **Lucide Icons** - Tree-shaken but still contributes to bundle
2. **TanStack Query** - Good for caching but adds overhead
3. **React Hook Form** - Minimal impact, good trade-off

## Next Steps

1. Run Lighthouse tests on all 4 pages (3 runs each)
2. Record metrics in the tables above
3. Identify metrics that don't meet targets
4. Prioritize optimization tasks based on impact
5. Update this document after each optimization sprint

## Status

**Overall Status:** ⏳ Baseline Testing In Progress

**Completed:** Baseline document structure
**In Progress:** Running Lighthouse tests
**Next Steps:** Execute Lighthouse tests and record results
