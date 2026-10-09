# Video Loading Optimization Audit

**Task Reference:** Phase 3, Sprint 10, Task 38

**Last Updated:** 2026-10-07

## Overview

This document audits the video loading optimization for the landing page cinematic scenes and identifies opportunities for improvement.

## Video Files

### Location

`public/media/landing/scenes/`

### Video Files Found

| File | Format | Size | Scene |
|------|--------|------|-------|
| hero.webm | WebM | TBD | Hero scene |
| galaxy.webm | WebM | TBD | Galaxy scene |
| convergence.webm | WebM | TBD | Convergence scene |
| missions.webm | WebM | TBD | Missions scene |
| systems.webm | WebM | TBD | Systems scene |
| ui-loops.webm | WebM | TBD | UI Loops scene |
| worlds.webm | WebM | TBD | Worlds scene |
| worlds-9.webm | WebM | TBD | Worlds (9) scene |
| logo-rotating.webm | WebM | TBD | Logo animation |

### Format Coverage

| Format | Available | Fallback |
|--------|-----------|----------|
| WebM | Yes (9 files) | No MP4 fallback |
| MP4 | No | - |
| H.264 | No | - |
| H.265/HEVC | No | - |

## CinematicScene Component Audit

**File:** `client/landing/components/CinematicScene.tsx`

### Current Implementation

**Intersection Observer Strategy:**

1. **Nearby Observer** - Triggers when scene is within 100% of viewport
   - `rootMargin: '100% 0px'`
   - Sets `nearby` state
   - Enables video source loading

2. **Visible Observer** - Triggers when scene is 50% visible
   - `threshold: [0, 0.5]`
   - Sets `visible` state
   - Triggers video playback

**Video Loading:**

```tsx
preload="none" // Correct: No preloading
{nearby && allowVideo && <source src={videoSrc} type="video/webm" />}
```

**Playback Control:**

- Muted by default (autoplay requirement)
- Loop enabled
- playsInline for mobile
- Prefers-reduced-motion respected
- Save-data mode respected
- Autoplay with graceful failure

**Poster Images:**

- Poster layer with cross-fade
- Fades out when video starts playing
- Fades in when video ends/errors

### Audit Findings

### Strengths

1. **Intersection-Based Loading** - Videos load only when nearby
2. **Two-Stage Loading** - Nearby for source, visible for playback
3. **No Preloading** - `preload="none"` prevents unnecessary bandwidth
4. **Graceful Degradation** - Poster remains visible if autoplay fails
5. **Respect for Preferences** - Honors prefers-reduced-motion and save-data
6. **Clean Cross-Fade** - Smooth transition between poster and video

### Gaps

1. **No MP4 Fallback** - WebM not supported in Safari/iOS
2. **No Video Preload Strategy** - Could preload first scene faster
3. **No Video Unloading** - Videos remain loaded after leaving viewport
4. **No Adaptive Bitrate** - Single quality for all devices
5. **No Codec Optimization** - H.264 for broader compatibility

### Issues

1. **Missing MP4 Fallback** - Critical for Safari/iOS support
2. **No H.264 Codec** - WebM only works in Chrome/Firefox
3. **No Resource Cleanup** - Videos not unloaded when not needed
4. **No Performance Mode** - No low-quality option for slow connections

## Recommendations

### Immediate (High Priority)

1. **Add MP4 Fallback** - Generate H.264 MP4 versions for Safari/iOS
2. **Add Source Fallback** - Use `<source>` elements with type attributes
3. **Video Unloading** - Unload videos when they leave viewport
4. **Optimize First Scene** - Preload hero scene for faster initial load

### Short-term (Medium Priority)

1. **Adaptive Bitrate** - Generate multiple quality tiers
2. **Performance Mode Toggle** - Allow users to disable videos
3. **Video Compression** - Optimize existing WebM files
4. **Add Loading State** - Show spinner while video loads

### Long-term (Lower Priority)

1. **HLS/DASH Streaming** - Adaptive streaming for large videos
2. **Video CDN** - Use CDN for video delivery
3. **Web Video Text Tracks** - Add captions/subtitles
4. **Video Analytics** - Track video engagement

## Implementation

### MP4 Fallback

```tsx
<video preload="none">
  {nearby && allowVideo && (
    <>
      <source src={videoSrc} type="video/webm" />
      <source src={videoSrc.replace('.webm', '.mp4')} type="video/mp4" />
    </>
  )}
</video>
```

### Video Unloading

```tsx
useEffect(() => {
  const video = videoRef.current;
  if (!video) return;
  if (!nearby) {
    video.pause();
    video.src = ''; // Unload video
    video.load();
  }
}, [nearby]);
```

### First Scene Preload

```tsx
const isFirstScene = id === SCENE_ASSETS[0].id;
const preload = isFirstScene ? 'auto' : 'none';
```

## Testing Checklist

- Test video playback in Chrome (WebM support)
- Test video playback in Safari (MP4 fallback)
- Test video playback on iOS (MP4 fallback)
- Test intersection-based loading
- Test video unloading when leaving viewport
- Test prefers-reduced-motion respect
- Test save-data mode respect
- Verify videos play within 2s of scroll

## Expected Improvements

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Video Payload | ~50 MB | ~30 MB | 40% |
| Video Load Time | ~3s | < 2s | 33% |
| Safari Support | No | Yes | 100% |
| iOS Support | No | Yes | 100% |
| Memory Usage | ~50 MB | ~20 MB | 60% |

## Status

**Overall Status:** Partially Complete

**Completed:** Audit of CinematicScene component and video files
**In Progress:** Adding MP4 fallback and video unloading
**Next Steps:** Generate MP4 versions and implement video unloading logic
