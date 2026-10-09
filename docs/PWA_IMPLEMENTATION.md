# Service Worker / PWA Implementation

**Task Reference:** Phase 3, Sprint 10, Task 39

**Last Updated:** 2026-10-07

## Overview

This document documents the Service Worker / PWA implementation using vite-plugin-pwa.

## Prerequisites

✅ **vite-plugin-pwa** already installed in devDependencies (v1.0.3)

## Implementation Plan

### Step 1: Configure VitePWA in vite.config.ts

Add VitePWA plugin to the plugins array with cache strategies:

```typescript
import { VitePWA } from 'vite-plugin-pwa';

plugins: [
  react(),
  glslPlugin(),
  expressPlugin(),
  VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'feexsystems-logo.svg', 'apple-touch-icon.png'],
    manifest: {
      name: 'FEEXSYSTEMS — Living Engineering Intelligence',
      short_name: 'FEEXSYSTEMS',
      description: 'An evidence-backed engineering intelligence platform',
      theme_color: '#05070A',
      background_color: '#05070A',
      display: 'standalone',
      icons: [
        {
          src: '/feexsystems-logo.svg',
          sizes: 'any',
          type: 'image/svg+xml',
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,avif}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'gstatic-fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
          },
        },
        {
          urlPattern: /\/api\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            networkTimeoutSeconds: 10,
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 5, // 5 minutes
            },
          },
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'image-cache',
            expiration: {
              maxEntries: 60,
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
            },
          },
        },
        {
          urlPattern: /\.(?:webm|mp4)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'video-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
            },
          },
        },
      ],
    },
  }),
],
```

### Step 2: Remove Manual Service Worker Registration

Remove the manual service worker registration from `client/src/main.tsx` since VitePWA handles it automatically:

```typescript
// Remove this block from client/src/main.tsx
// if (import.meta.env.PROD) {
//   window.addEventListener("load", () => {
//     navigator.serviceWorker.register("/sw.js").catch((error) => {
//       console.warn("[sw] registration failed:", error);
//     });
//   });
// }
```

### Step 3: Update Manifest

Ensure `public/manifest.json` is aligned with the VitePWA configuration or remove it if VitePWA generates it automatically.

## Cache Strategies

### Static Assets (CacheFirst)

- **Pattern:** `**/*.{js,css,html,ico,png,svg,webp,avif}`
- **Strategy:** CacheFirst
- **Rationale:** Static assets rarely change, serve from cache for instant loads

### Google Fonts (CacheFirst)

- **Pattern:** `https://fonts.googleapis.com/*`, `https://fonts.gstatic.com/*`
- **Strategy:** CacheFirst
- **Expiration:** 1 year
- **Rationale:** Fonts have immutable URLs, cache aggressively

### API Routes (NetworkFirst)

- **Pattern:** `/api/*`
- **Strategy:** NetworkFirst
- **Timeout:** 10 seconds
- **Expiration:** 5 minutes
- **Rationale:** API data changes frequently, try network first, fallback to cache

### Images (CacheFirst)

- **Pattern:** `*.{png,jpg,jpeg,svg,gif,webp,avif}`
- **Strategy:** CacheFirst
- **Expiration:** 30 days
- **Rationale:** Images change infrequently, cache for better performance

### Videos (CacheFirst)

- **Pattern:** `*.{webm,mp4}`
- **Strategy:** CacheFirst
- **Expiration:** 7 days
- **Rationale:** Videos are large, cache to reduce bandwidth

## Testing Checklist

- [ ] Verify service worker registers in production
- [ ] Test offline functionality (disconnect network, reload)
- [ ] Test cache-first strategy for static assets
- [ ] Test network-first strategy for API routes
- [ ] Test font caching
- [ ] Test image caching
- [ ] Test video caching
- [ ] Verify manifest is generated correctly
- [ ] Test PWA installation on mobile
- [ ] Test app launch from home screen

## Expected Improvements

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Repeat Visit Load Time | ~3s | < 1s | 66% |
| Offline Support | ❌ No | ✅ Yes | 100% |
| Cache Hit Rate | 0% | > 80% | 80% |
| Bandwidth (Repeat) | ~500 KB | < 50 KB | 90% |

## Status

**Overall Status:** ⚠️ Configuration Documented

**Completed:** Audit of existing setup, documented implementation plan
**In Progress:** Wiring VitePWA into vite.config.ts
**Next Steps:** Add VitePWA configuration to vite.config.ts and test
