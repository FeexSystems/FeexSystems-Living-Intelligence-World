// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '../../database';
import {
  validateConfidenceScore,
  validateConfidenceScores,
} from '../../lib/middleware/confidence-validation.middleware';
import {
  validateIdempotencyKey,
  recordIdempotencyKey,
} from '../../lib/services/idempotency.service';
import {
  checkTenancyOverlap,
  validateTenancyDates,
} from '../../lib/services/tenancy-overlap.service';
import {
  verifyClaimProofs,
  isInterpretationSupported,
} from '../../lib/services/claim-proof.service';
import { writeAuditLog } from '../../lib/services/audit-log.service';

const TEST_TENANT_ID = 'test-tenant-001';
const TEST_USER_ID = 'test-user-001';

async function cleanupTestData() {
  await prisma.platformUsageEvent.deleteMany({
    where: { metadata: { contains: 'test-' } },
  });
  await prisma.advisoryRequest.deleteMany({
    where: { reportedByUserId: TEST_USER_ID },
  });
  await prisma.farmObservation.deleteMany({
    where: { reportedByUserId: TEST_USER_ID },
  });
  await prisma.knowledgeDocumentChunk.deleteMany({
    where: { document: { teamId: TEST_TENANT_ID } },
  });
  await prisma.knowledgeDocument.deleteMany({
    where: { teamId: TEST_TENANT_ID },
  });
  await prisma.maintenanceRequest.deleteMany({
    where: { reportedByUserId: TEST_USER_ID },
  });
  await prisma.tenancy.deleteMany({
    where: { property: { teamId: TEST_TENANT_ID } },
  });
  await prisma.propertyUnit.deleteMany({
    where: { property: { teamId: TEST_TENANT_ID } },
  });
  await prisma.property.deleteMany({
    where: { teamId: TEST_TENANT_ID },
  });
  await prisma.workflowStep.deleteMany({
    where: { run: { tenantId: TEST_TENANT_ID } },
  });
  await prisma.workflowRun.deleteMany({
    where: { tenantId: TEST_TENANT_ID },
  });
  await prisma.worldModelInterpretation.deleteMany({
    where: { projectId: 'test-project-001' },
  });
  await prisma.operationsEnquiryEvent.deleteMany({
    where: { enquiry: { tenantId: TEST_TENANT_ID } },
  });
  await prisma.operationsEnquiry.deleteMany({
    where: { tenantId: TEST_TENANT_ID },
  });
}