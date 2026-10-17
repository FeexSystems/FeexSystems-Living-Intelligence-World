# FeexSystems Enterprise Cloud Deployment & Operations Runbook

This guide details the complete production deployment procedures for **FeexSystems Living Intelligence World** (`feexsystems.codes`) across **Firebase** (Hosting, Cloud Functions `api`, Data Connect, Auth) and Google Cloud Platform (Cloud SQL, Redis, BigQuery, Cloud Storage, Secret Manager). The backend runs as a Firebase Cloud Function — **not** Cloud Run. See [`FIREBASE_DEPLOYMENT.md`](FIREBASE_DEPLOYMENT.md) for the concise authoritative runbook.

---

## 1. Architecture Summary

- **Frontend**: Vite React SPA hosted on **Firebase Hosting** with global edge CDN, HTTP/2 multiplexing, and `/api/**` rewrites to the `api` Cloud Function.
- **Backend**: Express 5 exported as the `api` **Firebase Cloud Function** (`firebase-functions/v2/https`), with `min-instances` configurable to reduce cold starts for the 3D WebGL World Model API.
- **Primary Database**: **Google Cloud SQL** (PostgreSQL 15) managed with Prisma ORM.
- **Cache & Message Broker**: **Google Cloud Memorystore Redis** for sessions, Bull queues, and rate-limiting.
- **Analytics & Telemetry**: **Google BigQuery** (`feexsystems_analytics`) with real-time streaming ingestion.
- **Orchestration**: **Managed Service for Apache Airflow (MSAA / Cloud Composer)** for scheduled GitHub ecosystem crawls and Evidence Fabric validation.
- **Storage**: **Google Cloud Storage** (`feexsystems-evidence-artifacts`) with object versioning for evidence persistence.
- **AI Reasoning**: Provider-neutral **Gemini API** (`gemini-2.5-flash`) and **Gemini Live WebSocket** streaming.

---

## 2. Pre-Deployment Setup & Prerequisites

### 2.1 Authenticate and Select Project
```bash
# Authenticate with Google Cloud
gcloud auth login
gcloud config set project feexsystems-prod-508304

# Authenticate with Firebase
firebase login
firebase use prod   # alias -> feexsystems-prod-508304 (see .firebaserc)
```

### 2.2 Enable Required GCP Services
```bash
gcloud services enable \
    cloudfunctions.googleapis.com \
    cloudbuild.googleapis.com \
    secretmanager.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    bigquery.googleapis.com \
    storage.googleapis.com \
    composer.googleapis.com
```

---

## 3. Database & Secret Provisioning

### 3.1 Provision Secrets in Secret Manager

Secrets are provisioned in **Google Cloud Secret Manager** and attached to the `api` Cloud Function — they are
**never** committed to the repository. The tracked `.env.production.template` contains placeholders only.

Set each secret with the Firebase CLI (which writes to Secret Manager under the hood):

```bash
firebase functions:secrets:set DATABASE_URL        # e.g. postgresql://...@/feexsystems_prod
firebase functions:secrets:set REDIS_URL
firebase functions:secrets:set ENCRYPTION_KEY      # ≥32 chars (required in production)
firebase functions:secrets:set SENTRY_DSN          # required in production
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set PAYSTACK_SECRET_KEY
firebase functions:secrets:set GITHUB_TOKEN
firebase functions:secrets:set GITHUB_WEBHOOK_SECRET
firebase functions:secrets:set CORS_ORIGIN         # e.g. https://feexsystems.codes
```

Verify with `firebase functions:secrets:access <NAME>` or the Cloud Console > Secret Manager. The server calls
`validateEnv()` at boot and `process.exit(1)`s if a runtime-required variable is missing.

### 3.2 Cloud SQL Schema Migrations (Accidental Data Loss Prevention)
> [!CAUTION]
> Before applying database migrations to production, ensure automated backups are active:
> `gcloud sql instances patch <INSTANCE_NAME> --backup-start-time 02:00`

Run migrations via the Cloud SQL Auth Proxy or temporary migration job:
```bash
npm run db:migrate
```

### 3.3 Initialize BigQuery Analytics Schema
Execute the DDL schema in BigQuery:
```bash
bq query --use_legacy_sql=false < server/lib/services/bigquery/schema.sql
```

---

## 4. Deploying the Backend to Firebase Cloud Functions

The `api` function is built from the repo root (`firebase.json` → `functions.source: "."`) with a `predeploy`
hook that runs `npm run build:server`. Deploy Hosting + Functions + Data Connect together:

**On Windows PowerShell:**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-firebase.ps1
```

**On Linux/macOS:**
```bash
npm run deploy:firebase
```

This will:
1. Build the SPA (`dist/spa`) and the server bundle.
2. Deploy **Firebase Hosting** (serves `dist/spa`, rewrites `/api/**` and `/health/**` to `api`).
3. Deploy the **`api` Cloud Function** (Express 5, `firebase-functions/v2/https`, Node.js 22).
4. Deploy **Data Connect** (SQL schema + connector).

Equivalently, by hand: `npm run build` then
`npx firebase deploy --only "hosting,functions,dataconnect"`. Runtime secrets resolve from Secret Manager, and
the process runs as a non-root runtime user.

---

## 5. Deploying the Frontend to Firebase Hosting

```bash
# 1. Build the production client bundle
npm run build:client

# 2. Deploy static SPA and routing rules to Firebase Hosting
firebase deploy --only hosting
```

---

## 6. Verification & Health Monitoring

### 6.1 Liveness & Readiness Checks
```bash
# Check basic application health
curl -s https://feexsystems.codes/health | jq

# Check readiness and database/redis connectivity
curl -s https://feexsystems.codes/health/ready | jq
```

Expected output:
```json
{
  "status": "healthy",
  "timestamp": "2026-09-11T04:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### 6.2 World Model API Verification
```bash
# Verify synchronized project graph
curl -s https://feexsystems.codes/api/world-model/projects | jq '.count'

# Verify Navigator grounded reasoning
curl -s "https://feexsystems.codes/api/world-model/navigator?q=ecosystem" | jq '.success'
```

---

## 7. Rollback & Disaster Recovery Procedures

### 7.1 Cloud Function Rollback
```bash
# List previous function revisions
gcloud functions list   # or inspect the `api` function in the Cloud Console

# Redeploy the last known-good commit (preferred)
git checkout <last-good-sha>
npm run deploy:firebase
```

To roll traffic back without a full redeploy, in the Google Cloud Console open the `api` Cloud Function and
restore the previous revision (Cloud Functions keeps prior revisions you can promote back to 100% traffic).

### 7.2 Firebase Hosting Rollback
```bash
# Roll back to the previous hosting release immediately
firebase hosting:rollback
```

### 7.3 Point-in-Time Database Recovery
If an accidental data loss event occurs:
```bash
gcloud sql backups restore <BACKUP_ID> \
    --restore-instance=feexsystems-postgres-prod \
    --backup-instance=feexsystems-postgres-prod
```
