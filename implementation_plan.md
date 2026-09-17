# Implementation Plan

[Overview]

Harden the Cinematic Hero & LUT Pipeline (Phases A–C) by fixing the six defects identified in the 2026-09-16 audit of `client/components/CinematicHero.tsx`, `client/components/LutPipelineCanvas.tsx`, `client/hooks/useIntersectionPlay.ts`, and `client/shaders/*`, correcting the verification claims in `docs/cinematic-hero-lut-pipeline.md`, and re-establishing a trustworthy test/typecheck verification record.

The audit found the rollout functional but overstated: (1) the LUT hero does not fall back to the static poster on late media errors, LUT-load failures, or WebGL unavailability; (2) autoplaying looping video with no user pause control does not satisfy WCAG 2.2.2 (pause/stop/hide) merely because `prefers-reduced-motion` is honored; (3) the WebGL shader stretches the video instead of applying cover-crop, so it visibly mismatches the poster's `background-size: cover` composition; (4) the R3F render loop keeps running while the video is paused off-screen; (5) `useIntersectionPlay` never observes a video that mounts after a reduced-motion preference change, and neither observer enforces the documented "≥25% visible" playback condition; (6) several test assertions do not verify the behaviors they claim (e.g. the "threshold 0.25" test only asserts `window.IntersectionObserver` exists, and the cleanup test never asserts `VideoTexture.dispose()`).

Scope: client-only changes plus documentation. No server, Prisma, or dependency changes. Approach: reuse existing building blocks — the `useVideoAutoplay` hook (already implements visibility-gated autoplay with failure state), the existing `ErrorBoundary` class, the play/pause toggle pattern from `client/components/framer/VideoOverlayBackground.tsx`, and the `hero-*` CSS classes in `client/global.css`. Intensity math and shader LUT sampling logic are unchanged except for aspect-ratio correction via a cover transform. The prior Phase-6 Marketing Navigator plan is preserved at `docs/marketing-navigator-implementation-plan-2026-09-14.md`.

## Phase 6 status (2026-09-14) — DONE, verified green

- Contracts (`MarketingNavigatorQuerySchema`, `NavigatorRecommendationSchema`, `MarketingNavigatorAnswerSchema`) in `shared/marketing-contracts.ts`.
- `searchCampaigns` on `MarketingHybridRetrievalService` (semantic campaign search + product hydration).
- `MarketingNavigatorService` rewritten (`buildContext`, `answer`, `recommendations`, `formatGroundedContext`, `buildTemplateAnswer`, `buildSuggestions`, deprecated `exploreMarketingGraph` wrapper).
- `GET /api/marketing/navigator` + `GET /api/marketing/navigator/recommendations` (auth-gated, Zod-validated, `{data, success:true}`).
- Omni-Command consumes `buildContext` + `formatGroundedContext` (claims/assets/campaigns/top-3 recs).
- Client `Navigator.tsx` marketing grounded view via `apiClient.get('/marketing/navigator?q=…')` with evidence anchors + graph paths.
- Tests: 12 service + 6 route + mount-order green; `npm run typecheck` clean; full marketing suite 38 passed / 3 skipped (pgvector-gated skips).
- Incidental fix: removed non-schema `metadata` write in `content-os.service.ts` (only tsc failure).

[Types]

One new shared module; prop additions to existing component interfaces; one uniform added to the shader contract.

```ts
// client/components/heroTypes.ts (new) — shared contract for motion-state controls
import type React from "react";

export interface MotionControls {
  /** True when the user paused playback via the accessible control. */
  userPaused: boolean;
  /** Accessible pause/play toggle badge (reuses VideoOverlayBackground styling). */
  toggle: React.ReactNode;
}

export const DEFAULT_CONTROLS_LABEL = "Background motion";
```

Prop additions (both `CinematicHeroProps` and `LutPipelineCanvasProps`):

- `showPauseControl?: boolean` — default `true`; may be `false` only for decorative loops under 5 s (WCAG 2.2.2 exception). Both current usages in `Index.tsx` (hero at ~L667, footer at ~L2452) keep the control enabled.
- `controlsLabel?: string` — aria-label prefix; defaults to `ariaLabel`.

Internal shader contract: `LutSceneProps` gains `coverRef: React.MutableRefObject<{ sx: number; sy: number; ox: number; oy: number }>` and the material gains `uniform vec4 uCoverTransform` (`sx, sy, ox, oy` packed). No Zod/schema changes; no server types touched.

[Files]

One new shared module, three modified source files, two modified shaders, two modified test files, one new Playwright spec, one modified doc; the helper audit scripts are cleaned up at the end.

New files:

- `client/components/heroTypes.ts` — `MotionControls` interface and `DEFAULT_CONTROLS_LABEL` shared by both hero components.
- `e2e/cinematic-hero.spec.ts` — Playwright spec covering pause control, reduced-motion fallback, poster-first paint, and canvas render gating in a real browser.

Modified files:

