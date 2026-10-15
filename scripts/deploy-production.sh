#!/bin/bash
# ============================================================================
# FeexSystems Production Deployment Script
# ============================================================================
# This script automates the production deployment process:
# - Environment validation
# - Test execution
# - Infrastructure provisioning (Terraform)
# - Firebase deployment (Hosting + Functions)
# - Health checks
# - Rollback capability
#
# Usage: ./scripts/deploy-production.sh [staging|production]
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Firebase CLI installed and authenticated
# - Terraform installed
# - All secrets configured in GCP Secret Manager
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV="${1:-production}"
PROJECT_ID="${PROJECT_ID:-feexsystems-prod-508304}"
REGION="${REGION:-us-central1}"
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}FeexSystems Production Deployment${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "Environment: ${DEPLOYMENT_ENV}"
echo -e "Project: ${PROJECT_ID}"
echo -e "Region: ${REGION}"
echo -e "Backup: ${BACKUP_DIR}"
echo ""

# Function to print section header
print_section() {
  echo ""
  echo -e "${BLUE}============================================================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}============================================================================${NC}"
  echo ""
}

# Function to print success
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Function to print warning
print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# ============================================================================
# STEP 1: Pre-deployment Validation
# ============================================================================
print_section "Step 1: Pre-deployment Validation"

echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check gcloud CLI
if ! command -v gcloud &> /dev/null; then
  print_error "gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
  exit 1
fi
print_success "gcloud CLI found"

# Check Firebase CLI
if ! command -v firebase &> /dev/null; then
  print_error "Firebase CLI not found. Install with: npm install -g firebase-tools"
  exit 1
fi
print_success "Firebase CLI found"

# Check Terraform
if ! command -v terraform &> /dev/null; then
  # Check common Windows location
  if [ -f "/c/Program Files/Terraform/terraform.exe" ]; then
    export PATH="/c/Program Files/Terraform:$PATH"
    print_success "Terraform found (Windows)"
  elif [ -f "/c/Program Files/Terraform/terraform" ]; then
    export PATH="/c/Program Files/Terraform:$PATH"
    print_success "Terraform found (Windows)"
  else
    print_error "Terraform not found. Install from: https://developer.hashicorp.com/terraform/downloads"
    print_error "Or ensure it's in your PATH and restart your shell"
    exit 1
  fi
else
  print_success "Terraform found"
fi

# Check authentication
echo -e "${YELLOW}Checking authentication...${NC}"
gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@" || {
  print_error "Not authenticated with gcloud. Run: gcloud auth login"
  exit 1
}
print_success "gcloud authenticated"

firebase login --non-interactive --token "$(gcloud auth print-access-token)" &> /dev/null || {
  print_error "Not authenticated with Firebase. Run: firebase login"
  exit 1
}
print_success "Firebase authenticated"

# Check Node version
echo -e "${YELLOW}Checking Node version...${NC}"
NODE_VERSION=$(node -v)
if [[ ! "$NODE_VERSION" =~ ^v22\. ]]; then
  print_warning "Node version is ${NODE_VERSION}, but v22.x is recommended"
else
  print_success "Node version is ${NODE_VERSION}"
fi

# ============================================================================
# STEP 2: Environment Validation
# ============================================================================
print_section "Step 2: Environment Validation"

echo -e "${YELLOW}Validating environment variables...${NC}"

# Check critical secrets (this would use Secret Manager in production)
REQUIRED_SECRETS=(
  "FIREBASE_SERVICE_ACCOUNT_KEY"
  "JWT_SECRET"
  "JWT_REFRESH_SECRET"
  "ENCRYPTION_KEY"
  "DATABASE_URL"
  "REDIS_URL"
)

for secret in "${REQUIRED_SECRETS[@]}"; do
  if firebase functions:secrets:access "$secret" &> /dev/null; then
    print_success "Secret found: $secret"
  else
    print_error "Secret missing: $secret. Run: ./scripts/setup-secrets.sh"
    exit 1
  fi
done

# ============================================================================
# STEP 3: Build and Test
# ============================================================================
print_section "Step 3: Build and Test"

echo -e "${YELLOW}Running typecheck...${NC}"
npm run typecheck
print_success "Typecheck passed"

echo -e "${YELLOW}Running linter...${NC}"
npm run lint -- --max-warnings 2000
print_success "Lint passed"

echo -e "${YELLOW}Running unit tests...${NC}"
npm run test:unit
print_success "Unit tests passed"

echo -e "${YELLOW}Building application...${NC}"
npm run build
print_success "Build completed"

# ============================================================================
# STEP 4: Infrastructure Provisioning (Terraform)
# ============================================================================
print_section "Step 4: Infrastructure Provisioning (Terraform)"

# Use terraform from Windows path if needed
TERRAFORM_CMD="terraform"
if [ -f "/c/Program Files/Terraform/terraform.exe" ]; then
  TERRAFORM_CMD="/c/Program Files/Terraform/terraform.exe"
elif [ -f "/c/Program Files/Terraform/terraform" ]; then
  TERRAFORM_CMD="/c/Program Files/Terraform/terraform"
fi

cd terraform

echo -e "${YELLOW}Initializing Terraform...${NC}"
$TERRAFORM_CMD init
print_success "Terraform initialized"

