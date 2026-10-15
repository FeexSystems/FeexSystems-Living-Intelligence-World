# Secret Rotation Guide

## Overview

This guide provides step-by-step instructions for rotating all secrets in the FeexSystems platform. **Secret rotation is critical security practice** and should be performed:

- Immediately after any suspected exposure
- On a regular schedule (recommended: every 90 days)
- After any team member with access leaves the organization
- After any security incident or breach

---

## 🔴 CRITICAL: Rotate These Secrets IMMEDIATELY

If you found this document because secrets were exposed (e.g., in `.env` file), **rotate ALL secrets immediately before proceeding**.

---

## Secrets Inventory

### 1. Firebase Service Account Key (PRIMARY AUTH SECRET)

**Purpose**: Firebase Admin SDK authentication for server-side operations

**Architecture Note**: FeexSystems uses a hybrid authentication system:
- **Firebase Auth**: Primary authentication for HTTP requests (frontend → Firebase → server verification)
- **Custom JWT**: WebSocket connections and internal operations (server-signed for state management)

**Locations**:
- Environment: `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string, base64-encoded)
- Validation: `server/lib/config/validate-env.ts`
- Usage: `server/lib/firebase-admin.ts`

**Rotation Impact**:
- Firebase Admin operations will fail (token verification, Firestore admin operations)
- Users cannot authenticate via Firebase Auth (Admin SDK verification fails)
- Firestore server-side writes will fail

**Rotation Steps**:

```bash
# 1. Generate new service account key in Firebase Console
# Firebase Console → Project Settings → Service Accounts
# Click "Generate New Private Key"
# Download the JSON file

# 2. Convert to base64 (for Secret Manager)
cat new-service-account.json | base64 -w 0

# 3. Update GCP Secret Manager
firebase functions:secrets:set FIREBASE_SERVICE_ACCOUNT_KEY
# Paste the base64-encoded JSON

# 4. Redeploy Firebase Functions
firebase deploy --only functions

# 5. Verify Firebase Admin operations work
# Test authentication flow
# Test Firestore admin operations

# 6. Delete old key from Firebase Console (after 24 hours)
```

**Fallback Strategy**: Keep old key for 24 hours during transition

---

### 2. Custom JWT Secrets (WebSocket & Internal Operations)

**Purpose**: Custom JWT signing for WebSocket connections and internal state management

**Note**: These are used alongside Firebase Auth. Firebase Auth handles HTTP request authentication, while custom JWTs are used for:
- WebSocket connection authentication
- Internal service-to-service communication
- Session state management in WebSocket connections

**Locations**:
- Environment: `JWT_SECRET`, `JWT_REFRESH_SECRET`
- Validation: `server/lib/config/validate-env.ts`
- Usage: `server/lib/auth.ts`, WebSocket services

**Rotation Impact**:
- All WebSocket connections will be disconnected
- Users will need to reconnect (re-authentication handled by Firebase Auth)
- Internal service communication may fail temporarily

**Rotation Steps**:

```bash
# 1. Generate new secrets (32+ characters, high entropy)
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For JWT_REFRESH_SECRET

# 2. Update GCP Secret Manager
firebase functions:secrets:set JWT_SECRET
firebase functions:secrets:set JWT_REFRESH_SECRET

# 3. Redeploy Firebase Functions
firebase deploy --only functions

# 4. Monitor WebSocket reconnection rates
# Users will automatically reconnect using Firebase Auth
```

**Fallback Strategy**: Keep old secrets for 24 hours during transition

---

### 2. Encryption Key

**Purpose**: Encrypt sensitive data at rest (e.g., repository access tokens)

**Locations**:
- Environment: `ENCRYPTION_KEY`
- Validation: `server/lib/config/validate-env.ts`
- Usage: `server/lib/utils/encryption.ts`

**Rotation Impact**:
- **CRITICAL**: All encrypted data will become unreadable
- Repository access tokens must be re-encrypted
- Any encrypted fields in database will be corrupted

**Rotation Steps**:

```bash
# 1. Generate new encryption key (32+ characters, high entropy)
openssl rand -hex 32

# 2. BEFORE rotating key: Decrypt all sensitive data
# Run migration script to decrypt existing encrypted fields
# (Create a migration in prisma/migrations/)

