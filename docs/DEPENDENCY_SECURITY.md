# Dependency Security Posture (Dependabot)

_Last audited: 2026-10-13 · `npm audit` on the pinned `package-lock.json`._

## Current counts
`npm audit` reports **1 critical / 48 high / 13 moderate / 2 low** across the full
dependency tree (runtime + dev). The GitHub push notice surfaces a smaller subset
(~10 high / 11 moderate / 1 low) because it only counts direct-dependency alerts.

## Why `npm audit fix --force` is NOT applied here
Every remaining fix requires a **breaking major-version bump** of a direct
dependency. `npm audit fix` (no `--force`) resolves only **one** transitive issue
(64 → 63) and cannot touch the rest. Forcing would rewrite core build tooling and
very likely break the production build/deploy:

| Direct dep | Current | Forced target | Blast radius |
|------------|---------|---------------|--------------|
| `tailwindcss` | v3.4.x | **v4.3.x** | Tailwind v4 changes the entire config format (`@tailwind` directives → CSS-first `@theme`), PostCSS plugin, and content detection. A blind bump breaks all styling + `global.css`. |
| `firebase-tools` | v14 | **v15.33** | Deploy CLI major; changes deploy/emulator flags and login flow used by `.github/workflows/deploy.yml`. |
| `@lhci/cli` | — | **0.1.0** | Lighthouse CI (perf budget gate) major. |
| `@size-limit/*` | 8.x | **11.x** | Bundle-size budget tool major. |
| `puppeteer-core` / `lighthouse` | — | via `@lhci/cli` | Transitive to the LHCI major. |
| `@tailwindcss/typography` | 0.5.x | **0.5.4** (moderate) | Plugin bump, low risk but still semver-major per audit. |

Most of the high/critical findings are **transitive dev/build-tooling** packages
(`tar`, `tmp`, `jest-*`, `braces`, `micromatch`, `nanoid`, `inquirer`,
`external-editor`) reached through `firebase-tools`, `@lhci/cli`, `@size-limit/*`,
and the Jest toolchain. **None are in the production browser bundle** — they only
affect local dev, CI lint/test tooling, and the deploy CLI. This is why the
deployed site is not directly exposed by them.

## Recommended migration plan (deliberate, one at a time, each build-verified)
1. **Tailwind v3 → v4** (highest effort): follow the official
   [upgrade guide](https://tailwindcss.com/docs/upgrade-guide). Convert
   `tailwind.config.ts` → CSS-first `@theme` in `global.css`, swap the PostCSS
   plugin to `@tailwindcss/postcss`, then run `npm run build:client` + the visual
   smoke suite before merging. Do this in its own PR.
2. **firebase-tools v14 → v15**: dry-run `firebase deploy --dry-run` against
   staging; adjust `scripts/deploy-firebase.*` and `deploy.yml` for any flag
   changes.
3. **@lhci/cli / @size-limit / puppeteer**: bump with their migration notes;
   re-run the perf/size CI jobs.
4. Re-run `npm audit` after each and track the residual.

## Interim mitigation
- Keep dependencies pinned; do not run `npm audit fix --force` on `main`.
- Dependabot PRs for transitive patches that **do not** force a direct-dep major
  can be merged individually once CI (typecheck + `test:unit` + build) is green.
- The non-forced `npm audit fix` (safe transitive patches only) may be run on a
  branch and merged after a full build + `test:unit` verification.