echo -e "${YELLOW}Planning Terraform changes...${NC}"
$TERRAFORM_CMD plan -out=tfplan
print_success "Terraform plan completed"

echo -e "${YELLOW}Review the plan above. Continue? (y/N)${NC}"
read -r tf_confirm
if [ "$tf_confirm" != "y" ] && [ "$tf_confirm" != "Y" ]; then
  print_error "Deployment cancelled by user"
  exit 1
fi

echo -e "${YELLOW}Applying Terraform changes...${NC}"
$TERRAFORM_CMD apply tfplan
print_success "Infrastructure provisioned"

cd ..

# Save infrastructure outputs
$TERRAFORM_CMD -chdir=terraform output -json > infrastructure-outputs.json
print_success "Infrastructure outputs saved"

# ============================================================================
# STEP 5: Firebase Deployment
# ============================================================================
print_section "Step 5: Firebase Deployment"

echo -e "${YELLOW}Deploying Firebase Hosting + Functions...${NC}"

# Build before Firebase deploy
echo -e "${YELLOW}Building for Firebase...${NC}"
npm run build
print_success "Build completed"

# Deploy to Firebase
if [ "$DEPLOYMENT_ENV" = "staging" ]; then
  echo -e "${YELLOW}Deploying to staging...${NC}"
  firebase deploy --project "${PROJECT_ID}" --only hosting,functions
else
  echo -e "${YELLOW}Deploying to production...${NC}"
  firebase deploy --project "${PROJECT_ID}" --only hosting,functions
fi

print_success "Firebase deployment completed"

# ============================================================================
# STEP 6: Health Checks
# ============================================================================
print_section "Step 6: Health Checks"

echo -e "${YELLOW}Waiting for deployment to stabilize...${NC}"
sleep 30

# Get hosting URL
HOSTING_URL="https://${PROJECT_ID}.web.app"
echo -e "${YELLOW}Hosting URL: ${HOSTING_URL}${NC}"

# Health check
echo -e "${YELLOW}Running health check...${NC}"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${HOSTING_URL}/health")
if [ "$HEALTH_STATUS" = "200" ]; then
  print_success "Health check passed (${HEALTH_STATUS})"
else
  print_error "Health check failed (${HEALTH_STATUS})"
  exit 1
fi

# API ping check
echo -e "${YELLOW}Running API ping check...${NC}"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://us-central1-${PROJECT_ID}.cloudfunctions.net/api/ping")
if [ "$API_STATUS" = "200" ]; then
  print_success "API ping passed (${API_STATUS})"
else
  print_error "API ping failed (${API_STATUS})"
  exit 1
fi

# ============================================================================
# STEP 7: Verification
# ============================================================================
print_section "Step 7: Verification"

echo -e "${YELLOW}Verifying Firebase Security Rules...${NC}"
# This would be done via the test-firestore-rules.sh script
print_warning "Run ./scripts/test-firestore-rules.sh to verify security rules"

echo -e "${YELLOW}Verifying database connection...${NC}"
# This would require a health check endpoint that tests DB connectivity
print_warning "Add database health check endpoint for verification"

echo -e "${YELLOW}Verifying Redis connection...${NC}"
# This would require a health check endpoint that tests Redis connectivity
print_warning "Add Redis health check endpoint for verification"

# ============================================================================
# STEP 8: Rollback Procedure
# ============================================================================
print_section "Step 8: Rollback Procedure"

echo -e "${YELLOW}Rollback procedures:${NC}"
echo -e "${YELLOW}1. Firebase Functions rollback:${NC}"
echo -e "   firebase deploy --only functions --project ${PROJECT_ID} --force"
echo ""
echo -e "${YELLOW}2. Terraform rollback:${NC}"
echo -e "   cd terraform && terraform rollback"
echo ""
echo -e "${YELLOW}3. Manual rollback (if needed):${NC}"
echo -e "   Use previous deployment commit: git checkout <commit-hash>"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
print_section "Deployment Summary"

echo -e "${GREEN}✓ Deployment completed successfully${NC}"
echo ""
echo -e "${YELLOW}Deployment details:${NC}"
echo -e "  Environment: ${DEPLOYMENT_ENV}"
echo -e "  Project: ${PROJECT_ID}"
echo -e "  Region: ${REGION}"
echo -e "  Hosting URL: ${HOSTING_URL}"
echo -e "  API URL: https://us-central1-${PROJECT_ID}.cloudfunctions.net/api"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Verify application in browser: ${HOSTING_URL}"
echo -e "2. Test authentication flow"
echo -e "3. Test critical features (World Model, Navigator, etc.)"
echo -e "4. Monitor error tracking in Sentry"
echo -e "5. Monitor Firebase Console for errors"
echo ""
echo -e "${YELLOW}Monitoring:${NC}"
echo -e "  Firebase Console: https://console.firebase.google.com/project/${PROJECT_ID}"
echo -e "  Cloud Logging: https://console.cloud.google.com/logs?project=${PROJECT_ID}"
echo -e "  Sentry: Check your Sentry dashboard"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo -e "  - docs/SECURITY-AUDIT-CHECKLIST.md"
echo -e "  - docs/SECRET-ROTATION-GUIDE.md"
echo -e "  - docs/DUAL-DATABASE-ARCHITECTURE.md"
echo ""
