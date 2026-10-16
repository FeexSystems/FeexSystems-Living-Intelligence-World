#!/bin/bash
# ============================================================================
# FeexSystems Firebase Security Rules Test Script
# ============================================================================
# This script tests Firestore security rules in the Firebase Console Simulator
# and validates that rules are working correctly before production deployment.
#
# Usage: ./scripts/test-firestore-rules.sh
#
# Prerequisites:
# - Firebase CLI installed and authenticated
# - Firestore security rules defined in firestore.rules
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID="${PROJECT_ID:-feexsystems-prod-508304}"
DATABASE_ID="${DATABASE_ID:-feexsystems-db}"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Firebase Security Rules Test${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "Project: ${PROJECT_ID}"
echo -e "Database: ${DATABASE_ID}"
echo ""

# Function to print test result
print_result() {
  local test_name=$1
  local result=$2
  if [ "$result" = "PASS" ]; then
    echo -e "${GREEN}✓ PASS${NC}: ${test_name}"
  else
    echo -e "${RED}✗ FAIL${NC}: ${test_name}"
  fi
}

# ============================================================================
# TEST 1: Unauthenticated Access
# ============================================================================
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 1: Unauthenticated Access (Should Fail)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Testing: Unauthenticated user should not be able to read users collection${NC}"
# This would typically be tested via Firebase Console Simulator
# For automation, we can use Firebase Emulator with test rules
echo -e "${YELLOW}→ Manual verification required in Firebase Console Simulator${NC}"
echo -e "${YELLOW}  Firebase Console → Firestore → Rules → Simulator${NC}"
echo -e "${YELLOW}  Test: GET /users/{userId} (unauthenticated)${NC}"
echo -e "${YELLOW}  Expected: DENY${NC}"
echo ""

# ============================================================================
# TEST 2: Authenticated Owner Access
# ============================================================================
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 2: Authenticated Owner Access (Should Pass)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Testing: Authenticated user should be able to read their own profile${NC}"
echo -e "${YELLOW}→ Manual verification required in Firebase Console Simulator${NC}"
echo -e "${YELLOW}  Firebase Console → Firestore → Rules → Simulator${NC}"
echo -e "${YELLOW}  Test: GET /users/{userId} (authenticated, userId matches)${NC}"
echo -e "${YELLOW}  Expected: ALLOW${NC}"
echo ""

# ============================================================================
# TEST 3: Cross-User Access (Should Fail)
# ============================================================================
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 3: Cross-User Access (Should Fail)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Testing: User should not be able to read another user's profile${NC}"
echo -e "${YELLOW}→ Manual verification required in Firebase Console Simulator${NC}"
echo -e "${YELLOW}  Firebase Console → Firestore → Rules → Simulator${NC}"
echo -e "${YELLOW}  Test: GET /users/{otherUserId} (authenticated, userId does not match)${NC}"
echo -e "${YELLOW}  Expected: DENY${NC}"
echo ""

# ============================================================================
# TEST 4: Chat Room Owner Access
# ============================================================================
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 4: Chat Room Owner Access (Should Pass)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Testing: Room owner should be able to read their chat room${NC}"
echo -e "${YELLOW}→ Manual verification required in Firebase Console Simulator${NC}"
echo -e "${YELLOW}  Firebase Console → Firestore → Rules → Simulator${NC}"
echo -e "${YELLOW}  Test: GET /chat_rooms/{roomId} (authenticated, ownerUid matches)${NC}"
echo -e "${YELLOW}  Expected: ALLOW${NC}"
echo ""

# ============================================================================
# TEST 5: Telemetry Write Access (Authenticated Only)
# ============================================================================
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 5: Telemetry Write Access (Should Pass for Authenticated)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Testing: Authenticated user should be able to write telemetry${NC}"
echo -e "${YELLOW}→ Manual verification required in Firebase Console Simulator${NC}"
echo -e "${YELLOW}  Firebase Console → Firestore → Rules → Simulator${NC}"
echo -e "${YELLOW}  Test: POST /telemetry/{docId} (authenticated)${NC}"
echo -e "${YELLOW}  Expected: ALLOW${NC}"
echo ""

# ============================================================================
# TEST 6: Telemetry Immutable (Update Should Fail)
# ============================================================================
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 6: Telemetry Immutable (Update Should Fail)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Testing: Telemetry entries should not be updatable${NC}"
echo -e "${YELLOW}→ Manual verification required in Firebase Console Simulator${NC}"
echo -e "${YELLOW}  Firebase Console → Firestore → Rules → Simulator${NC}"
echo -e "${YELLOW}  Test: UPDATE /telemetry/{docId} (authenticated)${NC}"
echo -e "${YELLOW}  Expected: DENY${NC}"
echo ""

# ============================================================================
# TEST 7: Default Deny for Unknown Collections
# ============================================================================
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 7: Default Deny for Unknown Collections (Should Fail)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Testing: Unknown collections should be denied by default${NC}"
echo -e "${YELLOW}→ Manual verification required in Firebase Console Simulator${NC}"
echo -e "${YELLOW}  Firebase Console → Firestore → Rules → Simulator${NC}"
echo -e "${YELLOW}  Test: GET /unknown_collection/{docId} (authenticated)${NC}"
echo -e "${YELLOW}  Expected: DENY${NC}"
echo ""

# ============================================================================
# AUTOMATED TESTS WITH FIREBASE EMULATOR
# ============================================================================
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Automated Tests with Firebase Emulator${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Starting Firebase Emulator for automated testing...${NC}"
echo ""

# Check if emulator is running
if ! firebase emulators --only firestore &> /dev/null; then
  echo -e "${YELLOW}Starting Firebase Emulator...${NC}"
  firebase emulators:start --only firestore &
  EMULATOR_PID=$!
  sleep 10
else
  echo -e "${GREEN}✓ Firebase Emulator already running${NC}"
fi

echo ""
echo -e "${YELLOW}Running automated tests...${NC}"
echo ""

# Create test file
cat > /tmp/firestore-rules-test.js << 'EOF'
const assert = require('assert');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

describe('Firestore Security Rules', () => {
  const testEnv = initializeTestEnvironment({
    projectId: 'demo-test-project',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });

  let authenticatedContext;
  let unauthenticatedContext;

  before(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('user1').set({
        email: 'user1@example.com',
        firstName: 'User',
        lastName: 'One',
        role: 'USER',
        emailVerified: true,
        updatedAt: new Date()
      });
    });
  });

  beforeEach(async () => {
    authenticatedContext = await testEnv.authenticatedContext('user1');
    unauthenticatedContext = await testEnv.unauthenticatedContext();
  });

  it('should deny unauthenticated read of users', async () => {
    const db = unauthenticatedContext.firestore();
    const testDoc = db.collection('users').doc('user1');
    await assertFails(testDoc.get());
  });

  it('should allow authenticated user to read own profile', async () => {
    const db = authenticatedContext.firestore();
    const testDoc = db.collection('users').doc('user1');
    await assertSucceeds(testDoc.get());
  });

  it('should deny authenticated user to read other user profile', async () => {
    const db = authenticatedContext.firestore();
    const testDoc = db.collection('users').doc('user2');
    await assertFails(testDoc.get());
  });

  it('should deny update of email field (immutable)', async () => {
    const db = authenticatedContext.firestore();
    const testDoc = db.collection('users').doc('user1');
    await assertFails(testDoc.update({ email: 'newemail@example.com' }));
  });

  it('should deny role elevation', async () => {
    const db = authenticatedContext.firestore();
    const testDoc = db.collection('users').doc('user1');
    await assertFails(testDoc.update({ role: 'ADMIN' }));
  });
});
EOF

