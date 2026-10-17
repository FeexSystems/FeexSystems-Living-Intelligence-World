# GCP Secret Manager Setup Guide

## Overview

This guide provides step-by-step instructions for setting up GCP Secret Manager for the FeexSystems production deployment. Secret Manager is the canonical secret storage for Firebase Functions (Cloud Functions Gen 2).

---

## Prerequisites

- GCP Project: `feexsystems-prod-508304`
- Firebase CLI installed: `npm install -g firebase-tools`
- gcloud CLI installed and authenticated
- Appropriate IAM permissions:
  - `Secret Manager Admin` or `Secret Manager Secret Accessor`
  - `Cloud Functions Admin`
  - `Firebase Hosting Admin`

---

## Quick Start

```bash
# 1. Set your GCP project
gcloud config set project feexsystems-prod-508304

# 2. Authenticate with gcloud
gcloud auth login

# 3. Enable Secret Manager API (if not already enabled)
gcloud services enable secretmanager.googleapis.com

# 4. Create secrets for production
firebase functions:secrets:set ENCRYPTION_KEY
# ... (see full list below)

# 5. Deploy Firebase Functions with secrets
firebase deploy --only functions
```

---

## Complete Secret Inventory

Create all required secrets in Secret Manager:

### Core Authentication

```bash
# Firebase Service Account Key (Primary - for Firebase Admin SDK)
# 1. Download from Firebase Console → Project Settings → Service Accounts
# 2. Convert to base64: cat firebase-service-account.json | base64 -w 0
firebase functions:secrets:set FIREBASE_SERVICE_ACCOUNT_KEY
# Enter value: [paste base64-encoded JSON]

# Encryption key for sensitive data (32+ characters, high entropy)
firebase functions:secrets:set ENCRYPTION_KEY
# Enter value: [generate with: openssl rand -hex 32]

# Cookie signing secret (32+ characters, high entropy)
firebase functions:secrets:set COOKIE_SECRET
# Enter value: [generate with: openssl rand -hex 32]
```

### Database & Redis

```bash
# PostgreSQL connection string (Cloud SQL)
firebase functions:secrets:set DATABASE_URL
# Enter value: postgresql://USER:PASSWORD@10.x.x.x:5432/feexsystems_db?schema=public&sslmode=require

# Redis connection string (Memorystore)
firebase functions:secrets:set REDIS_URL
# Enter value: redis://:PASSWORD@10.y.y.y:6379

# Redis password (if using discrete form)
firebase functions:secrets:set REDIS_PASSWORD
# Enter value: [32+ char high-entropy password]
```

### Firebase Configuration

```bash
# Firebase service account key (JSON string, base64-encoded)
# 1. Download service account key from Firebase Console
# 2. Convert to base64: cat firebase-service-account.json | base64 -w 0
# 3. Set secret:
firebase functions:secrets:set FIREBASE_SERVICE_ACCOUNT_KEY
# Enter value: [paste base64-encoded JSON]

# Firebase project ID (can also be set as environment variable)
firebase functions:secrets:set FIREBASE_PROJECT_ID
# Enter value: feexsystems-prod-508304

# Firestore Database ID (if using named database)
firebase functions:secrets:set VITE_FIRESTORE_DATABASE_ID
# Enter value: feexsystems-db
```

### AI Provider Keys

```bash
# Google Gemini API key
firebase functions:secrets:set GEMINI_API_KEY
# Enter value: AIzaSy... (from Google AI Studio)

# Anthropic API key
firebase functions:secrets:set ANTHROPIC_API_KEY
# Enter value: sk-ant-... (from Anthropic Console)

# OpenAI API key
firebase functions:secrets:set OPENAI_API_KEY
# Enter value: sk-... (from OpenAI Platform)
```

### GitHub Integration

```bash
# GitHub Personal Access Token for World Model sync
firebase functions:secrets:set GITHUB_TOKEN
# Enter value: ghp_... (from GitHub Settings → Developer Settings → PATs)

# GitHub Webhook Secret (32+ characters, high entropy)
firebase functions:secrets:set GITHUB_WEBHOOK_SECRET
# Enter value: [generate with: openssl rand -hex 32]

# GitHub OAuth credentials (for GitHub login)
firebase functions:secrets:set GITHUB_CLIENT_ID
# Enter value: Iv1... (from GitHub OAuth App settings)

firebase functions:secrets:set GITHUB_CLIENT_SECRET
# Enter value: [from GitHub OAuth App settings]
```

### Payment Gateway

