# FeexSystems Deployment Scripts

This directory contains scripts for automating FeexSystems deployment and configuration.

## Scripts

### setup-secrets.sh
**Purpose**: Set up all required secrets in GCP Secret Manager

**Usage**:
```bash
./scripts/setup-secrets.sh
```

**What it does**:
- Enables Secret Manager API
- Prompts for all required secrets
- Stores secrets in GCP Secret Manager
- Provides guidance for each secret

**Secrets configured**:
- Firebase Service Account Key (PRIMARY AUTH SECRET)
- Firebase Auth (source of truth) — no app-issued JWT secrets
- Encryption Key
- Database & Redis credentials
- Firebase configuration
- AI provider API keys
- GitHub integration secrets
- Payment gateway secrets
- Email configuration
- Monitoring & observability secrets

**Prerequisites**:
- gcloud CLI installed and authenticated
- Firebase CLI installed and authenticated
- IAM permissions (Secret Manager Admin)

---

### test-firestore-rules.sh
**Purpose**: Test Firebase Firestore security rules before production deployment

**Usage**:
```bash
./scripts/test-firestore-rules.sh
```

**What it does**:
- Creates manual test checklist for Firebase Console Simulator
- Sets up Firebase Emulator for automated testing
- Generates automated test template
- Provides deployment test procedure
- Documents rule evaluation monitoring

**Tests**:
1. Unauthenticated access (should fail)
2. Authenticated owner access (should pass)
3. Cross-user access (should fail)
4. Chat room owner access (should pass)
5. Telemetry write access (should pass)
6. Telemetry immutability (update should fail)
7. Default deny for unknown collections (should fail)

**Prerequisites**:
- Firebase CLI installed and authenticated
- Firestore security rules defined in `firestore.rules`

---

### deploy-production.sh
**Purpose**: Automated production deployment with validation and health checks

**Usage**:
```bash
# Deploy to staging
./scripts/deploy-production.sh staging

# Deploy to production
./scripts/deploy-production.sh production
```

**What it does**:
1. Pre-deployment validation (CLI tools, authentication, Node version)
2. Environment validation (secrets check)
3. Build and test (typecheck, lint, unit tests, build)
4. Infrastructure provisioning (Terraform)
5. Firebase deployment (Hosting + Functions)
6. Health checks (hosting, API)
7. Verification (security rules, database, Redis)
8. Rollback procedures documentation

**Prerequisites**:
- gcloud CLI installed and authenticated
- Firebase CLI installed and authenticated
- Terraform installed
- All secrets configured in GCP Secret Manager
- Infrastructure Terraform configuration

**Environment variables**:
- `PROJECT_ID`: GCP/Firebase project ID (default: feexsystems-prod-508304)
- `REGION`: GCP region (default: us-central1)

---

### deploy-supabase-functions.sh / deploy-supabase-functions.ps1

**Purpose**: Deploy Supabase Edge Functions to the linked Supabase project (`anzhoagofbebgojbidxu`).

**Usage**:
```bash
# macOS / Linux / WSL
npm run deploy:supabase
# or directly:
./scripts/deploy-supabase-functions.sh

# Windows
npm run deploy:supabase:win
# or directly:
powershell -ExecutionPolicy Bypass -File scripts/deploy-supabase-functions.ps1
```

**What it does**:
1. Runs `npx supabase functions deploy api --project-ref anzhoagofbebgojbidxu` — uploads and deploys the bundled `api` Edge Function to Supabase.
2. Prints the function endpoint URL for verification.

**Prerequisites**:
- Supabase CLI installed (via `npm install` → `npx supabase`)
- Project linked: `supabase link --project-ref anzhoagofbebgojbidxu`
  (already linked — see `supabase/.temp/linked-project.json`)
- Runtime env vars (optional — function falls back to platform-injected `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` if not set):
  `FEEX_SUPABASE_URL`, `FEEX_SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN`
  > **Note**: Only set `FEEX_SUPABASE_SERVICE_ROLE_KEY` if you need to override the project's built-in service-role key. Do **not** reuse a JWT minted for a different project — its `iss`/`ref` claims won't match and PostgREST will reject it with `Invalid API key`. When unset, Supabase injects the correct project-scoped key automatically.
- Authentication: `supabase login` (or `SUPABASE_ACCESS_TOKEN` env var)

**CI integration**: The `deploy-supabase-functions` job in `.github/workflows/deploy.yml` runs this automatically on every push to `main`, after the quality gate passes. It uses the `SUPABASE_ACCESS_TOKEN` GitHub secret.

**Troubleshooting**:
- `Error: Could not find a valid project link`: Run `supabase link --project-ref anzhoagofbebgojbidxu`
- Function returns `Invalid API key` on DB endpoints: Unset `FEEX_SUPABASE_SERVICE_ROLE_KEY` if it holds a JWT minted for a different project (check `iss`/`ref` claims). The function falls back to the built-in `SUPABASE_SERVICE_ROLE_KEY`.
- Function returns 500: Check environment variables in the Supabase dashboard
- `Permission denied`: Ensure you are a project member with the `supabase.edge_functions.admin` role

**Required GitHub Secret (for CI)**:
- `SUPABASE_ACCESS_TOKEN` — Personal Access Token from https://app.supabase.com with `full` scope

---
## Quick Start

### First-Time Setup

1. **Set up secrets**:
   ```bash
   ./scripts/setup-secrets.sh
   ```

2. **Test security rules**:
   ```bash
   ./scripts/test-firestore-rules.sh
   ```

3. **Deploy to staging**:
   ```bash
   ./scripts/deploy-production.sh staging
   ```

4. **Verify staging deployment**:
   - Open hosting URL
   - Test authentication
   - Test critical features
   - Monitor logs

5. **Deploy to production**:
   ```bash
   ./scripts/deploy-production.sh production
   ```

---

## Rollback Procedures

### Firebase Functions Rollback
```bash
firebase deploy --only functions --project feexsystems-prod-508304 --force
```

### Terraform Rollback
```bash
cd terraform
terraform rollback
```

### Manual Rollback
```bash
# Checkout previous deployment commit
git checkout <commit-hash>

# Redeploy
./scripts/deploy-production.sh
```

---

## Troubleshooting

### Script Permission Denied
```bash
chmod +x scripts/*.sh
```

### gcloud Not Authenticated
```bash
gcloud auth login
```

### Firebase Not Authenticated
```bash
firebase login
```

### Terraform State Lock
```bash
cd terraform
terraform force-unlock <LOCK_ID>
```

### Secrets Not Found
```bash
./scripts/setup-secrets.sh
```

---

## Documentation

- [Secret Manager Setup Guide](../docs/SECRET-MANAGER-SETUP.md)
- [Secret Rotation Guide](../docs/SECRET-ROTATION-GUIDE.md)
- [Security Audit Checklist](../docs/SECURITY-AUDIT-CHECKLIST.md)
- [Dual Database Architecture](../docs/DUAL-DATABASE-ARCHITECTURE.md)
- [AGENTS.md](../AGENTS.md)

---

## Best Practices

1. **Always test in staging first** - Never deploy directly to production
2. **Run tests before deployment** - The script includes automated tests
3. **Monitor health checks** - Verify all health checks pass
4. **Have rollback plan ready** - Documented in script output
5. **Review Terraform plan** - Always review before applying
6. **Keep secrets secure** - Never commit secrets to repository
7. **Monitor after deployment** - Check logs and error tracking

---

## Support

For issues or questions:
- DevOps Team: devops@feexsystems.codes
- Security Team: security@feexsystems.codes
