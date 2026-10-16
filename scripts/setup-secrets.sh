#!/bin/bash
# ============================================================================
# FeexSystems GCP Secret Manager Setup Script
# ============================================================================
# This script creates all required secrets in GCP Secret Manager for production.
# Run this script to set up secrets before deploying to production.
#
# Usage: ./scripts/setup-secrets.sh
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Firebase CLI installed and authenticated
# - Appropriate IAM permissions (Secret Manager Admin)
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${PROJECT_ID:-feexsystems-prod-508304}"
REGION="${REGION:-us-central1}"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}FeexSystems GCP Secret Manager Setup${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "Project: ${PROJECT_ID}"
echo -e "Region: ${REGION}"
echo ""

# Function to prompt for secret value
prompt_secret() {
  local secret_name=$1
  local description=$2
  local is_base64=$3

  echo -e "${YELLOW}Setting secret: ${secret_name}${NC}"
  echo -e "${description}"
  echo ""

  if [ "$is_base64" = "true" ]; then
    echo -e "${YELLOW}Note: This secret should be base64-encoded${NC}"
    echo -e "${YELLOW}To encode: echo 'your-value' | base64 -w 0${NC}"
  fi

  read -p "Enter value (or press Enter to skip): " secret_value

  if [ -n "$secret_value" ]; then
    firebase functions:secrets:set "$secret_name" <<< "$secret_value"
    echo -e "${GREEN}✓ Secret set: ${secret_name}${NC}"
  else
    echo -e "${YELLOW}⊘ Skipped: ${secret_name}${NC}"
  fi

  echo ""
}

# Function to generate random secret
generate_secret() {
  local length=$1
  openssl rand -hex "$length"
}

# Enable Secret Manager API
echo -e "${BLUE}Enabling Secret Manager API...${NC}"
gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID"
echo -e "${GREEN}✓ Secret Manager API enabled${NC}"
echo ""

# ============================================================================
# CORE AUTHENTICATION SECRETS
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Core Authentication Secrets${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Firebase Service Account Key (PRIMARY AUTH SECRET)
echo -e "${RED}CRITICAL: Firebase Service Account Key (PRIMARY AUTH SECRET)${NC}"
echo -e "1. Go to Firebase Console → Project Settings → Service Accounts"
echo -e "2. Click 'Generate New Private Key'"
echo -e "3. Download the JSON file"
echo -e "4. Convert to base64: cat firebase-service-account.json | base64 -w 0"
echo ""
prompt_secret "FIREBASE_SERVICE_ACCOUNT_KEY" \
  "Base64-encoded Firebase service account JSON" \
  "true"

# Custom JWT Secrets (WebSocket & Internal Operations)
echo -e "${YELLOW}Custom JWT Secrets (for WebSocket & internal operations)${NC}"
prompt_secret "JWT_SECRET" \
  "Custom JWT signing secret (32+ chars, high entropy). Generate with: openssl rand -hex 32" \
  "false"

prompt_secret "JWT_REFRESH_SECRET" \
  "Custom JWT refresh secret (32+ chars, high entropy). Generate with: openssl rand -hex 32" \
  "false"

# Encryption Key
prompt_secret "ENCRYPTION_KEY" \
  "Encryption key for sensitive data (32+ chars, high entropy). Generate with: openssl rand -hex 32" \
  "false"

# Cookie Secret
prompt_secret "COOKIE_SECRET" \
  "Cookie signing secret (32+ chars, high entropy). Generate with: openssl rand -hex 32" \
  "false"

# ============================================================================
# DATABASE & CACHE SECRETS
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Database & Cache Secrets${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

prompt_secret "DATABASE_URL" \
  "PostgreSQL connection string. Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public&sslmode=require" \
  "false"

prompt_secret "REDIS_URL" \
  "Redis connection string. Format: redis://:PASSWORD@HOST:PORT" \
  "false"

prompt_secret "REDIS_PASSWORD" \
  "Redis password (32+ chars, high entropy). Generate with: openssl rand -hex 32" \
  "false"

# ============================================================================
# FIREBASE CONFIGURATION
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Firebase Configuration${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

prompt_secret "FIREBASE_PROJECT_ID" \
  "Firebase project ID. Example: feexsystems-prod-508304" \
  "false"

prompt_secret "VITE_FIRESTORE_DATABASE_ID" \
  "Firestore database ID. Example: feexsystems-db" \
  "false"

# ============================================================================
# AI PROVIDER SECRETS
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}AI Provider Secrets${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

prompt_secret "GEMINI_API_KEY" \
  "Google Gemini API key. Get from: https://makersuite.google.com/app/apikey" \
  "false"

prompt_secret "ANTHROPIC_API_KEY" \
  "Anthropic API key. Get from: https://console.anthropic.com/" \
  "false"

prompt_secret "OPENAI_API_KEY" \
  "OpenAI API key. Get from: https://platform.openai.com/api-keys" \
  "false"

# ============================================================================
# GITHUB INTEGRATION SECRETS
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}GitHub Integration Secrets${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

prompt_secret "GITHUB_TOKEN" \
  "GitHub Personal Access Token. Get from: GitHub → Settings → Developer Settings → PATs" \
  "false"

prompt_secret "GITHUB_WEBHOOK_SECRET" \
  "GitHub webhook secret (32+ chars, high entropy). Generate with: openssl rand -hex 32" \
  "false"

prompt_secret "GITHUB_CLIENT_ID" \
  "GitHub OAuth App Client ID. Get from: GitHub → Settings → Developer Settings → OAuth Apps" \
  "false"

prompt_secret "GITHUB_CLIENT_SECRET" \
  "GitHub OAuth App Client Secret. Get from: GitHub → Settings → Developer Settings → OAuth Apps" \
  "false"

# ============================================================================
# PAYMENT GATEWAY SECRETS
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Payment Gateway Secrets${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

prompt_secret "PAYSTACK_SECRET_KEY" \
  "Paystack Secret Key (live). Get from: https://dashboard.paystack.co/#/settings/keys" \
  "false"

prompt_secret "PAYSTACK_PUBLIC_KEY" \
  "Paystack Public Key (live). Get from: https://dashboard.paystack.co/#/settings/keys" \
  "false"

# ============================================================================
# EMAIL CONFIGURATION SECRETS
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Email Configuration Secrets${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

prompt_secret "SMTP_USER" \
  "SMTP username (email address)" \
  "false"

prompt_secret "SMTP_PASS" \
  "SMTP password (app password)" \
  "false"

# ============================================================================
# MONITORING & OBSERVABILITY SECRETS
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Monitoring & Observability Secrets${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

prompt_secret "SENTRY_DSN" \
  "Sentry DSN for error tracking. Get from: Sentry → Settings → Projects → Client Keys" \
  "false"

prompt_secret "OTEL_EXPORTER_OTLP_ENDPOINT" \
  "OpenTelemetry exporter endpoint. Example: https://your-otel-collector.example.com/v1/traces" \
  "false"

# ============================================================================
# ADDITIONAL CONFIGURATION SECRETS
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Additional Configuration Secrets${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

prompt_secret "CORS_ORIGIN" \
  "Comma-separated list of allowed CORS origins. Example: https://feexsystems.codes,https://www.feexsystems.codes" \
  "false"

prompt_secret "APP_URL" \
  "Application URL. Example: https://feexsystems.codes" \
  "false"

prompt_secret "GCS_BUCKET_NAME" \
  "Google Cloud Storage bucket name for artifacts. Example: feexsystems-artifacts-prod" \
  "false"

prompt_secret "GCS_EVIDENCE_BUCKET" \
  "Google Cloud Storage bucket name for evidence artifacts. Example: feexsystems-evidence-artifacts" \
  "false"

prompt_secret "BIGQUERY_DATASET" \
  "BigQuery dataset name for analytics. Example: feexsystems_analytics" \
  "false"

# ============================================================================
# SUMMARY
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Secret Setup Complete${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "${GREEN}✓ All secrets have been set up in GCP Secret Manager${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Verify secrets: firebase functions:secrets:access SECRET_NAME"
echo -e "2. Grant IAM permissions to Cloud Functions service account"
echo -e "3. Deploy Firebase Functions: firebase deploy --only functions"
echo -e "4. Test deployment in staging environment"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo -e "- docs/SECRET-MANAGER-SETUP.md"
echo -e "- docs/SECRET-ROTATION-GUIDE.md"
echo ""