```bash
# Paystack Secret Key (live)
firebase functions:secrets:set PAYSTACK_SECRET_KEY
# Enter value: sk_live_... (from Paystack Dashboard)

# Paystack Public Key (live)
firebase functions:secrets:set PAYSTACK_PUBLIC_KEY
# Enter value: pk_live_... (from Paystack Dashboard)
```

### Email Configuration

```bash
# SMTP credentials
firebase functions:secrets:set SMTP_USER
# Enter value: your-email@gmail.com

firebase functions:secrets:set SMTP_PASS
# Enter value: your-app-password
```

### Monitoring & Observability

```bash
# Sentry DSN for error tracking
firebase functions:secrets:set SENTRY_DSN
# Enter value: https://...@sentry.io/... (from Sentry dashboard)
```

### Additional Configuration

```bash
# CORS origins (comma-separated)
firebase functions:secrets:set CORS_ORIGIN
# Enter value: https://feexsystems.codes,https://www.feexsystems.codes

# Application URL
firebase functions:secrets:set APP_URL
# Enter value: https://feexsystems.codes

# OpenTelemetry exporter endpoint
firebase functions:secrets:set OTEL_EXPORTER_OTLP_ENDPOINT
# Enter value: https://your-otel-collector.example.com/v1/traces
```

---

## Using Secrets in Firebase Functions

### Option 1: Automatic Secret Access (Recommended)

Firebase Functions Gen 2 automatically injects secrets as environment variables at runtime. No code changes needed.

```typescript
// In your function code:
const firebaseServiceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const dbUrl = process.env.DATABASE_URL;
```

### Option 2: Explicit Secret Access (Advanced)

