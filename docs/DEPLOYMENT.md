# Production Deployment Checklist

This document outlines the standard operating procedure for deploying FeexSystems to production infrastructure (**Firebase** — Hosting + Cloud Functions `api` + Data Connect). See [`FIREBASE_DEPLOYMENT.md`](FIREBASE_DEPLOYMENT.md) for the authoritative runbook.

## 1. Prerequisites

Before deploying, ensure you have the following CLI tools installed and authenticated:
- **Google Cloud CLI** (`gcloud`)
- **Firebase CLI** (`firebase`)
- **Node.js & npm** (for local builds)

Ensure you are authenticated against the correct production project:
```bash
gcloud config set project feexsystems-prod-508304
firebase use default
```

## 2. Infrastructure Validations

Check that external dependencies are fully operational:
- **Cloud SQL**: PostgreSQL 15 instance is running and reachable by the deployed Cloud Function.
- **Redis**: Running and reachable by the deployed Cloud Function.
- **Secret Manager**: The following secrets must be present and correctly versioned:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `ENCRYPTION_KEY` (required in production, ≥32 characters)
  - `SENTRY_DSN` (required in production)
  - `GEMINI_API_KEY`
  - `PAYSTACK_SECRET_KEY`
- **GitHub Webhook**: A webhook is active on the repository using the same secret configured on the server.

## 3. Pre-flight Checks

Locally ensure that the codebase is completely sound:
```bash
npm run typecheck
npm test
```
*Note: Any test failure or type error must halt the deployment.*

## 4. Build Phase

Build the static assets and the server backend:
```bash
npm run build
```
This generates:
- `dist/spa/` (Frontend React/WebGL app)
- `dist/server/` (Backend Express server)

## 5. Deployment Phase

Deploy Hosting + Cloud Functions (`api`) + Data Connect together. The maintained script builds both bundles and deploys them:

**Windows:**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-firebase.ps1
```

**Linux / macOS / WSL:**
```bash
npm run deploy:firebase
```

Equivalently, manually:
```bash
npm run build
npx firebase deploy --only "hosting,functions,dataconnect"
```

*Alternatively, pushes to `main` deploy automatically via `.github/workflows/deploy.yml`. Confirm the workflow logs show the Hosting release and the `api` function update succeeded, and that the post-deploy health check passed.*

## 6. Post-Deployment Verification

After the deployment finishes, manually verify the health of the system:

- [ ] **System Readiness**: Visit the live `/health/ready` endpoint and confirm a `200 OK` response.
- [ ] **Dashboard Load**: Open the public site (`https://feexsystems-prod-508304.web.app`) in a private browsing window and verify the spatial world loads without console errors.
- [ ] **Database Connectivity**: Verify that the `/api/world-model/projects` endpoint returns live data.
- [ ] **Auth Validation**: Attempt to log in or inspect token rotation behavior if possible.
- [ ] **Billing Webhooks**: Check the Paystack dashboard to ensure webhook deliveries are succeeding.

## 7. Rollback Procedure

If any critical invariant fails in production:

1. **Revert Frontend**:
   ```bash
   firebase hosting:rollback
   # or deploy a previous release from the Firebase console
   ```
2. **Revert Backend (Cloud Function)**:
   Redeploy the last known-good commit — either re-run `npm run deploy:firebase` from that commit, or in the
   Google Cloud Console route 100% of traffic to the previous healthy Cloud Functions revision.

## 8. Operational Principle

A GitHub synchronization failure or third-party service outage must not make the public application unavailable. Synchronization and AI interactions are asynchronous capabilities; canonical state remains durable and observable in the World Model.
