<#
.FeexSystems — Firebase CLI deployment (local credential chain)
=============================================================

Local deploy for the Firebase architecture in firebase.json, server/index.ts
(`api` = Cloud Function), and dataconnect/. It does NOT push to Cloud Run.

Prerequisites (one-time):
  1. firebase-tools installed:  npm i -g firebase-tools
  2. One-time auth:             firebase login   (or gcloud auth application-default login)
  3. Project selected:          firebase use feexsystems-prod-508304
  4. Local env loaded:          copy .env.production.template .env (then fill values)

Usage:
  npm run deploy:firebase   # macOS / Linux / WSL
  powershell -ExecutionPolicy Bypass -File scripts/deploy-firebase.ps1   # Windows
#>

Write-Host "== FeexSystems — Firebase deploy =="

Write-Host "[1/3] Building client + server..." -ForegroundColor Cyan
npm run build

Write-Host "[2/3] Deploying Firebase Hosting + Functions + Data Connect..." -ForegroundColor Cyan
firebase deploy --only "hosting,functions,dataconnect"

Write-Host "[3/3] Deployment complete." -ForegroundColor Green
Write-Host "  - Hosting:   https://feexsystems-prod-508304.web.app"
Write-Host "  - Functions: https://us-central1-feexsystems-prod-508304.cloudfunctions.net/api/ping"
Write-Host ""
Write-Host "Runtime environment variables (DATABASE_URL, REDIS_URL, JWT_SECRET,"
Write-Host "ENCRYPTION_KEY, SENTRY_DSN, CORS_ORIGIN, ...) are provisioned in the"
Write-Host "Google Cloud project (Secret Manager / Cloud Functions settings), NOT"
Write-Host "in this repository. See docs/FIREBASE_DEPLOYMENT.md."