# 3. Update GCP Secret Manager
firebase functions:secrets:set ENCRYPTION_KEY

# 4. Redeploy Firebase Functions
firebase deploy --only functions

# 5. Re-encrypt all sensitive data with new key
# Run migration script to re-encrypt fields

# 6. Verify data integrity
```

**Fallback Strategy**: Keep old key temporarily for gradual migration

---

### 3. Paystack API Keys

**Purpose**: Payment processing and subscription management

**Locations**:
- Environment: `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`
- Client: `VITE_PAYSTACK_PUBLIC_KEY`
- Usage: `server/routes/paystack.ts`

**Rotation Impact**:
- Active subscriptions will continue (Paystack backend)
- New transactions will fail until keys updated
- Webhook verification may fail

**Rotation Steps**:

```bash
# 1. Generate new keys in Paystack Dashboard
# Login: https://dashboard.paystack.co/#/settings/keys
# Click "Regenerate" for both Secret and Public keys

# 2. Update GCP Secret Manager
firebase functions:secrets:set PAYSTACK_SECRET_KEY
firebase functions:secrets:set PAYSTACK_PUBLIC_KEY

# 3. Update client environment variable
# In Firebase Hosting config or .env.production:
VITE_PAYSTACK_PUBLIC_KEY="pk_live_NEW_KEY"

# 4. Redeploy Firebase Functions + Hosting
firebase deploy --only functions,hosting

# 5. Update webhook URL in Paystack Dashboard
# (if webhook endpoint changed)
```

**Fallback Strategy**: Keep old keys for 24 hours during transition

---

### 4. Firebase Service Account Key

**Purpose**: Server-side Firebase Admin SDK authentication

**Locations**:
- Environment: `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string)
- Local: `firebase-service-account.json` (NEVER commit)
- Usage: `server/lib/firebase-admin.ts`

**Rotation Impact**:
- Firebase Admin operations will fail
- Token verification will fail
- Firestore/Firebase Realtime Database access will fail

**Rotation Steps**:

```bash
# 1. Generate new service account key
# Firebase Console → Project Settings → Service Accounts
# Click "Generate New Private Key"

# 2. Convert to base64 (for Secret Manager)
cat new-service-account.json | base64 -w 0

# 3. Update GCP Secret Manager
firebase functions:secrets:set FIREBASE_SERVICE_ACCOUNT_KEY

# 4. Redeploy Firebase Functions
firebase deploy --only functions

# 5. Delete old key from Firebase Console
# (Keep for 24 hours for verification)
```

**Fallback Strategy**: Keep old key temporarily for verification

---

### 5. GitHub Personal Access Token

**Purpose**: GitHub API access for World Model sync

**Locations**:
- Environment: `GITHUB_TOKEN`, `GITHUB_ACCESS_TOKEN`
- Usage: `server/lib/services/github-pinned.service.ts`

**Rotation Impact**:
- GitHub World Model sync will fail
- Webhook verification may fail
- Repository ingestion will fail

**Rotation Steps**:

```bash
# 1. Generate new PAT in GitHub Settings
# GitHub → Settings → Developer Settings → Personal Access Tokens
# Scopes: repo, read:org, admin:repo_hook

# 2. Update GCP Secret Manager
firebase functions:secrets:set GITHUB_TOKEN

# 3. Redeploy Firebase Functions
firebase deploy --only functions

# 4. Update webhook secret in GitHub repository settings
# (if GITHUB_WEBHOOK_SECRET also rotated)

# 5. Revoke old token in GitHub Settings
```

**Fallback Strategy**: Keep old token for 24 hours during transition

---

### 6. GitHub Webhook Secret

**Purpose**: Verify GitHub webhook payloads

**Locations**:
- Environment: `GITHUB_WEBHOOK_SECRET`
- Usage: `server/routes/world-model.ts` (webhook handler)

**Rotation Impact**:
- GitHub webhooks will fail verification
- Evidence Fabric ingestion will fail

**Rotation Steps**:

```bash
# 1. Generate new webhook secret (32+ characters, high entropy)
openssl rand -hex 32

# 2. Update GCP Secret Manager
firebase functions:secrets:set GITHUB_WEBHOOK_SECRET

# 3. Redeploy Firebase Functions
firebase deploy --only functions

# 4. Update webhook secret in GitHub repository settings
# GitHub → Repository → Settings → Webhooks → Edit
# Paste new secret

# 5. Test webhook delivery
curl -X POST https://api.github.com/repos/FeexSystems/REPO/hooks/ID/tests
```

