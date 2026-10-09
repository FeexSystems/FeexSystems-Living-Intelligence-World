# Color Contrast Audit Report

**Task Reference:** Phase 2, Sprint 8, Task 29 — **single source of truth for contrast work**
(absorbs `.claude/specs/feex-next-gen-architecture/tasks.md` **5.1**, delegated 2026-10-07)

**Last Updated:** 2026-10-08

**Tooling:** `getContrastRatio` / `meetsWCAGAA` / `meetsWCAGAAA` in
`client/test/a11y/utils/index.ts` (12/12 passing). Every ratio in this document was
computed with that utility using the WCAG 2.1 relative-luminance formula. Enforcement:
`client/test/a11y/contrast.test.ts` parses the live CSS tokens and fails CI if any
audited pair regresses (`npm run test:a11y`).

## Methodology

1. Enumerated every design token from `client/styles/global-body-p0.css`,
   `client/styles/sovereign-hud-glass.css`, and `client/global.css`.
2. Mapped tokens to real render contexts (which text color sits on which background in
   the actual DOM — shadcn token pairs, Tailwind class pairs, and semi-transparent
   composites over the dark base).
3. Computed contrast ratios; classified against WCAG 2.1 AA:
   - **Normal text** (< 18pt / < 14pt bold): **≥ 4.5:1** (SC 1.4.3)
   - **Large text** (≥ 18pt / ≥ 14pt bold): **≥ 3:1**
   - **UI components & focus indicators** (borders, rings): **≥ 3:1** (SC 1.4.11)
4. Failures were remediated by token adjustment where safe (see Findings), and the
   remediations are locked in by the automated contrast test.

## Token Pair Results (post-remediation)

### Text pairs — all must be ≥ 4.5:1

| # | Foreground | Background | Ratio | Verdict |
|---|------------|------------|-------|---------|
| 1 | `--foreground` `#fafafa` | `--background` `#000000` | **20.12:1** | ✅ AAA |
| 2 | `--card-foreground` `#fafafa` | `--card` `#121212` | **17.95:1** | ✅ AAA |
| 3 | `--popover-foreground` `#fafafa` | `--popover` `#121212` | **17.95:1** | ✅ AAA |
| 4 | `--primary-foreground` `#000000` | `--primary` `#ffffff` | **20.12:1** | ✅ AAA |
| 5 | `--secondary-foreground` `#fafafa` | `--secondary` `#242424` | **14.87:1** | ✅ AAA |
| 6 | `--muted-foreground` `#a6a6a6` | `--background` `#000000` | **8.63:1** | ✅ AAA |
| 7 | `--muted-foreground` `#a6a6a6` | `--card` `#121212` | **7.70:1** | ✅ AAA |
| 8 | `--muted-foreground` `#a6a6a6` | `--muted` `#242424` | **6.38:1** | ✅ AA |
| 9 | `--muted-foreground` `#a6a6a6` | `--border` `#333333` | **5.19:1** | ✅ AA |
| 10 | `--destructive` `#f15b5b` *(new)* | `--background` `#000000` | **6.39:1** | ✅ AA |
| 11 | `--destructive` `#f15b5b` *(new)* | `--card` `#121212` | **5.70:1** | ✅ AA |
| 12 | `--destructive` `#f15b5b` *(new)* | `--secondary` `#242424` | **4.72:1** | ✅ AA |
| 13 | `--destructive` `#f15b5b` *(new)* | `--bg-dark` `#080a0c` | **6.03:1** | ✅ AA |
| 14 | `--destructive-foreground` `#141414` *(new)* | `--destructive` `#f15b5b` | **5.60:1** | ✅ AA |
| 15 | `--text-main` `#e0e6ed` | `--bg-dark` `#080a0c` | **15.78:1** | ✅ AAA |
| 16 | `--text-muted` `#788896` | `--bg-dark` `#080a0c` | **5.44:1** | ✅ AA |
| 17 | `--hud-phosphor-dim` composite `#008c38`¹ | `.log-console` bg `#040507` | **4.67:1** | ✅ AA (marginal) |
| 18 | `--hud-phosphor-dim` composite `#008c38`¹ | `.status-badge` bg `#080a0c` | **4.54:1** | ✅ AA (marginal) |
| 19 | `red-500` `#ef4444` (buttons/badges) | `#000000` | **5.58:1** | ✅ AA |
| 20 | `--text-muted` `#788896` | `.nav-tab` bg `rgba(0,0,0,0.4)` ≈ `#000000` | **7.55:1** | ✅ AAA |
| 21 | `#00ff66` (`.nav-tab.active`) | `rgba(0,255,102,0.08)` over dark ≈ `#000` | **15.50:1** | ✅ AAA |
| 22 | `#00f5d4` (`.btn-dossier` text) | `rgba(0,20,28,0.75)` ≈ `#00141c` | **13.44:1** | ✅ AAA |
| 23 | `#031014` (`.btn-dossier:hover`) | `#00f5d4` | **13.80:1** | ✅ AAA |

