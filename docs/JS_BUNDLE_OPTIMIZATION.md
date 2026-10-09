# JS Bundle Size Optimization

**Task Reference:** Phase 3, Sprint 11, Task 41

**Last Updated:** 2026-10-07

## Overview

This document audits JavaScript bundle size and identifies optimization opportunities.

## Depcheck Results

### Unused Dependencies (False Positives)

**Note:** Many dependencies flagged as "unused" are actually used in server code or specific files that depcheck doesn't detect due to the server/client split.

**Server Dependencies (Used in `server/`):**

- @google/genai - AI service
- @opentelemetry/* - OpenTelemetry instrumentation
- @prisma/instrumentation - Prisma instrumentation
- @sentry/* - Error tracking
- bull - Job queue
- cookie-parser - Express middleware
- cors - Express middleware
- dockerode - Docker API
- express - Server framework
- express-rate-limit - Rate limiting
- firebase/* - Firebase integration
- helmet - Security headers
- ioredis - Redis client
- jsonwebtoken - JWT auth
- multer - File uploads
- node-cron - Cron jobs
- socket.io/* - WebSocket
- swagger-jsdoc, swagger-ui-express - API docs
- uuid - UUID generation
- ws - WebSocket server

**Client Dependencies (Used in `client/`):**

- @react-three/cannon - Physics engine
- reactflow - Flow charts
- web-vitals - Performance monitoring (Task 34)

**Radix UI Components (Used in `client/components/ui/`):**

All @radix-ui/* packages are used in the UI component library.

**Other Client Dependencies:**

- @react-three/fiber, @react-three/drei - 3D rendering
- @tanstack/react-query - Data fetching
- @testing-library/* - Testing
- recharts - Charts
- framer-motion - Animations
- zustand - State management
- sonner - Toast notifications
- lucide-react - Icons
- clsx, tailwind-merge - Utilities

### Actual Unused Dependencies

After reviewing the flagged dependencies, there are no true unused dependencies. All are used in either server code, client code, or testing infrastructure.

## Current Bundle Analysis

From `docs/BUNDLE_ANALYSIS.md`:

| Chunk | Size (Unzipped) | Size (Gzipped) | Budget |
|-------|----------------|---------------|--------|
| Landing Entry | 1,029 KB | ~300 KB | 500 KB |
| Three.js Vendor | 695 KB | ~200 KB | 200 KB |
| R3F Vendor | 614 kB | ~180 KB | 500 KB |
| UI Vendor | 490 kB | ~140 KB | 150 KB |
| Total JS | ~2.4 MB | ~576 kB | - |

## Optimization Opportunities

### Immediate (High Priority)

1. **Add sideEffects Flags** - Mark packages with no side effects for better tree-shaking
2. **Configure Terser** - Drop console logs in production
3. **Review Large Chunks** - Identify large chunks that can be split further

### Short-term (Medium Priority)

1. **Replace Oversized Libraries** - Evaluate alternatives for large dependencies
2. **Code Splitting** - Split large chunks further
3. **Dynamic Imports** - Use dynamic imports for rarely used features

### Long-term (Lower Priority)

1. **Bundle Analysis Automation** - Automated bundle size monitoring in CI
2. **Dependency Auditing** - Regular dependency audits
3. **Alternative Libraries** - Evaluate lighter alternatives

## Implementation

### Add sideEffects to package.json

```json
{
  "sideEffects": [
    "*.css",
    "*.scss",
    "*.sass",
    "*.less",
    "*.styl"
  ]
}
```

### Configure Terser in vite.config.ts

```typescript
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.info', 'console.debug'],
    },
  },
}
```

## Testing Checklist

- [ ] Run depcheck after adding sideEffects
- [ ] Verify tree-shaking works correctly
- [ ] Test production build with terser drop_console
- [ ] Verify console logs are removed in production
- [ ] Run size-limit to verify budgets
- [ ] Test that functionality still works after optimizations

## Expected Improvements

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| JS Bundle (Gzipped) | ~576 KB | < 500 KB | 13% |
| Console Logs Removed | No | Yes | - |
| Tree-shaking Efficiency | Moderate | High | 20% |
| Build Time | ~30s | < 25s | 17% |

## Status

**Overall Status:** ✅ Good Foundation

**Completed:** Depcheck audit (no true unused dependencies), bundle analysis reviewed
**In Progress:** Adding sideEffects flags and terser configuration
**Next Steps:** Add sideEffects to package.json and configure terser
