# UI Component Accessibility Report — WCAG 2.1 AA

> **Created:** 2026-10-07 (Sprint 2, Task 6 of [FRONTEND_MODERNIZATION_PLAN.md](../../docs/FRONTEND_MODERNIZATION_PLAN.md))
> **Scope:** all 49 components in `client/components/ui/`
> **Companion data:** [COMPONENT_INVENTORY.md](./COMPONENT_INVENTORY.md) · raw signals in `.temp/ui-analysis.json`

## Methodology & Limitations

This is a **static source audit** (automated signal extraction + manual reading
of flagged files). It establishes a baseline; it does **not** replace:

- **axe-core automated runs** — arrive in Sprint 5 (Task 17, `vitest-axe` + `@axe-core/playwright`)
- **Screen reader testing** (NVDA/VoiceOver) — Sprint 7 (Task 25)
- **Runtime behavior testing** (focus traps, live announcements) — Sprint 6 (Tasks 21–24)

**Scoring heuristic (0–10):** +3 Radix primitive (ships keyboard/ARIA/roving
semantics), +2 explicit `aria-*` in source, +1 `role=`, +1 keyboard handlers,
+1 focus handlers, +1 label affordances, +1 ref forwarding, +1 if static
(lower risk). Score ≤ 2 on an **interactive** component = flagged.

## Baseline Score Distribution

| Band | Count | Components |
|------|-------|-----------|
| 7–8 (strong) | 4 | breadcrumb (8), form (7), navigation-menu (7), sidebar (7) |
| 4–6 (Radix baseline) | 32 | all Radix wrappers (button, dialog, select, tabs, toast…) |
| 3 (thin) | 3 | aspect-ratio, collapsible, drawer |
| 1–2 (weak) | 12 | input, textarea, badge, card, table, calendar, skeleton, sonner, toaster, resizable, chart, ErrorBoundary |
| **0 (none)** | **1** | **ErrorBoundary** |

## Findings by Severity

### HIGH — fix in Phase 2 (Sprint 6–8)

| ID | Component(s) | Finding | WCAG | Remediation |
|----|--------------|---------|------|-------------|
| H1 | `ErrorBoundary` (score 0, router-level) | Error fallback renders title/description as plain divs; no `role="alert"` / live-region announcement, so screen readers never hear an error occurred. | 4.1.3 | Wrap fallback message in `role="alert"`; `aria-label` icon-only actions |
| H2 | `input` (score 1, **31 files**) | Pure passthrough — no label association, no `aria-describedby`/`aria-invalid` error wiring. Correctness depends on 31 call sites; `form.tsx` shows the right pattern but most usages bypass it. | 1.3.1, 3.3.2, 4.1.2 | Task 58: built-in label/error props; audit call sites |
| H3 | `textarea` (score 1, 6 files) | Same as H2 for multi-line inputs. | 1.3.1, 3.3.2, 4.1.2 | Same as H2 |
| H4 | `calendar` (score 1, 2 files) | `react-day-picker` renders interactive day buttons; source has no `aria-*` overrides or keyboard guidance — needs runtime verification. | 2.1.1 | Verify day-picker built-ins; add nav labels if missing |


### MEDIUM — Sprint 5–6

| ID | Component(s) | Finding | WCAG | Remediation |
|----|--------------|---------|------|-------------|
| M1 | `form` vs bare inputs | Only `form.tsx` wires `aria-describedby`/`aria-invalid` (score 7). The pattern exists but is not the default — every bare `Input`/`Textarea` use is a potential violation. | 3.3.1, 3.3.3 | Make FormField the required path; lint rule (Task 62) flags bare inputs in forms |
| M2 | `card` (52 files), `table` (4), `chart` (0) | No semantic landmarks/headers baked in (`<table>` uses correct elements ✓, but chart has no text alternative). | 1.1.1 | Chart: `role="img"` + `aria-label` from config; Card: heading-level guidance |
| M3 | `alert` | Has `role="alert"` ✓, but `AlertTitle` renders a `<div>` not `<h*>` — heading structure depends on call site. | 1.3.1 | Verify call sites; consider `role="heading"` level prop |
| M4 | 17 unused components | Zero real-world usage = zero runtime verification (accordion, carousel, menubar, sidebar…). Radix defaults are good but unvalidated against our theme/focus styles. | — | Sprint 13 Storybook pass with axe per story |

### LOW / INFO

- `sonner`/`toaster` (score 1): thin wrappers around library-managed toasts —
  Sonner handles `role="status"` internally; verify in Sprint 7 screen reader pass.
- `badge` (score 1, 46 files): static text container — risk only if used to
  convey meaning by color alone (WCAG 1.4.1). Audit call sites in Sprint 8.
- Global focus indicators: `global.css` provides `:focus-visible` outline
  (`--hud-phosphor`, 2px) — covers components lacking local focus styles.

## What Radix Already Gives Us (32 components)

- **Dialog/Sheet/AlertDialog:** focus trap + restore + `aria-modal` + titled dialogs
- **Select/Tabs/Dropdown/Menubar/Popover:** roving tabindex, typeahead, `aria-expanded`
- **Checkbox/Switch/RadioGroup/Slider:** `aria-checked`/`aria-valuenow` + arrow keys

These still require **runtime verification** (Sprint 5 axe + Sprint 6 keyboard
tests) but are not expected to need source changes.

## Compliance Snapshot (evidence-based, static only)

| WCAG 2.1 AA Criterion | Status | Evidence |
|-----------------------|--------|----------|
| 1.1.1 Non-text content | ⚠️ Partial | Chart/avatars lack alt wiring; icon buttons unverified |
| 1.3.1 Info & relationships | ⚠️ Partial | table/alert semantic elements present; headings call-site dependent |
| 2.1.1 Keyboard | ✅ Baseline | 32 Radix wrappers; native elements for input/textarea/button |
| 2.4.7 Focus visible | ✅ | Global `:focus-visible` outline in `global.css` |
| 3.3.2 Labels | ❌ | `input`/`textarea` provide no label mechanism (H2/H3) |
| 4.1.2 Name/Role/Value | ⚠️ Partial | Radix OK; ErrorBoundary + bare inputs flagged |
| 4.1.3 Status messages | ❌ | ErrorBoundary has no live announcement (H1) |
| 1.4.3 Contrast | ⏳ Not assessed | Sprint 8 (Task 29) color audit |

**Overall: "Needs Remediation" — 0 runtime-verified violations (no axe yet), 4 HIGH source findings.**

## Remediation Roadmap

1. **Sprint 5:** axe baseline (`vitest-axe` on top-10 components) → replace static guesses with real violations
2. **Sprint 6:** focus/keyboard tests for `ErrorBoundary`, `dialog`, `command` launcher
3. **Sprint 7:** NVDA pass over landing, navigator, dashboard forms
4. **Sprint 8:** contrast audit + `role="alert"` fix verification
5. **Sprint 14:** component tests include axe assertions (Task 56) so findings cannot regress
