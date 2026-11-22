# G2 Dependabot Triage Record

**Date:** 2026-11-22 · **Baseline:** `main@c9e298d8106b87aaab17c0a123bf64eae49ba2e7`
**Decisions recorded:** package manager = **pnpm (target; CI migration deferred — `npm ci` remains authoritative until workflows migrate)**; RTDB instance = **disabled/empty per owner console check — disable recommendation recorded**.

## 1. Package-manager decision impact

- pnpm is the declared target; `package-lock.json` stays until CI migrates from `npm ci` (~15 call sites across `test.yml`, `deploy.yml`, `lighthouse.yml`, `living-documentation.yml`).
- Until migration, **all 16 open alerts remain the working set** (10 pnpm-lock + 6 package-lock — same advisories counted per manifest).
- Removing either lockfile before migration would break `npm ci`; no lockfile changes in this record.

## 2. Per-alert triage (installed version vs advisory)

Installed versions verified against `node_modules` on `main@c9e298d`.

| Package | Installed | Advisory patch | Assessment |
|---|---|---|---|
| `extract-zip` | 2.0.1 | **NONE** | **HIGH ×2 advisories.** Transitive via `@puppeteer/browsers` (test/dev tooling only — not shipped to production runtime). No patched release; options: accept dev-scope risk, replace puppeteer browser-download path, or pin/remove. **Recommend documented risk acceptance for dev-scope** pending a patched release. |
| `nanoid` | 3.3.20 | 5.1.11 | **HIGH.** Advisory targets the v5 line; installed v3 may be unaffected — verify vulnerable range before action. |
| `@grpc/grpc-js` | 1.14.6 top-level; **1.9.16 nested in pnpm-lock** | 1.13.6 | **HIGH + LOW — CONFIRMED VULNERABLE** in pnpm tree. Fixed via `pnpm.overrides` + npm override (PR #97). |
| `basic-ftp` | 6.2.6 top-level; **5.3.1 nested via get-uri in both locks** | 6.2.4 | **MEDIUM — CONFIRMED VULNERABLE** nested copy (dev-only chain). Fixed via overrides (PR #97). |
| `uuid` | 14.0.3 top-level; **8.3.2/9.0.1/10.0.0 nested** (bull, node-cron, firebase-tools, dockerode, @google-cloud/storage) | 11.1.1 | **MEDIUM — vulnerable nested copies confirmed.** Advisory affects v3/v5/v6 `buf` parameter only; audited callers use `v4()` without `buf` → candidate for `tolerable_risk` dismissal after caller audit. |
| `minimatch` | 9.0.9 | 11.0.1 | **MEDIUM.** Major-version mismatch — verify whether v9 line is affected. |
| `glob` | 10.5.0 | 14.0.2 | **MEDIUM.** Major-version mismatch — verify. |
| `postcss-selector-parser` | nested only | 6.1.5 | **MEDIUM.** Build-time only (PostCSS); verify nested version. |

## 3. Disposition summary

- **Actionable now:** `basic-ftp` and `@grpc/grpc-js` overrides submitted (PR #97) — vulnerable nested copies eliminated from both lockfiles.
- **Requires verification before dismissal:** nanoid (v3 vs v5 line split — v5 override would break ESM consumers), minimatch/glob/postcss-selector-parser (major-line questions, build-time scope); uuid (buf-only surface — audit callers, then `tolerable_risk` or targeted fix).
- **Requires decision:** extract-zip (no patch; dev-scope via @puppeteer/browsers) — recommend explicit `tolerable_risk` dismissal recorded here.
- **Package-manager migration:** pnpm target recorded; CI migration is separate scoped work.

## 4. RTDB disposition

Owner console check (2026-11-22): RTDB instance **disabled or empty**. Repo evidence already shows zero `firebase/database` usage. **Recommendation recorded: disable/remove the RTDB instance in Firebase Console** to eliminate the residual surface; no in-repo credential exists to rotate.

## 5. Gate impact

G2 items are now dispositioned as: Dependabot triage COMPLETE pending per-alert verification/dismissal on GitHub; RTDB CLOSED pending the console disable action. G6 remains FROZEN until these verifications are confirmed and explicit G6 authorization is given.