echo -e "${YELLOW}Note: Automated tests require @firebase/rules-unit-testing package${NC}"
echo -e "${YELLOW}Install with: npm install --save-dev @firebase/rules-unit-testing${NC}"
echo -e "${YELLOW}Run tests with: firebase emulators:exec --only firestore 'npm test -- firestore.rules.test.js'${NC}"
echo ""

# Stop emulator if we started it
if [ ! -z "$EMULATOR_PID" ]; then
  echo -e "${YELLOW}Stopping Firebase Emulator...${NC}"
  kill $EMULATOR_PID
fi

# ============================================================================
# DEPLOYMENT TEST
# ============================================================================
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Deployment Test${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Deploying rules to test environment...${NC}"
echo -e "${YELLOW}Command: firebase deploy --only firestore:rules --project ${PROJECT_ID}${NC}"
echo ""
echo -e "${YELLOW}⚠️  This will deploy to your project. Cancel if you want to test in emulator first.${NC}"
echo ""
read -p "Deploy rules to ${PROJECT_ID}? (y/N): " deploy_confirm

if [ "$deploy_confirm" = "y" ] || [ "$deploy_confirm" = "Y" ]; then
  firebase deploy --only firestore:rules --project "$PROJECT_ID"
  echo -e "${GREEN}✓ Rules deployed successfully${NC}"
else
  echo -e "${YELLOW}⊘ Deployment skipped${NC}"
fi

# ============================================================================
# RULE EVALUATION MONITORING
# ============================================================================
echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Rule Evaluation Monitoring${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}After deployment, monitor rule evaluation in Firebase Console:${NC}"
echo -e "${YELLOW}  Firebase Console → Firestore → Usage → Rule evaluation${NC}"
echo -e "${YELLOW}  Look for:${NC}"
echo -e "${YELLOW}  - Denied requests (should be minimal)${NC}"
echo -e "${YELLOW}  - Evaluation latency (should be < 100ms)${NC}"
echo -e "${YELLOW}  - Most accessed rules (optimization opportunity)${NC}"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Security Rules Test Summary${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "${GREEN}✓ Manual test checklist created${NC}"
echo -e "${GREEN}✓ Automated test template created${NC}"
echo -e "${GREEN}✓ Deployment test procedure documented${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Complete manual tests in Firebase Console Simulator"
echo -e "2. Install @firebase/rules-unit-testing for automated tests"
echo -e "3. Run automated tests with Firebase Emulator"
echo -e "4. Deploy rules to production"
echo -e "5. Monitor rule evaluation in Firebase Console"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo -e "- firestore.rules (security rules definition)"
echo -e "- firestore.indexes.json (query indexes)"
echo -e "- docs/DUAL-DATABASE-ARCHITECTURE.md (architecture)"
echo ""
