# FeexSystems — Cloud Functions Rollback Runbook

> **Use when**: a deployed revision of the `api` Cloud Function (Gen 2) is misbehaving and needs an instant traffic flip to the previous healthy revision.

## 1. Inspect revisions

```bash
# Gen 2 functions are backed by Cloud Run — use the run surface to list revisions.
gcloud run services describe api \
  --project feexsystems-prod-508304 \
  --region=us-central1 \
  --format='value(status.traffic)'

# Or list every managed service/revision in the region:
gcloud run revisions list \
  --project feexsystems-prod-508304 \
  --region=us-central1
```

Notes:

- There is **no `gcloud functions revisions list` subcommand** — the command that used to be printed here does not exist. The `api` Cloud Function is a Gen 2 function backed by Cloud Run, so `gcloud run services describe api` is the correct surface for revisions and traffic.
- The default alias `LATEST` always points at the most recent deployed revision.
- The revision naming is `api-<NNN>`; the full resource name is `projects/1098867692790/locations/us-central1/services/api/revisions/api-<NNN>`.

## 2. Identify the last-known-good revision

Look for the revision whose `Traffic` column shows 100 **before** the bad deploy. Usually the second-to-last row in the list. Its full name is `projects/1098867692790/locations/us-central1/services/api/revisions/api-<NNN>`.

## 3. Flip 100% traffic to that revision (rollback)

```bash
gcloud run services update-traffic api \
  --to-revisions=<REVISION_NAME>=100 \
  --project feexsystems-prod-508304 \
  --region=us-central1
```

This is **instant** — no new build, no cold start, just a routing change. Latency tail reverts immediately.

## 4. Verify

```bash
# Hosting rewrite (functions-style health)
curl -fsS --retry 5 --retry-delay 5 \
  https://feexsystems-prod-508304.web.app/health

# Direct function URL
curl -fsS --retry 5 --retry-delay 5 \
  https://us-central1-feexsystems-prod-508304.cloudfunctions.net/api/ping
```

Both should return 200. If they don't, distinguish the two failure shapes before acting — they need opposite remedies:

- **Previous revision was the broken one** — i.e. the old revision also 5xx's for a code/config reason. Restore `LATEST` and proceed to a real fix.

```bash
gcloud run services update-traffic api \
  --to-latest \
  --project feexsystems-prod-508304 \
  --region=us-central1
```

- **No revision is healthy and 5xx persists on every revision** — this is *not* a revision problem. Check the runtime logs first:

```bash
firebase functions:log --project feexsystems-prod-508304 --only api
```

If the logs show `The request failed because billing is disabled for this project.` or `The request failed because the instance could not start successfully.`, **stop** — rollback cannot help (see [Notes on billing](#notes-on-billing)). Re-open billing and let the current revision warm up; do not redeploy.

## 5. Roll forward (optional)

Once you've identified the root cause and shipped a new deploy, the new revision becomes `LATEST`. Flip traffic back:

```bash
gcloud run services update-traffic api \
  --to-latest \
  --project feexsystems-prod-508304 \
  --region=us-central1
```

## 6. Hosting rollback (separate axis)

`firebase.json` rewrites `/api/**` and `/health/**` to the `api` function, so a Hosting-only rollback does NOT restore API health — but if Hosting itself regressed (bad SPA bundle), Hosting has its own one-click release rollback:

```bash
# Find previous release
firebase hosting:clone --project feexsystems-prod-508304 --site feexsystems-prod-508304 \
  --version <PREVIOUS_VERSION_ID> live
```

For data-only regressions (SQL Connect, Firestore), there is no automatic rollback — the canonical recovery path is to fix-forward via a guarded write, then `prisma migrate deploy` or the appropriate SQL Connect mutation.

## Notes on billing

All `gcloud` commands in this runbook require an open billing account on `feexsystems-prod-508304`.

**Observed behaviour when billing is disabled (verified 2026-10-16).** A closed/suspended billing account does **not** mean "nothing is being served". It means:

- The static SPA shell on Hosting still returns **200** (it is served from the CDN, not the function).
- The `api` function is **still deployed and routable**, but instance creation is blocked, so requests fail with **503 / 500**. `/health` and `/api/ping` (which are rewritten to `api`) return 5xx.
- Runtime logs show, repeatedly: `The request failed because billing is disabled for this project.` and `The request failed because the instance could not start successfully.`
- `gcloud functions describe api` (and other read calls) return **403** with `please check billing account associated and retry`. This error is returned to project Owners as well, so **no IAM grant or code change can fix it** — only restoring the billing account.

**Consequence for rollback:** flipping traffic to a previous revision does **not** restore service, because *every* revision is blocked by the same billing gate. Rollback is not a valid remedy for a billing outage. Re-open billing first; the existing revision then warms back up without a redeploy.

**Related latent defect.** The 2026-10-13 boot logs also showed the API failing to reach its database:

```text
⚠️ Database connection non-fatal warning: Can't reach database server at `HOST:5432`
prisma:error Invalid `prisma.$executeRawUnsafe()` invocation: Can't reach database server at `HOST:5432`
```

`HOST:5432` is a literal placeholder — meaning `DATABASE_URL` in GCP Secret Manager is unset or still holds the template value. Fix this **before** re-opening billing, or the API will boot healthy-but-broken.

## Related

- [`FIREBASE_DEPLOYMENT.md`](FIREBASE_DEPLOYMENT.md) — full deploy procedure.
- [`CI-DEPLOYMENT-SETUP.md`](CI-DEPLOYMENT-SETUP.md) — CI auth + deploy gating.
- [`PRODUCTION_READINESS_CHECKLIST.md`](PRODUCTION_READINESS_CHECKLIST.md) — go-live checklist.
