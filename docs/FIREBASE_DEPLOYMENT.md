# FeexSystems — Firebase Deployment Guide

Target deployment: **Firebase**, not Cloud Run.

> **Automated CI deploys:** pushes to `main` deploy via [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).
> To arm it (one-time), see **[`CI-DEPLOYMENT-SETUP.md`](CI-DEPLOYMENT-SETUP.md)** — Workload Identity Federation,
> the three GitHub secrets, and runtime Secret Manager provisioning. This page covers the **manual/local** path.

- Frontend: Firebase Hosting (serves `dist/spa`).
- Backend: Firebase Cloud Functions — the `api` export of `server/index.ts` (Express + `firebase-functions/v2/https`), wired as the Firebase Function in `firebase.json`.
- SQL (Data Connect): `dataconnect/` (schema + connector).
- Auth: Firebase Auth (client `client/lib/firebase.ts`, server-side verification via `server/lib/firebase-admin.ts`).
- Analytics/AI: `VITE_FIREBASE_MEASUREMENT_ID`, `GEMINI_API_KEY`.

## Project selection (`.firebaserc`)

- prod: `feexsystems-prod-508304` → `https://feexsystems-prod-508304.web.app`
- staging: `feexsystems-staging`

## Prerequisites (one-time)

0. **Install Firebase tooling** (devDependency — no global CLI install):
   ```bash
   npm i
   ```

1. **Log in to Firebase** (authorizes the CLI against the GCP project):

   ```bash
   firebase login
   # or, if using the local GCP credential chain:
   gcloud auth application-default login
   ```

2. **Select the project**:

   ```bash
   firebase use feexsystems-prod-508304   # production
   # firebase use feexsystems-staging     # staging
   ```

3. **Environment secrets are NOT in this repo.** The following are gitignored
   and live on the local machine (or in the GCP project):

   - `.env` — local runtime values (DB, Redis, JWT, Sentry, Paystack, Gemini,
     GitHub integration, Firebase `VITE_*` keys). The tracked
     `.env.production.template` contains placeholders only.
   - `firebase-service-account.json` — **populated and verified**. For local
     dev the Firebase CLI Authenticate via the GCP credential chain (above), so
     this file is not required for deployment. If you run the server locally and
     need Admin SDK identity, create a real service-account JSON and point
     `GOOGLE_APPLICATION_CREDENTIALS` at it (or use `FIREBASE_SERVICE_ACCOUNT_KEY`).
   - **Provisioned at deploy time** via GCP: `DATABASE_URL`, `REDIS_URL`,
     `JWT_SECRET` (≥32), `JWT_REFRESH_SECRET` (≥32), `ENCRYPTION_KEY` (≥32),
     `SENTRY_DSN`, `CORS_ORIGIN`, `GITHUB_TOKEN`, `GITHUB_WEBHOOK_SECRET`,
     `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `AI_SERVICE_API_KEY`,
     `AI_SERVICE_URL`, and `VITE_FIREBASE_*` client keys.

   Recommended provisioning method: **Google Cloud Secret Manager** (one secret
   per var), attached to the Cloud Functions runtime. Verify with
   `firebase functions:config` / the Cloud Console > Cloud Functions.

## Deploy

```bash
# 1) (one-time) build a local env copy, then source it if you need env for
#    local server runs (not for the deployed function's process.env):
#    source .env

# 2) Build both bundles (hosting SPA + function entry).
npm run build

# 3) Deploy Hosting + Functions + Data Connect.
npx firebase deploy --only "hosting,functions,dataconnect"
```

Alternatively use the maintained script:

```bash
npm run deploy:firebase        # macOS / Linux / WSL
# Windows:
powershell -ExecutionPolicy Bypass -File scripts/deploy-firebase.ps1
```

## Verification

```bash
# Hosting
curl -I https://feexsystems-prod-508304.web.app

# Function health (the /api/** routes are rewritten to the `api` function)
curl https://us-central1-feexsystems-prod-508304.cloudfunctions.net/api/ping

# Data Connect
curl "https://feexsystems-prod-508304.cloudfunctions.net/api/..."  # see dataconnect docs
```

## Local emulators (optional)

```bash
firebase emulators:start --only hosting,functions,firestore,dataconnect
```
