# Accessibility Compliance Report

> **Task 32** — Phase 2, Sprint 8 (`docs/FRONTEND_MODERNIZATION_PLAN.md`)
> **Scope:** FeexSystems Living Intelligence World frontend (React 18 SPA)
> **Target standard:** WCAG 2.1 Level AA
> **Report date:** 2026-10-09 · **Status:** Automated checks green; manual assistive-tech testing outstanding

This report is the consolidated compliance record for Phase 2. It aggregates the
detailed per-topic audits rather than replacing them, and states plainly what is
**verified by automation**, what is **implemented but unverified**, and what is
**not yet done**.

---

## 1. Methodology

| Layer | Tool | What it proves | Limits |
| --- | --- | --- | --- |
| Unit a11y | `vitest-axe` (`client/test/a11y/index.test.tsx`) | Component contracts: roles, names, labels, landmarks | Renders in `jsdom`; no layout, no real AT |
| Contrast | `client/test/a11y/contrast.test.ts` | Parses **live CSS tokens** and asserts ≥4.5:1 text / ≥3:1 UI | Only token pairs enumerated; not painted pixels |
| Utilities | `client/test/a11y/utils/index.test.ts` | Keyboard simulation, focus trap, ARIA helpers, contrast math | Verifies the helpers, not every consumer |
| Static analysis | ESLint `jsx-a11y/*` (root flat config, CI-blocking) | Common misuse at source level | Cannot judge semantics |
| Runtime dev audit | `@axe-core/react` in `client/src/main.tsx` (DEV only) | axe rules against the real DOM | Dev builds only; not a CI gate |
| E2E | `@axe-core/playwright` (`e2e/accessibility.spec.ts`) | Rendered-page scans in a real browser; live-region and skip-link verification | Chromium-focused baseline; cannot detect whether a screen reader actually *speaks* |

**Reproduce:**

```bash
npm run test:a11y     # 25 tests — Vitest + vitest-axe + contrast
npm run lint          # jsx-a11y/* — 0 errors
npm run test:e2e      # @axe-core/playwright page scans
```

**Current automated result:** `test:a11y` → **25 / 25 passing** (2026-10-09);
`jsx-a11y/*` → **0 errors**; `e2e/accessibility.spec.ts` → axe scans on
`/`, `/projects`, `/navigator`, `/evidence` plus live-region and skip-link checks.

> **Correction (2026-10-09):** an earlier revision of this table listed E2E axe scans as
> existing methodology. `@axe-core/playwright` was installed but **no spec used it** — the
> scans described here were written as part of this report's own review, and are now real.

---

## 2. WCAG 2.1 AA criteria status

Legend: **✅ Verified** (automated evidence) · **🔧 Implemented, needs AT verification** · **➖ Not applicable** · **➕ Outstanding**

### Principle 1 — Perceivable

| Criterion | Level | Status | Evidence / notes |
| --- | --- | --- | --- |
| 1.1.1 Non-text Content | A | 🔧 | Decorative canvases marked `aria-hidden`; meaningful 3D content needs text alternatives (see §4) |
| 1.2.x Time-based Media | A/AA | 🔧 | Landing scene videos: no captions/transcripts for narrative video |
| 1.3.1 Info and Relationships | A | ✅ | `role="main"` in `App.tsx`; landmark audit in `docs/ARIA_LANDMARKS.md` |
| 1.3.2 Meaningful Sequence | A | ✅ | DOM order matches visual order on audited pages |
| 1.3.5 Identify Input Purpose | AA | 🔧 | Auth forms use `type="email"`; `autocomplete` attributes not audited |
| 1.4.1 Use of Color | A | ✅ | State conveyed by text/icon as well as colour |
| 1.4.3 Contrast (Minimum) | AA | ✅ | `client/test/a11y/contrast.test.ts` — text ≥4.5:1 |
| 1.4.4 Resize Text | AA | 🔧 | Relative units used; not verified at 200% zoom in-browser |
| 1.4.10 Reflow | AA | 🔧 | Responsive layouts exist; not verified at 320px / 400% zoom |
| 1.4.11 Non-text Contrast | AA | ✅ | UI + focus indicators ≥3:1 (`docs/CONTRAST_REPORT.md`) |
| 1.4.12 Text Spacing | AA | 🔧 | Not explicitly tested |
| 1.4.13 Content on Hover/Focus | AA | 🔧 | Radix tooltips used; dismissal behaviour unverified |