For explicit secret access (e.g., for secrets that shouldn't be environment variables):

```typescript
import { getSecret } from 'firebase-admin/functions';

export const api = onRequest(async (req, res) => {
  const secret = await getSecret('MY_SECRET');
  const secretValue = secret.value; // Buffer
  console.log(secretValue.toString());
});
```

---

## Firebase-Specific Configuration

### Firebase Admin SDK Setup

The Firebase Admin SDK is used for:
- Token verification (Firebase Auth)
- Firestore admin operations
- User management (custom claims, deletion)

**Local Development**:
```bash
# Use Application Default Credentials (ADC)
gcloud auth application-default login

# Your code will automatically use ADC
# No GOOGLE_APPLICATION_CREDENTIALS needed
```

**Production**:
```bash
# Service account key stored in Secret Manager
firebase functions:secrets:set FIREBASE_SERVICE_ACCOUNT_KEY
```

### Firebase Client SDK Configuration

The Firebase Client SDK is used for:
- Authentication (Firebase Auth)
- Firestore client operations
- Remote Config
- Realtime Database (if used)

**Configuration in .env**:
```bash
# Firebase Client Configuration (Public - OK to commit in templates)
VITE_FIREBASE_API_KEY="AIzaSyYourFirebaseWebApiKey"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789012"
VITE_FIREBASE_APP_ID="1:123456789012:web:abcdef1234567890"
VITE_FIREBASE_MEASUREMENT_ID="G-XXXXXXXXXX"
VITE_FIREBASE_DATABASE_URL="https://your-project-default-rtdb.firebaseio.com"
VITE_FIRESTORE_DATABASE_ID="your-database-id"
```

**Reference**: `client/lib/firebase.ts`

---

## Secret Access in Code

Secrets are automatically available as environment variables in Firebase Functions:

```typescript
// server/lib/config/validate-env.ts
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  // ... other secrets
});
```

The environment validation in `server/lib/config/validate-env.ts` will enforce that required secrets are present at runtime.

---

## Deployment with Secrets

### Deploy All Functions with Secrets

```bash
# Deploy all functions (secrets are automatically mounted)
firebase deploy --only functions
```

### Deploy Specific Function with Secrets

```bash
# Deploy only the api function
firebase deploy --only functions:api
```

### Update Secrets Without Redeploy

```bash
# Update a secret value
firebase functions:secrets:set ENCRYPTION_KEY

# Secrets are automatically available on next function invocation
# No redeploy needed!
```

---

## Secret Versioning

Secret Manager automatically versions secrets. When you update a secret:

```bash
# Set new value (creates new version)
firebase functions:secrets:set ENCRYPTION_KEY
# Enter new value: new-secret-value

# List versions
gcloud secrets versions list ENCRYPTION_KEY

# Access specific version (if needed)
firebase functions:secrets:access ENCRYPTION_KEY --version 2
```

Functions automatically use the latest version. To pin to a specific version, use IAM conditions.

---

## Secret Access Control

### Grant Access to Service Account

```bash
# Find your Cloud Functions service account
gcloud functions describe api --region=us-central1 --format="value(serviceAccountEmail)"

# Grant Secret Manager access
gcloud secrets add-iam-policy-binding ENCRYPTION_KEY \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Grant Access to Specific Secrets

```bash
# Grant access to specific secret only
gcloud secrets add-iam-policy-binding ENCRYPTION_KEY \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant access to all secrets in project
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Local Development with Secrets

### Option 1: Use .env File (Development Only)

For local development, use a `.env` file (already in `.gitignore`):

```bash
# Copy template
cp .env.example .env

# Fill in values (use test/dev keys, not production)
nano .env
```

### Option 2: Use gcloud Application Default Credentials

For Firebase Admin SDK authentication:

```bash
# Authenticate with gcloud
gcloud auth application-default login

# Your code will automatically use ADC for Firebase Admin
# No GOOGLE_APPLICATION_CREDENTIALS needed
```

### Option 3: Pull Secrets Locally (Not Recommended)

**WARNING**: Never pull production secrets to local development.

```bash
# Only for emergency debugging with production data
gcloud secrets versions access latest --secret=ENCRYPTION_KEY
```

---

## Monitoring Secret Access

### Audit Secret Access

```bash
# View IAM policy for a secret
gcloud secrets get-iam-policy ENCRYPTION_KEY

# View access logs in Cloud Logging
# Filter: resource.type="secretmanager_secret"
```

### Set Up Alerting

Create a Cloud Monitoring alert for:
- Secret access failures
- Unauthorized secret access attempts
- Secret deletion events

---

## Secret Rotation

See [SECRET-ROTATION-GUIDE.md](./SECRET-ROTATION-GUIDE.md) for detailed rotation procedures.

Quick rotation:

```bash
# Generate new secret
NEW_SECRET=$(openssl rand -hex 32)

# Update in Secret Manager
firebase functions:secrets:set ENCRYPTION_KEY <<< "$NEW_SECRET"

# Redeploy functions (automatic on next invocation, but good practice)
firebase deploy --only functions
```

---

## Troubleshooting

### Secret Not Available in Function

**Symptom**: `process.env.ENCRYPTION_KEY` is `undefined`

**Solutions**:
1. Verify secret exists: `gcloud secrets list`
2. Verify secret is accessible: `gcloud secrets versions access latest --secret=ENCRYPTION_KEY`
3. Verify service account has permission: `gcloud secrets get-iam-policy ENCRYPTION_KEY`
4. Redeploy function: `firebase deploy --only functions:api`

### Secret Access Denied

**Symptom**: Error accessing secret in logs

**Solutions**:
1. Check IAM permissions
2. Verify service account email
3. Grant `roles/secretmanager.secretAccessor`

### Functions Deployment Fails

**Symptom**: Deployment fails with secret-related error

**Solutions**:
1. Verify all required secrets are set
2. Check secret names match environment variable names exactly
3. Verify Firebase CLI version: `firebase --version` (should be latest)

---

## Security Best Practices

1. **Never commit secrets to repository** - use Secret Manager
2. **Use separate secrets for each environment** (dev, staging, prod)
3. **Rotate secrets regularly** - see [SECRET-ROTATION-GUIDE.md](./SECRET-ROTATION-GUIDE.md)
4. **Use least privilege IAM** - grant only `secretAccessor` role
5. **Enable Secret Manager audit logging** - track access
6. **Use IAM conditions** - restrict access by time/IP if needed
7. **Never log secret values** - use redaction (already implemented in Sentry)
8. **Monitor secret access** - set up alerts for unusual activity

---

## Cost Considerations

Secret Manager pricing:
- **Storage**: $0.03 per GB per month (negligible for text secrets)
- **Access**: $0.03 per 10,000 access calls
- **Active secrets**: $0.06 per secret per month

For FeexSystems (~15 secrets):
- Monthly cost: ~$0.90 for active secrets
- Access calls: negligible for typical usage

---

## Additional Resources

- [GCP Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Firebase Functions Secrets](https://firebase.google.com/docs/functions/config-secrets)
- [Secret Manager IAM](https://cloud.google.com/secret-manager/docs/access-control)
- [Secret Rotation Guide](./SECRET-ROTATION-GUIDE.md)

---

## Contact

For questions or issues:
- DevOps Team: devops@feexsystems.codes
- Security Team: security@feexsystems.codes