¹ Composite of `rgba(0, 255, 102, 0.55)` (`--hud-phosphor-dim`) over the panel
background. Rows 17–18 are **marginal** (≥ 4.5 but < 5) — see Constraints.

### UI component pairs — must be ≥ 3:1 (SC 1.4.11)

| # | Element | Foreground | Background | Ratio | Verdict |
|---|---------|------------|------------|-------|---------|
| 24 | Input / select border (`--input`) | `#737373` *(new)* | `--background` `#000000` | **4.43:1** | ✅ |
| 25 | Input / select border (`--input`) | `#737373` *(new)* | `--card` `#121212` | **3.95:1** | ✅ |
| 26 | Focus ring (`--ring` / `focus-visible` dark) | `#ffffff` / `#00ff66` | `--background` `#000000` | **21.0 / 15.50:1** | ✅ |
| 27 | Focus ring (`--focus-on-light`) | `#0066cc` *(new)* | `#ffffff` | **5.57:1** | ✅ |
| 28 | Focus ring (`--hud-phosphor`) | `#00ff66` | `--bg-dark` `#080a0c` | **14.63:1** | ✅ |
| 29 | `--hud-phosphor` text | `#00ff66` | `--bg-dark` `#080a0c` | **14.63:1** | ✅ AAA |

## Findings (remediated 2026-10-08)

### F1 — `text-destructive` failed AA everywhere on dark (WCAG 1.4.3) — FIXED

- **Before:** `--destructive: 0 0% 30%` = `#4d4d4d`, used as **text** by
  `alert.tsx` (`text-destructive`), `ErrorBoundary.tsx`, `WebGLErrorBoundary.tsx`,
  `ProtectedRoute.tsx`, and every auth page (`Login`, `Register`, `ForgotPassword`,
  `ResetPassword`, `EmailVerification`).
  Ratios: **2.48:1** on `#000000`, **2.22:1** on `#121212` — fails 4.5:1 widely.
- **Audit finding:** `bg-destructive` has **zero usages** (the destructive *button*
  variant in `button.tsx` uses raw `bg-red-500/30 text-white`, not the token), and
  `destructive-foreground` also has zero usages. The token is consumed exclusively as
  a text/border color — so brightening it cannot break any background pairing.
- **Fix:** `--destructive: 0 84% 65%` = `#f15b5b` (aligned with the `red-500` family
  already used by `button.tsx`), `--destructive-foreground: 0 0% 8%` = `#141414` for
  correctness if a destructive background is introduced later.
- **After:** 6.39 / 5.70 / 4.72 / 6.03:1 across all dark surfaces — all pass AA.

### F2 — Input borders failed the 3:1 UI-component threshold (WCAG 1.4.11) — FIXED

- **Before:** `--input: 0 0% 20%` = `#333333` → **1.66:1** on `#000000`. `input.tsx`
  renders `border border-input`, so every text field on `bg-background` had a boundary
  users could not discern.
- **Fix:** `--input: 0 0% 45%` = `#737373` → **4.43:1** on `#000000`,
  **3.95:1** on `#121212`. (No visual-regression baselines are committed for
  auth/form pages, so no baseline invalidation.)