- `client/hooks/useIntersectionPlay.ts` — re-observe on element mount (fixes the reduced-motion→standard-motion remount gap), enforce `intersectionRatio >= threshold` before playing, accept `pausedRef` so a user pause survives scroll re-entry.
- `client/components/CinematicHero.tsx` — integrate `useVideoAutoplay`; add late `error` listener; add accessible pause/play toggle (pattern from `VideoOverlayBackground.tsx`); bind observer to the actually mounted `<video>`.
- `client/components/LutPipelineCanvas.tsx` — (a) `video.addEventListener('error')` → `setHasError`; (b) `TextureLoader.load(url, onLoad, undefined, onError)` → `setHasError`; (c) gate R3F `frameloop` on visibility (`'always' | 'never'`) driven by the existing IntersectionObserver plus `document.visibilitychange`; (d) cover-crop UV math in `LutScene` (see [Functions]); (e) accessible pause control; (f) wrap `<Canvas>` in the existing `ErrorBoundary` (`client/components/ErrorBoundary.tsx`) with the static-poster div as `fallback` so a WebGL context failure cannot crash the hero.
- `client/shaders/lutShader.vert` / `client/shaders/lutShader.frag` — add `uniform vec4 uCoverTransform`; vertex shader maps `uv` through cover scale/offset into `vCoverUv`; fragment shader samples `uTexture` with `vCoverUv` (LUT math itself unchanged).
- `client/pages/Index.tsx` — no JSX changes required (controls default on); verify `ariaLabel` values read well as control labels.
- `docs/cinematic-hero-lut-pipeline.md` — correct the intensity clamp to `0.35–0.95` (currently documented as `0.45–0.95`); remove the "zero CLS" claim (poster preload addresses LCP only); restate LCP as a timing metric, not a score; document the pause control, cover-crop math, render gating; re-point verification claims at the actual test suites.
- `client/test/setup.ts` — only if tests need shared `MockIntersectionObserver` instance tracking.
- Cleanup at the end: remove `run-audit.bat`, `run-audit.ps1`, `run-tests.bat`, `audit-stdout.txt`, `audit-stderr.txt` (malformed-invocation leftovers) — flagged for user confirmation at execution time.

Configuration updates: none (no env vars, no Vite/Vitest changes needed — canvas polyfill and glslPlugin already wired).

[Functions]

Modified functions only plus two new helpers; no function removals.

New functions:

- `computeCoverTransform(containerW, containerH, videoW, videoH): { sx, sy, ox, oy }` — module-local pure helper in `client/components/LutPipelineCanvas.tsx`; standard cover-crop math (scale to cover, center offset); unit-testable in isolation.
- `MotionToggle({ paused, label, onToggle })` — `client/components/heroTypes.tsx` (or co-located in each component if preferred); the accessible pause/play badge: `<button type="button" aria-label={paused ? `Play ${label}` : `Pause ${label}`} aria-pressed={paused}>` styled like the `VideoOverlayBackground` toggle (border-white/15 bg-black/70 backdrop-blur-md, bottom-right).

Modified functions:

- `useIntersectionPlay(ref, threshold, opts?)` — `client/hooks/useIntersectionPlay.ts`. (1) Callback checks `entry.intersectionRatio >= threshold` (not just `isIntersecting`) before `play()`; (2) effect keyed on the resolved element (`const [el, setEl] = useState<HTMLVideoElement | null>(null)`, set from `ref.current` on mount/effect) so a video mounted after a reduced-motion flip is observed; (3) `opts?: { pausedRef?: MutableRefObject<boolean> }` — never call `play()` when `pausedRef.current` is true, so a user pause survives scroll re-entry.
- `CinematicHero` — `client/components/CinematicHero.tsx`. Replace the inline `play().catch()` effect with `useVideoAutoplay(videoRef, reduced || failed)` (existing hook at `client/hooks/useVideoAutoplay.ts`, already handles `document.hidden` and rejection → `hasFailed`); keep `onError` and add a mounted `error` listener for post-load failures; add `userPaused` state wired to `MotionToggle`; pass `pausedRef` into `useIntersectionPlay`.
- `LutScene` — `client/components/LutPipelineCanvas.tsx`. (1) Compute cover transform from `useThree(s => s.viewport)` and `video.videoWidth/videoHeight` (via `computeCoverTransform`) into a `uniform vec4 uCoverTransform` on `shaderMaterial`, refreshed in `useFrame` when dimensions change; (2) early-return `useFrame` body when `visibleRef.current === false` or `document.hidden` (the `frameloop` prop suspends the loop; the ref guard covers the transition frame).
- `LutPipelineCanvas` — same file. (1) video-creation effect gains `vid.addEventListener('error', handleError)` (removed in cleanup); (2) LUT texture loads with an error callback → `setHasError(true)`; (3) IntersectionObserver effect additionally drives `visibleRef` + `frameloop` state from `isIntersecting` and `document.visibilitychange`; (4) add `MotionToggle` identical to CinematicHero's; (5) cleanup adds `vid.removeEventListener`.
- `maskClass(mask)` (both components) — unchanged.

Removed functions: none.

[Classes]

