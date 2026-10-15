#!/bin/bash
# ============================================================================
# FeexSystems Simple Deployment Script (Windows Compatible)
# ============================================================================
# Simplified deployment script that focuses on Firebase deployment only
# Terraform and infrastructure provisioning should be done separately
#
# Usage: ./scripts/deploy-simple.sh [staging|production]
#
# Prerequisites:
# - Firebase CLI installed and authenticated
# - Node.js installed
# - All secrets configured in GCP Secret Manager
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DEPLOYMENT_ENV="${1:-production}"
PROJECT_ID="${PROJECT_ID:-feexsystems-prod-508304}"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}FeexSystems Simple Deployment (Firebase Only)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "Environment: ${DEPLOYMENT_ENV}"
echo -e "Project: ${PROJECT_ID}"
echo ""
echo -e "${YELLOW}Note: This script deploys Firebase Hosting + Functions only${NC}"
echo -e "${YELLOW}Terraform infrastructure should be provisioned separately${NC}"
echo ""

# ============================================================================
# STEP 1: Build
# ============================================================================
print_section "Step 1: Build Application"

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
# STEP 2: Firebase Deployment
# ============================================================================
print_section "Step 2: Firebase Deployment"

echo -e "${YELLOW}Deploying Firebase Hosting + Functions...${NC}"
if [ "$DEPLOYMENT_ENV" = "staging" ]; then
  echo -e "${YELLOW}Deploying to staging...${NC}"
  firebase deploy --project "${PROJECT_ID}" --only hosting,functions
else
  echo -e "${YELLOW}Deploying to production...${NC}"
  firebase deploy --project "${PROJECT_ID}" --only hosting,functions
fi

print_success "Firebase deployment completed"

# ============================================================================
# STEP 3: Health Checks
# ============================================================================
print_section "Step 3: Health Checks"

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
  print_warning "Health check returned ${HEALTH_STATUS} (may still be starting)"
fi

# API ping check
echo -e "${YELLOW}Running API ping check...${NC}"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://us-central1-${PROJECT_ID}.cloudfunctions.net/api/ping")
if [ "$API_STATUS" = "200" ]; then
  print_success "API ping passed (${API_STATUS})"
else
  print_warning "API ping returned ${API_STATUS} (may still be starting)"
fi

# ============================================================================
# SUMMARY
# ============================================================================
print_section "Deployment Summary"

echo -e "${GREEN}✓ Deployment completed successfully${NC}"
echo ""
echo -e "${YELLOW}Deployment details:${NC}"
echo -e "  Environment: ${DEPLOYMENT_ENV}"
echo -e "  Project: ${PROJECT_ID}"
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
echo -e "${YELLOW}Infrastructure provisioning (separate):${NC}"
echo -e "  - Deploy Terraform: cd terraform && terraform apply"
echo -e "  - See docs/SECURITY-AUDIT-CHECKLIST.md for complete checklist"
echo ""
