# deploy.yml — Deployment-Control Remediation Specification

**Status:** Specification only. `deploy.yml` is NOT modified by this document.
**Date:** 2026-11-26
**Precondition:** PROC-01 branch protection is live on `main`. This change must
itself arrive via PR and pass the required checks — it is the first live test of
the new gate and must not trigger any deployment.

## 1. Evidence base

| Finding | Evidence |
|---|---|
| Push to `main` auto-deploys to production | `deploy.yml` `on: push: branches: [main]`; `deploy` job → `environment: production` |
| Two independent production jobs share one approval | `deploy` (Firebase) and `deploy-supabase-functions` both declare `environment: production`; one approval can authorize both |
| `hosting_only` still mutates production Hosting | dispatch path deploys `firebase deploy --only hosting` to `feexsystems-prod-508304` |
| Concurrency split allows overlap | `concurrency.group` differs for `hosting_only` vs standard; comments acknowledge last-writer-wins on the same Hosting site |
| Workflow previously corrupted by overlapping merges | commit `5460415` — duplicate `with:` keys, unparseable billing logic, failed run on `8314f7cf` |
| Recurring billing/quota failures | Oct 13 hardening commits `a172473`/`d4a673d`/`9ee09e8` (billing-403 probes, `skip_functions`); current 509 bandwidth quota outage |
| Legacy script defect — staging is fake | `scripts/deploy-production.sh:32-33,254-259` — `PROJECT_ID` defaults to prod and is identical in both branches; the `staging` argument does not select `feexsystems-staging` |
| Legacy script defect — false success | `scripts/deploy-simple.sh:111-132` — non-200 health/API responses are warnings; script still prints "Deployment completed successfully" |

## 2. Target trigger model

```yaml
on:
  workflow_dispatch:
    inputs:
      target:        # production | staging   (existing)
      release_sha:   # NEW — required, 40-hex or ref resolvable to a commit
      scope:         # NEW — choice: hosting_only | hosting_functions | full
      skip_functions:
      include_supabase:  # NEW — default false; explicit opt-in per release
```

- **Remove `push: branches: [main]` entirely.** Merge to `main` must never
  deploy. This single change converts merge and release into separate events.
- The workflow file version used is the one on the dispatched ref; the actual
  deployed code is pinned by `release_sha` (see §3).

## 3. SHA validation gate (new job: `verify-release`)

Runs before any deploy job (`needs:` on both deploy jobs):

1. `release_sha` is required for `target=production`; optional for staging
   (defaults to dispatched ref HEAD).
2. Resolve to commit; assert `git merge-base --is-ancestor "$SHA" origin/main`
   — the released code must be on approved `main` history. This closes the
   bypass where dispatching an arbitrary branch/PR head ships unreviewed code.
3. Assert the SHA's required checks were green: query
   `repos/{repo}/commits/{sha}/check-runs` and require the six protected
   contexts (`unit-tests`, `integration-tests`, `type-check`, `e2e-tests`,
   `lighthouse`, `production-smoke`) all `success`. Fail closed on missing
   checks.
4. Emit the SHA into the job summary and deployment record for audit.

## 4. Concurrency policy

Replace the split groups with **one group per target environment**:

```yaml
concurrency:
  group: deploy-${{ inputs.target }}          # production | staging
  cancel-in-progress: false
```

Rationale: the current split lets a `hosting_only` dispatch overlap a standard
deploy against the same Firebase project (documented last-writer-wins). A single
per-target group serializes ALL production mutations — hosting, functions,
Supabase — while still allowing staging and production to proceed independently.
Emergency hosting-only recovery queues behind a running deploy instead of
racing it; that is the correct trade-off for a release-control workflow.

## 5. Job separation: Firebase vs Supabase

**Recommended:** split `deploy-supabase-functions` into its own workflow
(`deploy-supabase.yml`) with its own `workflow_dispatch`, its own environment
(`supabase-production` or reuse `production` deliberately), and its own
concurrency group. A production approval should name exactly one infrastructure
surface. If splitting is deferred, minimum viable control:

- `include_supabase` input, default `false`
- Supabase job `if:` requires `inputs.include_supabase == true`
- Job summary explicitly lists which surfaces will mutate

## 6. Environment & permission posture (already applied — restate as requirements)

- `production` environment: required reviewer, deployment branch policy = `main`,
  `can_admins_bypass: false` — **done 2026-11-26**.
- `prevent_self_review`: enable once a second human account exists; until then
  it would deadlock all releases (documented in PROC-01 §3).
- Workflow token stays `read`; deploy auth is via WIF (`id-token: write`) —
  unchanged.

## 7. Legacy scripts

| Script | Required action |
|---|---|
| `deploy-production.sh` | Fix `PROJECT_ID` selection (`staging` → `feexsystems-staging`) or mark deprecated header pointing to `deploy.yml` dispatch |
| `deploy-simple.sh` | Fix false-success: exit non-zero when health/API checks return non-2xx, or mark deprecated |
| `deploy-firebase.sh` / `.ps1` | Keep as maintained manual path; add header note that it bypasses environment approval — manual deploys are outside the release gate and must be treated as emergency-only |
| `deploy-supabase-functions.*` | Same treatment as the Supabase workflow decision in §5 |

Minimum acceptable: deprecation headers on all non-`deploy.yml` paths so no one
unwittingly uses an ungated route to production.

## 8. Out of scope (explicitly)

- Firebase bandwidth quota / billing resolution — infrastructure, not repo.
- `prevent_self_review` enablement — blocked on second human account.
- Rulesets — unavailable on current plan; classic protection is the control.

## 9. Negative tests (must pass before this spec is "verified")

| # | Test | Expected |
|---|---|---|
| N1 | Push commit directly to `main` | Remote rejection citing branch protection |
| N2 | Open PR, merge without required checks green | Merge blocked |
| N3 | Push new commit after approval | Stale approval dismissed (once approvals > 0) |
| N4 | `workflow_dispatch` with `release_sha` not on `main` | `verify-release` fails; no deploy job runs |
| N5 | `workflow_dispatch` to `production` without environment approval | Deploy job waits; nothing mutates |
| N6 | `hosting_only` + standard dispatch concurrently | Second run queues on `deploy-production` group |
| N7 | Dispatch with `include_supabase` unset | Supabase surfaces untouched |

N1–N3 can run before the workflow change lands; N4–N7 require it.

## 10. Rollout order

1. This spec reviewed → `deploy.yml` PR authored (trigger + verify-release +
   concurrency; Supabase split optional-but-recommended).
2. PR merges through the new protected gate (first live proof).
3. N4–N7 exercised on `staging` target first.
4. Firebase quota resolved (external).
5. GATE C resumes: authorized `release_sha=4a07b76` (or successor) dispatch →
   environment approval → smoke + Lighthouse.