- `LutScene` (internal function component, `client/components/LutPipelineCanvas.tsx`) — modified as in [Functions]; gains `useThree` usage, `uCoverTransform` uniform, and visibility-guarded `useFrame`; no class semantics change.
- No new classes; no classes removed. `ErrorBoundary` (`client/components/ErrorBoundary.tsx`) is reused as-is: wrap the `<Canvas>` subtree so a WebGL context-creation failure falls back to the static poster instead of crashing the hero section.

[Dependencies]

None. Uses existing `@react-three/fiber` (`useThree`, `frameloop`), `three`, the existing `useVideoAutoplay`/`useReducedMotion` hooks, `ErrorBoundary`, and Playwright (already in devDependencies). No new packages, no version changes, no Prisma or server changes.

[Testing]

Strengthen the two Vitest suites, add the missing behavioral assertions, and add a Playwright spec for the guarantees jsdom cannot verify.

Modified tests:

- `client/test/components/CinematicHero.test.tsx` — replace the "registers IntersectionObserver with threshold 0.25" body: assert `new IntersectionObserver(cb, { threshold: 0.25 })` was constructed with that options object and `.observe()` received the video element (expose instances on the setup mock or construct a local capture class). Add: (a) observer re-attached when reduced-motion flips false after mount (simulate a `matchMedia` `change` event); (b) `play()` NOT called when `intersectionRatio < 0.25` even though `isIntersecting` is true; (c) pause toggle renders, is keyboard-operable, calls `pause()`, and a paused video is not resumed by scroll re-entry (`pausedRef` honored); (d) late `error` event after successful initial play still flips to `.hero-poster-static`.
- `client/test/components/LutPipelineCanvas.test.tsx` — add: (a) cleanup asserts `VideoTexture.prototype.dispose`, LUT texture dispose, and `ShaderMaterial.dispose` (spy on prototypes); (b) reduced-motion test additionally asserts `document.createElement` was never called with `'video'`; (c) late `video` `error` event → `.hero-poster-static`; (d) LUT loader error (mock `THREE.TextureLoader.load` to invoke its error callback) → `.hero-poster-static`; (e) `computeCoverTransform` unit cases (16:9 video in portrait container, square video in 21:9 container, degenerate zero-size video); (f) `frameloop` equals `'never'` when the container is off-screen (drive the captured observer callback with `isIntersecting: false`).
- New `e2e/cinematic-hero.spec.ts` (Playwright, real Chromium, existing `playwright.config.ts` webServer on :5173): (1) hero paints poster background before video decode — assert `.hero-canvas`/`.hero-video` background-image immediately after `page.goto('/')` (no black flash); (2) pause toggle visible, keyboard-focusable, sets `video.paused === true` after click/Enter; (3) `page.emulateMedia({ reducedMotion: 'reduce' })` → zero `<video>` and zero WebGL canvas present, `.hero-poster-static` shown; (4) video not distorted — rendered element box aspect ratio within ±2% of `videoWidth/videoHeight` at a non-native viewport (e.g. 1440x900).

Validation strategy (report only observed results):

1. `npx vitest run client/test/components/CinematicHero.test.tsx client/test/components/LutPipelineCanvas.test.tsx` — all green.
2. `npm run typecheck` — exit 0.
3. `npm run build:client` — clean exit; bundle sizes comparable to baseline (three-vendor ~695 kB, r3f-vendor ~609 kB).
4. `npx playwright test e2e/cinematic-hero.spec.ts` — dev server via existing webServer config. Per the audit lesson, an unobserved/failed run is reported as unverified, never as passing.

[Implementation Order]

Hooks first (shared behavior both components depend on), then shaders (pure), then each component, then tests, docs, and verification.

1. `client/components/heroTypes.ts` — shared `MotionControls` type + `MotionToggle` helper.
2. `client/hooks/useIntersectionPlay.ts` — element-mount observation, ratio enforcement, `pausedRef` support.
3. `client/shaders/lutShader.vert` / `lutShader.frag` — `uCoverTransform` uniform (vertex maps uv; fragment uses mapped uv for `uTexture` only).
4. `client/components/LutPipelineCanvas.tsx` — late-error handling, LUT-load error, visibility-gated `frameloop`, `computeCoverTransform`, ErrorBoundary wrap, pause control.
5. `client/components/CinematicHero.tsx` — `useVideoAutoplay` integration, late-error listener, pause control, observer bound to the mounted video.
6. Strengthen `client/test/components/CinematicHero.test.tsx` and `LutPipelineCanvas.test.tsx`; touch `client/test/setup.ts` only if shared observer-instance tracking is needed.
7. `e2e/cinematic-hero.spec.ts` — real-browser guarantees.
8. `docs/cinematic-hero-lut-pipeline.md` — correct intensity bounds (0.35–0.95), CLS/LCP wording, LCP-as-timing wording; document pause control, cover-crop math, render gating; re-point verification claims at the actual suites.
9. Final verification pass: vitest → typecheck → build → Playwright, reporting only observed exit codes; confirm with the user before deleting the leftover helper scripts (`run-audit.bat`, `run-audit.ps1`, `run-tests.bat`, `audit-stdout.txt`, `audit-stderr.txt`).
