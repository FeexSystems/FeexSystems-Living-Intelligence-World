# CI Deployment Setup — Workload Identity Federation & Secrets

This runbook arms the automated deploy path in [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).
Once complete, a push to `main` deploys to Firebase automatically (after the quality gate), with **no long-lived
service-account keys** committed anywhere.

You only need to do this **once**. Everything here is copy-paste; substitute your own project/org where noted.

## Architecture recap

- **Target:** Firebase — Hosting (`dist/spa`) + Cloud Functions `api` (Express, `nodejs22`) + Data Connect.
- **Projects** (`.firebaserc`): `prod` → `feexsystems-prod-508304`, `staging` → `feexsystems-staging`.
- **CI auth:** GitHub Actions → Google **Workload Identity Federation** (WIF) → short-lived token. No JSON keys.
- **Runtime secrets:** provisioned in **GCP Secret Manager**, attached to the `api` function — never in the repo.

## Prerequisites

- Owner/Editor on the GCP project(s).
- Admin on the GitHub repo (`FeexSystems/FeexSystems-Living-Intelligence-World`).
- `gcloud` CLI installed and authenticated: `gcloud auth login`.

Set your shell variables once (used throughout). These match the pool/provider you
already provisioned:

```bash
export PROJECT_ID="feexsystems-prod-508304"      # prod project
export PROJECT_NUMBER="1098867692790"
export POOL_ID="github-pool"
export PROVIDER_ID="github-provider"
export SA_ID="github-deployer"
export SA_EMAIL="${SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
export REPO="FeexSystems/FeexSystems-Living-Intelligence-World"
export WIF_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"
# => projects/1098867692790/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

---

## 1. Enable required APIs

```bash
gcloud services enable \
  iamcredentials.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  firebasehosting.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  --project "$PROJECT_ID"
```

## 2. Create the deploy service account

```bash
gcloud iam service-accounts create "$SA_ID" \
  --project "$PROJECT_ID" \
  --display-name="GitHub Actions deployer"

# Least-privilege roles for Firebase Hosting + Functions + Data Connect + builds
# - firebaseextensions.viewer: the Firebase CLI lists extension instances during EVERY
#   deploy (even --only hosting,functions,dataconnect) and hard-fails with HTTP 403
#   without firebaseextensions.instances.list.
# - firebasedataconnect.admin: required by `firebase deploy --only dataconnect`
#   (dataconnect.services.create/update). Note: roles/dataconnect.editor does NOT exist.
for ROLE in \
  roles/firebasehosting.admin \
  roles/cloudfunctions.developer \
  roles/datastore.owner \
  roles/iam.serviceAccountUser \
  roles/cloudbuild.builds.editor \
  roles/artifactregistry.writer \
  roles/storage.objectAdmin \
  roles/firebaseextensions.viewer \
  roles/firebasedataconnect.admin; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="$ROLE" --quiet
done
```

## 3. Create the Workload Identity Pool & OIDC provider

```bash
gcloud iam workload-identity-pools create "$POOL_ID" \
  --project="$PROJECT_ID" \
  --location="global" \
  --display-name="GitHub Actions pool"

gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="$POOL_ID" \
  --display-name="GitHub provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository_owner=='FeexSystems'" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

Allow the GitHub repo (note: `principalSet` uses the **pool**, not the provider —
`.../workloadIdentityPools/github-pool/attribute.repository/...`):

```bash
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${REPO}"
# => principalSet://iam.googleapis.com/projects/1098867692790/locations/global/workloadIdentityPools/github-pool/attribute.repository/FeexSystems/FeexSystems-Living-Intelligence-World
```

> `deploy.yml` also mints a short-lived OAuth access token (`token_format: access_token`,
> passed to the Firebase CLI as `FIREBASE_TOKEN`). Minting that token requires
> `iam.serviceAccounts.getAccessToken` on the deployer SA — without it the auth step fails with
> `Permission 'iam.serviceAccounts.getAccessToken' denied` (HTTP 403). Grant it once:

```bash
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.serviceAccountTokenCreator" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${REPO}"

# Verify both bindings are present:
gcloud iam service-accounts get-iam-policy "$SA_EMAIL" --project="$PROJECT_ID"
# Expect two bindings for the same principalSet member:
# - roles/iam.workloadIdentityUser
# - roles/iam.serviceAccountTokenCreator
```