**Fallback Strategy**: Keep old secret for 24 hours during transition

---

### 7. AI Provider API Keys

**Purpose**: AI model inference (Gemini, Anthropic, OpenAI)

**Locations**:
- Environment: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- Usage: `server/lib/services/ai.service.ts`

**Rotation Impact**:
- AI features will fail
- Omni-Command will fail
- Navigator will fail

**Rotation Steps**:

```bash
# For each provider (Gemini, Anthropic, OpenAI):

# 1. Generate new API key in provider dashboard
# Gemini: https://makersuite.google.com/app/apikey
# Anthropic: https://console.anthropic.com/
# OpenAI: https://platform.openai.com/api-keys

# 2. Update GCP Secret Manager
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:set OPENAI_API_KEY

# 3. Redeploy Firebase Functions
firebase deploy --only functions

# 4. Revoke old keys in provider dashboards
```

**Fallback Strategy**: Keep old keys for 24 hours during transition

---

### 8. Redis Password

**Purpose**: Redis authentication

**Locations**:
- Environment: `REDIS_PASSWORD`, `REDIS_URL`
- Usage: `server/lib/redis.ts`

**Rotation Impact**:
- Redis connection will fail
- Caching will fail
- Rate limiting will fail (fallback: allow requests)

**Rotation Steps**:

```bash
# 1. Generate new password (32+ characters, high entropy)
openssl rand -hex 32

# 2. Update Redis instance password
# For Memorystore: gcloud redis instances update INSTANCE --password=NEW_PASS
# For Docker: Update docker-compose.yml and redeploy

# 3. Update GCP Secret Manager
firebase functions:secrets:set REDIS_PASSWORD
firebase functions:secrets:set REDIS_URL

# 4. Redeploy Firebase Functions
firebase deploy --only functions
```

**Fallback Strategy**: None - Redis connection will fail until updated

---

### 9. Database Password

**Purpose**: PostgreSQL authentication

**Locations**:
- Environment: `DATABASE_URL`
- Usage: `server/lib/database.ts`

**Rotation Impact**:
- Database connection will fail
- ALL application features will fail

**Rotation Steps**:

```bash
# 1. Generate new password (32+ characters, high entropy)
openssl rand -hex 32

# 2. Update database password
# For Cloud SQL: gcloud sql users set-password postgres --instance=INSTANCE --password=NEW_PASS
# For Docker: Update docker-compose.yml and redeploy

# 3. Update GCP Secret Manager
firebase functions:secrets:set DATABASE_URL

# 4. Redeploy Firebase Functions
firebase deploy --only functions
```

**Fallback Strategy**: None - database connection will fail until updated

---

### 10. Sentry DSN

**Purpose**: Error tracking and monitoring

**Locations**:
- Environment: `SENTRY_DSN`, `VITE_SENTRY_DSN`
- Usage: `server/lib/logging/sentry.ts`

**Rotation Impact**:
- Error tracking will stop
- No performance monitoring

**Rotation Steps**:

```bash
# 1. Generate new DSN in Sentry dashboard
# Sentry → Settings → Projects → FeexSystems → Client Keys (DSN)

# 2. Update GCP Secret Manager
firebase functions:secrets:set SENTRY_DSN

# 3. Update client environment variable
# In Firebase Hosting config or .env.production:
VITE_SENTRY_DSN="https://NEW_DSN@sentry.io/PROJECT"

# 4. Redeploy Firebase Functions + Hosting
firebase deploy --only functions,hosting
```

**Fallback Strategy**: Minimal - error tracking stops but app continues

---

### 11. Firebase Security Rules (Firestore & Realtime Database)

**Purpose**: Database access control and data validation

**Locations**:
- Firestore: `firestore.rules`
- Realtime Database: `database.rules.json` (if used)
- Firebase Console: Firestore → Rules

**Rotation Impact**:
- Changes take effect immediately
- Existing operations may fail if rules become more restrictive
- No downtime if rules are tested before deployment

**Rotation Steps**:

```bash
# 1. Update security rules locally
# Edit firestore.rules with new rules

# 2. Test rules in Firebase Console
# Firebase Console → Firestore → Rules → Simulator
# Test read/write operations with different user roles

# 3. Deploy rules
firebase deploy --only firestore:rules

# 4. Monitor for rule violations in Firebase Console
# Firebase Console → Firestore → Usage → Rule evaluation
```

**Fallback Strategy**: Keep previous rules version for rollback

---

## Automated Rotation Script

Create `scripts/rotate-secrets.sh`:

```bash
#!/bin/bash
# FeexSystems Secret Rotation Script
# Usage: ./scripts/rotate-secrets.sh <secret-name>

set -e

SECRET_NAME=$1

if [ -z "$SECRET_NAME" ]; then
  echo "Usage: $0 <secret-name>"
  echo "Available secrets: JWT_SECRET, ENCRYPTION_KEY, PAYSTACK_SECRET_KEY, etc."
  exit 1
fi

echo "Rotating secret: $SECRET_NAME"

# Generate new secret (adjust based on secret type)
NEW_SECRET=$(openssl rand -hex 32)

# Update GCP Secret Manager
firebase functions:secrets:set $SECRET_NAME <<< "$NEW_SECRET"

# Redeploy Firebase Functions
firebase deploy --only functions

echo "Secret rotated successfully: $SECRET_NAME"
echo "IMPORTANT: Update any dependent systems and revoke old secret"
```

Make executable:
```bash
chmod +x scripts/rotate-secrets.sh
```

---

## Monitoring After Rotation

After rotating any secret, monitor for:

1. **Error spikes** in Sentry
2. **Failed authentication** in logs
3. **Payment failures** in Paystack dashboard
4. **Webhook failures** in GitHub repository settings
5. **Database connection errors** in Cloud Logging

**Rollback Procedure**:

If critical failures occur after rotation:

```bash
# 1. Restore old secret from backup
firebase functions:secrets:set SECRET_NAME <<< "OLD_SECRET_VALUE"

# 2. Redeploy immediately
firebase deploy --only functions

# 3. Investigate root cause before re-rotating
```

---

## Best Practices

1. **Never rotate all secrets at once** - rotate one at a time and verify
2. **Keep old secrets for 24-48 hours** before revoking
3. **Document rotation dates** in a secrets log
4. **Use automated tools** (e.g., HashiCorp Vault) for scheduled rotation
5. **Test rotation in staging** before production
6. **Notify users** for secrets that affect authentication (JWT)
7. **Monitor closely** for 24 hours after rotation
8. **Have rollback plan** ready before rotating

---

## Secret Rotation Schedule

Recommended rotation cadence:

| Secret | Frequency | Notes |
|--------|-----------|-------|
| Firebase Service Account | Every 180 days | PRIMARY AUTH SECRET - critical rotation |
| Custom JWT Secrets (WebSocket) | Every 90 days | WebSocket disconnection expected |
| Encryption Key | Every 180 days | Requires data migration |
| Paystack Keys | Every 90 days | Low impact |
| GitHub PAT | Every 90 days | Low impact |
| GitHub Webhook Secret | Every 90 days | Low impact |
| AI API Keys | Every 90 days | Low impact |
| Redis Password | Every 180 days | Requires Redis restart |
| Database Password | Every 180 days | Requires database restart |
| Sentry DSN | Never (unless compromised) | No security benefit |
| Firebase Security Rules | As needed | Test before deployment |

---

## Emergency Procedure: Secret Exposure

If secrets are confirmed exposed (e.g., leaked in repository):

1. **IMMEDIATE ACTIONS** (within 1 hour):
   - Rotate ALL secrets immediately
   - Revoke all exposed tokens
   - Notify security team
   - Check logs for unauthorized access

2. **FOLLOW-UP ACTIONS** (within 24 hours):
   - Audit access logs for the exposure period
   - Review IAM permissions
   - Update security policies
   - Document incident

3. **POST-MORTEM** (within 1 week):
   - Root cause analysis
   - Process improvements
   - Team training
   - Update this guide

---

## Contact

For questions or emergencies:
- Security Team: security@feexsystems.codes
- DevOps Team: devops@feexsystems.codes
- On-Call: [TODO: Add on-call contact]
