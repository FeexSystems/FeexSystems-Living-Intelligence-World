#!/usr/bin/env bash
# FeexSystems — Firebase CLI deployment (local credential chain).
#
# This is a LOCAL deploy for the firebase.target deployment described in
# docs/FIREBASE_DEPLOYMENT.md. It does NOT push to Cloud Run.
#
# Prerequisites (one-time):
#   1. Firebase CLI (devDependency):  npm i
#   2. One-time auth:             firebase login   (or gcloud auth application-default login)
#   3. Project selected:          firebase use feexsystems-prod-508304
#   4. Local env loaded:          source .env       (provides DATABASE_URL, REDIS_URL,
#                                          JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY,
#                                          SENTRY_DSN, CORS_ORIGIN, GITHUB_TOKEN, PAYSTACK_*,
#                                          AI_SERVICE_*, and Firebase VITE_* keys)
#
# Usage:
#   npm run deploy:firebase        # macOS / Linux / WSL
#   powershell -ExecutionPolicy Bypass -File scripts/deploy-firebase.ps1   # Windows
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== FeexSystems — Firebase deploy =="

# 1) Build both bundles: SPA (hosting) + function entry (dataconnect/server).
echo "[1/3] Building client + server..."
npm run build

# 2) Deploy Hosting + Cloud Functions + Data Connect.
echo "[2/3] Deploying Firebase Hosting + Functions + Data Connect..."
npx firebase deploy --only "hosting,functions,dataconnect"

# 3) Done.
echo "[3/3] Deployment complete."
echo "  - Hosting:   https://feexsystems-prod-508304.web.app"
echo "  - Functions: https://us-central1-feexsystems-prod-508304.cloudfunctions.net/api/ping"
echo ""
echo "Runtime environment variables (DATABASE_URL, REDIS_URL, JWT_SECRET,"
echo "ENCRYPTION_KEY, SENTRY_DSN, CORS_ORIGIN, ...) are provisioned in the"
echo "Google Cloud project (Secret Manager / Cloud Functions settings), NOT in"
echo "this repository. See docs/FIREBASE_DEPLOYMENT.md."
