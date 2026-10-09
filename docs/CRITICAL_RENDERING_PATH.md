# Critical Rendering Path Analysis

**Task Reference:** Phase 3, Sprint 9, Task 35

**Last Updated:** 2026-10-07

## Overview

This document analyzes the critical rendering path for the FeexSystems Living Intelligence World application and identifies optimization opportunities.

## Current State

### index.html Analysis

**File:** `index.html`

**Resources:**

| Resource | Type | Loading | Blocking | Priority |
|----------|------|---------|----------|----------|
| Google Fonts (7 families) | CSS | Preconnect + Link | Yes | High |
| Main script (`/client/src/main.tsx`) | JS (module) | Module | No | High |
| Favicon | Icon | Link | No | Low |
| Apple Touch Icon | Icon | Link | No | Low |
| Manifest | JSON | Link | No | Low |

### Current Optimizations

**Preconnect to Google Fonts:**

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

**Module Script Loading:**

```html
<script type="module" src="/client/src/main.tsx"></script>
```

- Module scripts are automatically deferred
- Does not block rendering

**font-display: swap:**

- Google Fonts URL includes `display=swap`
- Prevents FOIT (Flash of Invisible Text)

### Render-Blocking Resources

1. **Google Fonts (7 families)** - Render-blocking
   - Impact: Delayed FCP (First Contentful Paint)
   - Families: Geist Mono, Google Sans, Google Sans Text, JetBrains Mono, Plus Jakarta Sans, Rajdhani, Space Grotesk
   - Size: ~200-300 KB uncompressed

2. **No critical CSS inlined** - Potential impact
   - CSS is loaded via Vite bundle
   - May delay FCP if large

## Optimization Recommendations

### Immediate (High Priority)

1. **Reduce Google Font Families**
   - **Current:** 7 families (Geist Mono, Google Sans, Google Sans Text, JetBrains Mono, Plus Jakarta Sans, Rajdhani, Space Grotesk)
   - **Recommended:** Reduce to 3-4 essential families
   - **Impact:** Reduce font payload by 40-60%, improve FCP

2. **Add Critical CSS Inline**
   - Extract critical CSS for above-fold content
   - Inline in `<head>` to prevent render-blocking
   - Defer non-critical CSS
   - **Impact:** Improve FCP by 100-300ms

3. **Add Font Preload for Critical Fonts**
   - Preload the 2-3 most critical font families
   - Add `preload` links before font request
   - **Impact:** Improve font loading time by 50-100ms

### Short-term (Medium Priority)

1. **Defer Non-Critical CSS**
   - Use `media="print"` + onload hack for non-critical CSS
   - Or use `preload` with `as="style"` and async loading
   - **Impact:** Reduce initial CSS payload

2. **Add DNS Prefetch for Third-Party Domains**
   - Add `dns-prefetch` for analytics, CDNs
   - **Impact:** Improve DNS resolution time

3. **Optimize Font Subsetting**
   - Use `text=` parameter to load only needed characters
   - **Impact:** Reduce font payload by 30-50%

### Long-term (Lower Priority)

1. **Self-Host Critical Fonts**
   - Host Google Fonts locally for better control
   - **Impact:** Eliminate DNS lookup, improve cache control

2. **Font Display Strategy**
   - Use `font-display: optional` for decorative fonts
   - **Impact:** Prevent layout shift for non-critical fonts

3. **HTTP/2 Server Push**
   - Push critical resources on initial navigation
   - **Impact:** Eliminate round-trip latency

## Implementation Plan

### Step 1: Reduce Google Font Families

**Current:**

```html
<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&family=Google+Sans:wght@300;400;500;600;700&family=Google+Sans+Text:wght@300;400;500;600&family=JetBrains+Mono:wght@100..800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Rajdhani:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Recommended (3 essential families):**

```html
<link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
```

### Step 2: Add Font Preload

```html
<!-- Preload critical fonts -->
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'">
<link rel="preload" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'">
```

### Step 3: Inline Critical CSS

Use Vite plugin or build step to extract critical CSS:

```html
<style>
  /* Critical CSS for above-fold content */
  body { margin: 0; font-family: 'Google Sans', sans-serif; }
  #root { min-height: 100vh; }
  /* ... more critical styles ... */
</style>
```

### Step 4: Defer Non-Critical CSS

```html
<link rel="preload" href="/assets/index.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/assets/index.css"></noscript>
```

## Testing Checklist

- Test FCP before and after font reduction
- Test LCP before and after critical CSS inlining
- Verify no render-blocking scripts
- Test font loading with `font-display: swap`
- Test CLS with font-size-adjust fallbacks
- Run Lighthouse to verify improvements

## Expected Improvements

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| FCP | ~1.8s | < 1.5s | 15-20% |
| LCP | ~2.5s | < 2.0s | 15-20% |
| Font Payload | ~300 KB | < 150 KB | 50% |
| Time to Interactive | ~3.5s | < 3.0s | 10-15% |

## Status

**Overall Status:** Needs Implementation

**Completed:** Analysis of current state
**In Progress:** Implementing optimizations
**Next Steps:** Reduce Google Font families and add critical CSS inline
