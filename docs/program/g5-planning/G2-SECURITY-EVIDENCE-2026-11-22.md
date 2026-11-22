# G2 Security Clearance — Evidence Record (Dependabot + RTDB)

**Date:** 2026-11-22
**Baseline:** `main@b616d349724b5de9c4d3ef0dd4b4c7b82b0187e5`
**Scope:** G2 pre-G6 security items — Dependabot alert refresh and RTDB credential disposition. This record is evidence only; it does not authorize G6/G7, deployment, or actuation.

## 1. Dependabot alert refresh

**Command:** `GET /repos/FeexSystems/FeexSystems-Living-Intelligence-World/dependabot/alerts?state=open&per_page=100` (token-authenticated, 2026-11-22)

| Metric | Prior register note | Current (2026-11-22) |
|---|---|---|
| Open alerts | 19 vulnerabilities reported historically (8 high) | **16 open alerts: 7 high, 8 medium, 1 low** |
| Affected manifests | — | `pnpm-lock.yaml`: 10 · `package-lock.json`: 6 |

**Affected packages (open alerts):** `extract-zip` (4), `basic-ftp` (2), `minimatch` (2), `nanoid` (2), `@grpc/grpc-js` (2), `uuid` (2), `glob` (1), `postcss-selector-parser` (1).

**Triage observations:**

- All alerts are transitive/dependency-level; none originate from first-party source.
- The split across **two lockfiles** (`pnpm-lock.yaml` + `package-lock.json`) is the already-registered package-manager ambiguity debt — alert disposition is blocked until a single package manager is chosen.
- **No new dependency was introduced by the G5 EIL slices** (PRs #83–#92 changed no `package.json`/lockfile), so the EIL work added zero new alerts.

**Disposition:** MEDIUM — requires (a) package-manager decision, (b) targeted upgrades or documented risk acceptance per advisory, before G6. Not a G5 blocker; remains a G6 precondition.

## 2. RTDB credential audit

**Repository evidence (grep over `client/`, `server/`, `shared/`, `docs/`):**

- `client/lib/firebase.ts:33` — `databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL` (config only).
- `server/lib/firebase-admin.ts:20` — `databaseURL: "https://feexsystems-prod-508304-default-rtdb.firebaseio.com"` (admin init config).
- **No `firebase/database` SDK import, `getDatabase()`, `ref()`, or RTDB listener/writer exists anywhere in `client/`, `server/`, or `shared/`.**

**Finding:** the RTDB endpoint is configured but **no code path reads or writes Realtime Database**. There is no application-level RTDB credential to rotate in-repo; rotation scope reduces to the Firebase project-level database instance and its security rules.

**Residual verification required (outside repo access):**

1. Firebase Console → Realtime Database: confirm whether the instance holds data and whether it is enabled at all.
2. If enabled with data: rotate/restrict access and review `database.rules.json` (referenced in `docs/SECRET-ROTATION-GUIDE.md` §11 as "if used").
3. If unused: consider disabling the RTDB instance to remove the attack surface entirely — a console action requiring owner authorization.

**Disposition:** OPEN pending console verification — cannot be closed from repository evidence alone.

## 3. Gate impact

| Item | Status |
|---|---|
| Dependabot refresh | DONE — 16 open (7 high); triage blocked on package-manager decision |
| RTDB rotation | OPEN — repo evidence shows no active RTDB code path; console verification required |
| New alerts from EIL slices | NONE — no dependency changes in PRs #83–#92 |
| G6 authorization | Still FROZEN — G2 items above must be dispositioned first |
