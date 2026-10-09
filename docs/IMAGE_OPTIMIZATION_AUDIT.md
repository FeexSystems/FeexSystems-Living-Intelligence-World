# Image Optimization Audit

**Task Reference:** Phase 3, Sprint 10, Task 37

**Last Updated:** 2026-10-07

## Overview

This document audits the existing image optimization infrastructure and identifies opportunities for improvement.

## Existing Infrastructure

### Image Optimization Script

**File:** `scripts/optimize-all-media.mjs`

**Status:** ✅ Active

**Capabilities:**

- Processes JPG, JPEG, PNG, WebP formats
- Resizes images larger than 1920px (MAX_DIM)
- Optimizes with quality 80
- Uses sharp for image processing
- Logs savings and resize operations

**Covered Directories:**

- `public/media/feex`
- `docs/brand-assets/screenshots`

**Configuration:**

```javascript
const MAX_DIM = 1920;
const QUALITY = 80;
```

**Formats Supported:**

| Format | Extension | Supported | Optimized |
|--------|-----------|-----------|-----------|
| JPEG | .jpg, .jpeg | ✅ Yes | ✅ Yes (mozjpeg) |
| PNG | .png | ✅ Yes | ✅ Yes (compressionLevel 9) |
| WebP | .webp | ✅ Yes | ✅ Yes (quality 80, effort 6) |
| AVIF | .avif | ❌ No | ❌ No |

**NPM Script:**

```json
"optimize:images": "node scripts/optimize-all-media.mjs"
```

## Audit Findings

### ✅ Strengths

1. **Existing Optimization Pipeline** - Script is functional and actively used
2. **Format Support** - Covers most common formats (JPEG, PNG, WebP)
3. **Resize Logic** - Properly handles large images
4. **Quality Setting** - Reasonable quality (80) for web delivery
5. **Logging** - Clear output showing savings and operations

### ⚠️ Gaps

1. **Missing AVIF Support** - AVIF offers better compression than WebP
2. **Limited Directory Coverage** - Only covers 2 directories
3. **No Responsive Image Generation** - No srcset generation for different screen sizes
4. **No Component Integration** - No React component for responsive image delivery
5. **Missing Media Directory** - Landing page media (`/media/landing/`) not covered

### ❌ Issues

1. **No AVIF Generation** - Missing next-gen format with better compression
2. **No Lazy Loading** - Images load immediately regardless of viewport
3. **No Progressive Loading** - No progressive JPEG support
4. **No Fallback Strategy** - No graceful degradation for unsupported formats

## Recommendations

### Immediate (High Priority)

1. **Add AVIF Support** - Generate AVIF versions alongside WebP
2. **Expand Directory Coverage** - Add `/media/landing/` and other media directories
3. **Create OptimizedImage Component** - React component with `<picture>`/srcset support
4. **Add Lazy Loading** - Use `loading="lazy"` for below-fold images

### Short-term (Medium Priority)

1. **Generate Responsive Sizes** - Create multiple sizes for srcset
2. **Add Progressive JPEG** - Enable progressive JPEG for better perceived performance
3. **Integrate with Build Process** - Run optimization as part of build pipeline
4. **Add CI Check** - Check for unoptimized images in CI

### Long-term (Lower Priority)

1. **CDN Integration** - Use CDN for image delivery and optimization
2. **Dynamic Optimization** - Server-side image optimization on-demand
3. **Image Sprites** - Combine small icons into sprites
4. **SVG Optimization** - Optimize SVG files

## OptimizedImage Component

### Component Specification

```tsx
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean; // Preload critical images
  className?: string;
}
```

### Features

- ✅ AVIF with WebP fallback
- ✅ JPEG fallback for legacy browsers
- ✅ Responsive srcset generation
- ✅ Lazy loading by default
- ✅ Priority loading for critical images
- ✅ Automatic width/height inference
- ✅ Blur-up placeholder support

### Implementation

The component will use the `<picture>` element with source fallbacks:

```html
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description" loading="lazy">
</picture>
```

## Testing Checklist

- [ ] Test AVIF rendering in supported browsers
- [ ] Test WebP fallback in unsupported browsers
- [ ] Test JPEG fallback in legacy browsers
- [ ] Test lazy loading behavior
- [ ] Test priority loading for critical images
- [ ] Test responsive srcset on different screen sizes
- [ ] Verify LCP improvement with optimized images

## Expected Improvements

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Image Payload | ~500 KB | < 200 KB | 60% |
| LCP (Images) | ~2.5s | < 1.5s | 40% |
| CLS (Images) | ~0.1 | < 0.05 | 50% |
| Bandwidth Usage | ~500 KB/page | < 200 KB/page | 60% |

## Status

**Overall Status:** ⚠️ Partially Complete

**Completed:** Audit of existing infrastructure
**In Progress:** Adding AVIF support and OptimizedImage component
**Next Steps:** Implement OptimizedImage component and update optimization script
