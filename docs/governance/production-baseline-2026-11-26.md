# GATE C Baseline — Production Verification (currently-live site)

**Date:** 2026-11-26
**Scope:** Baseline only. NOT GATE C evidence. No deployment was approved, re-run,
or cancelled. Pending deploy run `45897339384` (SHA `4a07b76`) left untouched.

## Verdict: production is DOWN — Firebase Hosting bandwidth quota exhausted

| Check | Result |
|---|---|
| `GET https://feexsystems.codes/` | **HTTP 509 — "Bandwidth Quota Exceeded"** (Firebase quota page) |
| `GET https://feexsystems-prod-508304.web.app/` | **HTTP 509 — identical quota page** |
| `GET /api/ping`, `GET /health` (both hosts) | 509 — Firebase edge intercepts all routes; origin never reached |
| Lighthouse / smoke against app | **Not applicable** — nothing but the quota error page is served |

The site cannot serve traffic until the Firebase project's billing plan is
upgraded in the Firebase console.

## Deployed-SHA evidence (GitHub deployments API)

The live site cannot be fingerprinted (quota page contains no build assets), so
the deployment record is the evidence:

| Deployment | SHA | Created | Final status |
|---|---|---|---|
| 7956857231 / 7956857223 | `d3bcdf25` | 2026-11-21 01:55 | **`waiting` — never completed** |
| 7953215867 / 7953215865 | `89102920` | 2026-11-20 21:43 | **`success` 2026-11-21 01:52** |
| 7940329886 / 7940329879 | `22307f9a` | 2026-11-20 11:21 | `failure` |

**Last known-good production deploy: `89102920` (2026-11-21).**
Candidate `4a07b76` (tree of verified `9fb3ada`) has never been deployed.

## Deploy pipeline state

- Run `45897339384` (`push` → `main` @ `4a07b76`): `pending`, **0 jobs** since
  2026-11-26 21:19:34Z. Cause undetermined (queue vs. concurrency group
  `deploy-refs/heads/main-standard`).
- Runs for PRs #110 (`d0c70aea`), #111 (`89e64bba`), #112 (`78584363`): all
  `cancelled`.

## Implications for GATE C

1. Even if run `45897339384` is approved and completes, smoke/Lighthouse will
   still return 509 until the **Firebase bandwidth quota is resolved** — that is
   a billing-console action outside the repo's control.
2. PROC-01 repo controls are applied (see `PROC-01-merge-control.md`), but the
   "separate authorized release" control is still structurally absent:
   `deploy.yml` fires on every push to `main`.
3. Negative tests for PROC-01 verification (rejected direct push, blocked
   failing check) remain to be demonstrated.

## Recommended sequence

1. Resolve Firebase quota (console → upgrade billing) — prerequisite for ANY
   production verification.
2. Complete PROC-01 negative tests.
3. Land the `deploy.yml` trigger change (PR → first live test of new gate).
4. Only then approve a candidate deployment and run GATE C smoke + Lighthouse.
