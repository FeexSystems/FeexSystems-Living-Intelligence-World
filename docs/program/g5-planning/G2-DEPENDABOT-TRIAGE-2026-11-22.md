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
| `@grpc/grpc-js` | 1.14.6 | 1.13.6 | **HIGH + LOW.** Installed ≥ patch (package.json override already pins 1.14.x) — likely stale alerts; verify and dismiss if range satisfied. |
| `basic-ftp` | 6.2.6 | 6.2.4 | **MEDIUM.** Installed ≥ patch — likely stale; verify. |
| `uuid` | 14.0.3 | 11.1.1 | **MEDIUM.** Installed ≥ patch — likely stale; verify. |
| `minimatch` | 9.0.9 | 11.0.1 | **MEDIUM.** Major-version mismatch — verify whether v9 line is affected. |
| `glob` | 10.5.0 | 14.0.2 | **MEDIUM.** Major-version mismatch — verify. |
| `postcss-selector-parser` | nested only | 6.1.5 | **MEDIUM.** Build-time only (PostCSS); verify nested version. |

## 3. Disposition summary

- **Actionable now:** none required for runtime — all production-path packages appear already at or above patched versions; most alerts are stale or dev-scope.
- **Requires verification before dismissal:** nanoid, minimatch, glob, postcss-selector-parser (major-line questions); @grpc/grpc-js, basic-ftp, uuid (likely stale — dismiss after range check).
- **Requires decision:** extract-zip (no patch; dev-scope via puppeteer) — recommend explicit risk acceptance recorded here.
- **Package-manager migration:** pnpm target recorded; CI migration is separate scoped work.

## 4. RTDB disposition

Owner console check (2026-11-22): RTDB instance **disabled or empty**. Repo evidence already shows zero `firebase/database` usage. **Recommendation recorded: disable/remove the RTDB instance in Firebase Console** to eliminate the residual surface; no in-repo credential exists to rotate.

## 5. Gate impact

G2 items are now dispositioned as: Dependabot triage COMPLETE pending per-alert verification/dismissal on GitHub; RTDB CLOSED pending the console disable action. G6 remains FROZEN until these verifications are confirmed and explicit G6 authorization is given.