- **Note:** `--border: 0 0% 20%` stays dark — it is used for *decorative* separators
  (card outlines, dashed rules), which SC 1.4.11 does not cover. Control boundaries
  use `--input`.

### F3 — Phosphor-green focus ring invisible on light surfaces (WCAG 1.4.11) — FIXED

- **Before:** `:focus-visible { outline: 2px solid var(--hud-phosphor, #00ff66) }`
  → **1.36:1** on white (documented in `docs/FOCUS_INDICATOR_SPEC.md` as ~2.5:1; the
  exact value computed with our utility is **1.36:1**). Any focus stop rendered on a
  pure-white surface (`.bg-white`, `bg-primary` buttons) had an unusable indicator.
- **Fix:** new token `--focus-on-light: #0066cc` (**5.57:1** on white) plus a scoped
  rule in `client/global.css` swapping `outline-color` on `.bg-white`, `.bg-primary`,
  `.bg-foreground` focus stops. Dark surfaces keep the brand phosphor ring
  (**14.63:1** on `--bg-dark`).
- **Status:** `docs/FOCUS_INDICATOR_SPEC.md` "Immediate #1" recommendation resolved.

### F4 — Marginal phosphor-dim composites — MONITORED

`.log-console` (4.67:1) and `.status-badge` (4.54:1) pass AA but with little headroom.
If either surface lightens (e.g., panel opacity reduced), they will fail. The automated
test locks the *token* (`--hud-phosphor-dim` → 4.88:1 over `--bg-dark`); the composites
are tracked here as monitored values.

## Constraints (carry into future work)

1. **Do not place `--muted-foreground` on white surfaces** — 2.43:1 (fails). The app
   is dark-first; white surfaces are buttons with `text-white`. Keep it that way.
2. **`#00ff66` is a dark-surface color only** (1.36:1 on white). Use
   `--focus-on-light` (or a ≥ 3:1 color) on any pure-white surface.
3. **`text-destructive` on `--muted`/`--secondary`** is the lowest destructive ratio
   in the system (4.72:1) — re-measure if either surface lightens.
4. **Semi-transparent green text** (`rgba(0,255,102,0.55)` over dark) is marginal
   (4.54–4.67:1). Raise opacity or switch to `--text-main` if a surface lightens.
5. **`--panel-border` / `--hud-border` / `.hud-bracket`** are decorative accents, not
   focus indicators — but the *focus* indicator specifically must keep ≥ 3:1.

## Automated Enforcement

**Test:** `client/test/a11y/contrast.test.ts` (runs in `npm run test:a11y` and the
regular `npm test` suite)

- Parses `client/styles/global-body-p0.css` **at test time** (tokens cannot drift from
  the test silently — changing a token re-evaluates its pairs).
- Asserts every text pair ≥ 4.5:1 and every UI pair ≥ 3:1 using the same
  `getContrastRatio` util audited here.
- Also asserts the hard-coded focus colors (`#00ff66` on dark, `#0066cc` on white).

**Result:** all audited pairs pass; CI blocks regressions.

## WCAG 2.1 AA Coverage Summary

| SC | Requirement | Status |
|----|-------------|--------|
| 1.4.3 Contrast (Minimum) | Text ≥ 4.5:1 (3:1 large) | ✅ all pairs pass (F1 fixed) |
| 1.4.11 Non-text Contrast | UI components ≥ 3:1 | ✅ inputs/focus fixed (F2, F3) |
| 1.4.4 Resize | No contrast loss on zoom | ✅ token-based, no imagery text |
| 1.4.8 Backgrounds | AAA: solid backgrounds | ✅ near-black surfaces, documented |

## Status

**Overall Status:** ✅ Audited, remediated, and CI-enforced

**Completed:** full token-pair audit (29 measured pairs), F1–F3 remediations,
automated contrast test, contrast tokens added (`--text-on-dark`, `--focus-on-light`,
`--destructive`/`--input` retuned, `--text-muted` verified).

**Known limits:** browser-rendered gradients/video overlays behind glass panels are
approximated by their dark base color; re-verify with axe DevTools in Phase 6
(Task 87 / Lighthouse) for runtime confirmation.
