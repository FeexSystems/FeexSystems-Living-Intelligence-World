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
     `ENCRYPTION_KEY` (≥32),
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

## SQL Connect (Data Connect) development

The World Model's PostgreSQL projection lives in `dataconnect/`:

```text
dataconnect/
├── dataconnect.yaml      # serviceId, Cloud SQL instance, schema validation mode
├── schema/schema.gql     # WorldProject / WorldEvidence / WorldTelemetryEvent tables
├── connector/            # connectorId: default — queries.gql, mutations.gql
└── seed_data.gql         # canonical project upserts for the local emulator
```

Client consumption goes through `client/lib/dataconnect-client.ts`, which wraps
the generated SDK (`client/lib/dataconnect`, package `@feexsystems/dataconnect`).
`fetchWorldProjects()` in `client/lib/worldModelClient.ts` tries SQL Connect
first and falls back to the REST API when the service is unreachable or disabled.

### Common commands

```bash
npm run dc:compile     # validate schema + connector + regenerate the JS SDK
npm run dc:emulator    # start the SQL Connect emulator (PGlite) on localhost:9399
npm run dc:seed        # seed canonical projects into the emulator
```

### Client modes (env)

| Env | Mode | Behavior |
|-----|------|----------|
| *(unset)* | production | deployed SQL Connect service (falls back to REST until it's live) |
| `VITE_DATACONNECT=emulator` (or `VITE_DATACONNECT_EMULATOR=true`) | emulator | `connectDataConnectEmulator` → `localhost:9399` |
| `VITE_DATACONNECT=off` | disabled | REST API only |

Vitest runs are always disabled (deterministic/offline).

### Schema changes

Edit `dataconnect/schema/schema.gql` / `connector/*.gql`, then run
`npm run dc:compile` — this validates against the SQL Connect compiler and
regenerates the typed SDK. Mutations are `@auth(level: USER)` (Firebase Auth
session required); public catalog queries are `@auth(level: PUBLIC)`.

### Deploy

SQL Connect ships with the standard deploy: `firebase deploy --only dataconnect`
(or the combined `hosting,functions,dataconnect` command above). The
`schemaValidation: COMPATIBLE` mode in `dataconnect.yaml` blocks destructive
schema drift.

## Verification

```bash
# Hosting
curl -I https://feexsystems-prod-508304.web.app

# Function health (the /api/** routes are rewritten to the `api` function)
curl https://us-central1-feexsystems-prod-508304.cloudfunctions.net/api/ping

# SQL Connect — list projects via the connector (GraphQL over the web SDK host)
# or inspect in the console: Databases & Storage > SQL Connect
```

## Local emulators (optional)

```bash
firebase emulators:start --only hosting,functions,firestore,dataconnect
```