### Principle 2 — Operable

| Criterion | Level | Status | Evidence / notes |
| --- | --- | --- | --- |
| 2.1.1 Keyboard | A | ✅ | Keyboard audit (`docs/KEYBOARD_NAVIGATION_AUDIT.md`); focus trap utilities tested |
| 2.1.2 No Keyboard Trap | A | ✅ | `trapFocus` / `createFocusTrap` restore correctly (14 tests) |
| 2.2.1 Timing Adjustable | A | ➖ | No time-limited user interactions |
| 2.4.1 Bypass Blocks | A | ✅ | `SkipLink` → `#main-content` in `App.tsx` |
| 2.4.2 Page Titled | A | ✅ | `RouteTitle` in `App.tsx` sets `document.title` per route **and** announces the change on client-side navigation (verified in E2E) |
| 2.4.3 Focus Order | A | ✅ | Focus order audit; modal focus management tested |
| 2.4.4 Link Purpose (In Context) | A | ✅ | Links have discernible text or `aria-label` |
| 2.4.6 Headings and Labels | AA | ✅ | Heading-order + label associations fixed in the lint burn-down |
| 2.4.7 Focus Visible | AA | ✅ | `.focus-visible` baseline; `docs/FOCUS_INDICATOR_SPEC.md` |
| 2.5.3 Label in Name | A | 🔧 | Icon buttons use `aria-label`; a `PublicRoute`-style audit of all matches pending |

### Principle 3 — Understandable

| Criterion | Level | Status | Evidence / notes |
| --- | --- | --- | --- |
| 3.1.1 Language of Page | A | 🔧 | `lang` on `<html>`; not asserted in tests |
| 3.2.1 On Focus | A | ✅ | No context change on focus |
| 3.2.2 On Input | A | ✅ | Forms submit explicitly; no auto-navigation |
| 3.3.1 Error Identification | A | ✅ | Zod messages rendered with `role="alert"` (`docs/FORM_ACCESSIBILITY_AUDIT.md`) |
| 3.3.2 Labels or Instructions | A | ✅ | Every input labelled; `aria-describedby` wired |
| 3.3.3 Error Suggestion | AA | ✅ | Messages state the requirement, e.g. "Password must contain at least one number" |
| 3.3.4 Error Prevention | AA | 🔧 | Password confirm + review screens; legal/financial flows out of scope |

### Principle 4 — Robust

| Criterion | Level | Status | Evidence / notes |
| --- | --- | --- | --- |
| 4.1.2 Name, Role, Value | A | ✅ | axe-scanned components; `CommandLauncher` listbox corrected (see §3) |
| 4.1.3 Status Messages | AA | 🔧 | **Task 28** — live regions wired into all four named surfaces (form results, command execution, navigation changes, loading states). DOM mutation verified in E2E; real screen-reader speech still unverified — see §4 |

---

## 3. Defects found and fixed (2026-10-09 triage)

These were real accessibility bugs surfaced while repairing the test suite, not
test-only issues:

| Defect | Impact | Fix |
| --- | --- | --- |
| `CommandLauncher` container had `aria-hidden="true"` around the live `role="dialog"` | The entire command launcher was **invisible to assistive tech** | Removed `aria-hidden`; `aria-modal="true"` isolates the dialog correctly |
| Shortcut tiles exposed as `role="button"` inside a `role="listbox"` | Invalid ARIA pairing; wrong role announced | Tiles are `role="option"` with `aria-selected` |
| `announceToScreenReader` appended a fresh live region per call | Competing `role="status"` nodes; later messages shadowed | Replaced by two persistent regions (Task 28) |
| `handleJavaScriptError` also reported resource errors | Every failed image/script logged twice | Guarded: plain `error` events with no message/Error are ignored |
| `AuthService` leaked `passwordHash` in API responses | Not a11y — but a real security defect found in the same pass | `toPublicUser()` redaction |

---

## 4. Known outstanding work

**Requires manual assistive-technology testing** (`docs/SCREEN_READER_AUDIT.md` marks these *Pending manual testing*):

- **NVDA (Windows)** and **VoiceOver (macOS/iOS)** passes over `/`, `/projects`, `/navigator`, `/world`, `/login`, `/register`.
- Live-region announcements are implemented and **wired into all four surfaces** named by Task 28
  (form results, command execution, navigation changes, loading states), with the DOM mutation and
  region roles verified in `e2e/accessibility.spec.ts`. What remains unverified is whether a real
  screen reader **speaks** them — automation cannot close that gap.

**Requires browser-level verification:**

- 200% zoom / 400% reflow (1.4.4, 1.4.10), text-spacing overrides (1.4.12).
- Tooltip hover/focus dismissal (1.4.13).
- Per-route document titles (2.4.2).

**Requires content decisions (not code):**

- **3D content alternatives.** `/world` communicates engineering topology spatially. It needs a textual/table equivalent and a documented non-visual path — the single largest known accessibility gap.
- **Media alternatives.** Landing scene videos (1.2.x) have no captions or transcripts.

**Deferred from this phase:**

- Task 26 residual — per-page landmarks (page-level `banner`/`navigation`/`contentinfo` beyond the app shell).
- Task 56 — per-component axe coverage beyond the current priority set.

---

## 5. Constraints and honest limits

- **`jsdom` is not a browser.** Automated passes prove component contracts, not rendering. Colour, overlap, and focus-ring visibility are token-level assertions only.
- **Contrast tests read tokens, not pixels.** A token pair can pass while an overlaid gradient fails in practice. Runtime spot-checks remain necessary.
- **axe catches roughly a third of WCAG issues.** A clean axe run is not a compliance claim.
- **`@axe-core/react` runs in DEV only** and is not a CI gate; E2E scans are Chromium-focused.

---

## 6. Compliance statement

> As of **2026-10-09**, the FeexSystems frontend **passes all automated accessibility
> checks in CI** (25 Vitest a11y tests, 0 `jsx-a11y` errors, axe E2E scans) and has
> remediated four confirmed accessibility defects plus one security defect found in the
> same audit cycle.
>
> It is **not yet WCAG 2.1 AA certified.** Certification requires the manual
> assistive-technology passes, browser-level zoom/reflow verification, and the content
> work (3D alternatives, media captions) listed in §4. This document will be updated
> when those complete.

---

## 7. References

| Document | Covers |
| --- | --- |
| `docs/ACCESSIBILITY_STANDARDS.md` | POUR principles, component patterns, testing checklist |
| `docs/ARIA_LANDMARKS.md` | Landmark implementation and gaps |
| `docs/CONTRAST_REPORT.md` | Token pairs, ratios, methodology |
| `docs/FOCUS_INDICATOR_SPEC.md` | Focus indicator audit against the global baseline |
| `docs/FORM_ACCESSIBILITY_AUDIT.md` | Label/error/`aria-describedby` wiring |
| `docs/KEYBOARD_NAVIGATION_AUDIT.md` | Reachability and focus order |
| `docs/SCREEN_READER_AUDIT.md` | Screen-reader findings (manual testing pending) |
| `client/components/ui/ACCESSIBILITY_REPORT.md` | Component-library baseline |
| `docs/FRONTEND_MODERNIZATION_PLAN.md` | Phase 2 task definitions (17–32) |