> To restrict impersonation to `main` only, append a branch condition to the provider's
> `--attribute-condition` (see §3 header). The `attribute.repository` binding above is the
> recommended starting point.

## 4. Add the three GitHub Actions secrets

In the repo → **Settings → Secrets and variables → Actions → New repository secret**, add:

| Secret | Value |
|--------|-------|
| `GCP_PROJECT_ID` | `feexsystems-prod-508304` |
| `WIF_PROVIDER` | `projects/1098867692790/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `WIF_SERVICE_ACCOUNT` | `$SA_EMAIL` (e.g. `github-deployer@feexsystems-prod-508304.iam.gserviceaccount.com`) |

> These are exactly the three secrets referenced by `google-github-actions/auth@v2` in `deploy.yml`.
> The workflow is keyless — do **not** add a service-account JSON key.

## 5. (Recommended) Add a manual approval gate

Repo → **Settings → Environments → New environment** named `production`. Add yourself as a
**Required reviewer**. The `deploy` job targets this environment, so every production deploy then waits for
your approval. (Create a matching `staging` environment if you deploy there.)


## 6. Provision runtime secrets in GCP Secret Manager

The `api` Cloud Function reads these at boot (`validateEnv()` hard-exits if a required one is missing). Store
each with the Firebase CLI (writes to Secret Manager under the hood) **or** `gcloud`:

```bash
# Firebase CLI (interactive prompt per secret)
firebase functions:secrets:set DATABASE_URL        # postgresql://...@/feexsystems_prod
firebase functions:secrets:set REDIS_URL
firebase functions:secrets:set JWT_SECRET          # openssl rand -hex 32  (≥32)
firebase functions:secrets:set JWT_REFRESH_SECRET  # distinct, ≥32
firebase functions:secrets:set ENCRYPTION_KEY      # ≥32 (required in prod)
firebase functions:secrets:set SENTRY_DSN          # required in prod
firebase functions:secrets:set CORS_ORIGIN         # https://feexsystems.codes
firebase functions:secrets:set GITHUB_TOKEN
firebase functions:secrets:set GITHUB_WEBHOOK_SECRET
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set PAYSTACK_SECRET_KEY
```

Grant the function's runtime service account access to each secret:

```bash
export FUNCTION_SA="${PROJECT_ID}@appspot.gserviceaccount.com"
for SECRET in DATABASE_URL REDIS_URL JWT_SECRET JWT_REFRESH_SECRET ENCRYPTION_KEY \
             SENTRY_DSN CORS_ORIGIN GITHUB_TOKEN GITHUB_WEBHOOK_SECRET GEMINI_API_KEY PAYSTACK_SECRET_KEY; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:${FUNCTION_SA}" \
    --role="roles/secretmanager.secretAccessor" --quiet
done
```

Refer to `.env.production.template` for the complete variable list.

## 7. Verify & trigger

```bash
# Confirm WIF provider + SA binding
gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --location=global --workload-identity-pool="$POOL_ID" --project="$PROJECT_ID"

# Trigger a deploy
git push origin main                       # auto-deploys after the gate
# or, from the Actions tab: "Deploy (Firebase)" → Run workflow → choose production/staging

# Confirm live
curl -I https://feexsystems-prod-508304.web.app
curl https://us-central1-feexsystems-prod-508304.cloudfunctions.net/api/ping
```

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| `Error: google-github-actions/auth ... failed to generate token` | WIF provider/SA binding wrong, or `attribute.repository` doesn't match `owner/repo`. Re-check §3–§4. |
| Workflow skipped, no deploy | `production` Environment has a required reviewer — approve it in the Actions run. |
| Function boots then crashes | A runtime secret is missing → check Cloud Functions logs; `validateEnv()` names the missing var. |
| `permission denied` during `firebase deploy` | The deploy SA lacks a role in §2 (commonly `datastore.owner` or `firebasehosting.admin`). |
| Local deploy works, CI doesn't | GitHub secrets missing or mismatched — §4. |

## Related docs

- [`FIREBASE_DEPLOYMENT.md`](FIREBASE_DEPLOYMENT.md) — manual/local deploy runbook.
- [`PRODUCTION_READINESS_CHECKLIST.md`](PRODUCTION_READINESS_CHECKLIST.md) — full go-live checklist.

