// @vitest-environment node
/**
 * Full-spectrum integration tests.
 *
 * Exercises the Priority-2 cross-product services against the in-memory Prisma
 * client: confidence validation, idempotency, tenancy overlap, claim proofing
 * and audit logging. These are the guards that keep a grounded World Model from
 * silently producing unsupported claims, double-writing on retry, or
 * double-booking a unit.
 *
 * The database here is a real (in-memory) Prisma client rather than a stubbed
 * spy object, so these assertions cover the actual query predicates the
 * services emit — including the overlap range conditions.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { prisma } from '../../lib/database';
import { prismaMock } from '../prisma-mock';

// Bind `../../lib/database` to the SAME in-memory client the tests seed. The
// module-level `vi.mock` in the setup file is not applied to this file's
// imports, and a factory that re-imports `../prisma-mock` would construct a
// second, empty client — so rows seeded here would be invisible to the
// services under test. `importOriginal` reuses the one instance.
vi.mock('../../lib/database', async () => {
  const { prismaMock: shared } = await import('../prisma-mock');
  return { prisma: shared, db: shared, default: shared };
});
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
const TEST_PROJECT_ID = 'test-project-001';

beforeEach(() => {
  (prismaMock as unknown as { reset: () => void }).reset();
});

/** Minimal Express-shaped doubles for the middleware contract. */
function makeRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

/**
 * Seed a unit and return its id. Tenancy rows carry foreign keys to both a
 * property and a unit, so the fixture has to build the whole chain.
 */
async function seedUnit(suffix: string): Promise<string> {
  const property = await prisma.property.create({
    data: {
      id: `property-${suffix}`,
      teamId: TEST_TENANT_ID,
      ownerId: TEST_USER_ID,
      name: `Property ${suffix}`,
      address: '1 Test Street',
    },
  });
  const unit = await prisma.propertyUnit.create({
    data: { id: `unit-${suffix}`, propertyId: property.id, unitNumber: suffix },
  });
  return unit.id;
}

async function seedTenancy(unitId: string, start: string, end: string, status: 'ACTIVE' | 'PENDING' | 'TERMINATED' = 'ACTIVE') {
  return prisma.tenancy.create({
    data: {
      propertyId: `property-${unitId.replace('unit-', '')}`,
      unitId,
      tenantUserId: TEST_USER_ID,
      startDate: new Date(start),
      endDate: new Date(end),
      status,
    },
  });
}

describe('confidence validation', () => {
  it('accepts a score inside [0, 1] and rejects values outside it', () => {
    expect(validateConfidenceScore(0.82).valid).toBe(true);
    expect(validateConfidenceScore(0).valid).toBe(true);
    expect(validateConfidenceScore(1).valid).toBe(true);

    const tooHigh = validateConfidenceScore(1.4);
    expect(tooHigh.valid).toBe(false);
    expect(tooHigh.error).toContain('between 0 and 1');

    expect(validateConfidenceScore(-0.1).valid).toBe(false);
    expect(validateConfidenceScore('not-a-number').valid).toBe(false);
  });

  it('treats an absent score as valid, because the field is optional', () => {
    expect(validateConfidenceScore(undefined).valid).toBe(true);
    expect(validateConfidenceScore(null).valid).toBe(true);
  });

  it('middleware passes a valid body through to the next handler', () => {
    const next = () => { calls += 1; };
    let calls = 0;
    const res = makeRes();

    validateConfidenceScores()({ body: { confidence: 0.6 } } as never, res as never, next);

    expect(calls).toBe(1);
    expect(res.statusCode).toBe(200);
  });

  it('middleware rejects an out-of-range score with a 400 validation error', () => {
    let calls = 0;
    const next = () => { calls += 1; };
    const res = makeRes();

    validateConfidenceScores()({ body: { confidence: 7 } } as never, res as never, next);

    expect(calls).toBe(0);
    expect(res.statusCode).toBe(400);
    const body = res.body as {
      success: boolean;
      error: { code: string; details: unknown[] };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CONFIDENCE_SCORE_INVALID');
    expect(body.error.details).toHaveLength(1);
  });
});

describe('idempotency', () => {
  // The cache is not reachable in this environment, so both calls must follow
  // the documented fail-open path: a cache outage never blocks a write.
  it('fails open when the cache cannot be reached', async () => {
    const result = await validateIdempotencyKey({
      resourceType: 'OperationsEnquiry',
      tenantId: TEST_TENANT_ID,
      idempotencyKey: 'key-1',
    });

    expect(result.duplicate).toBe(false);
    expect(result.shouldCreate).toBe(true);
    expect(result.existingResourceId).toBeNull();
  });

  it('records a key without throwing when the cache is unavailable', async () => {
    await expect(
      recordIdempotencyKey(
        {
          resourceType: 'OperationsEnquiry',
          tenantId: TEST_TENANT_ID,
          idempotencyKey: 'key-2',
        },
        'resource-42'
      )
    ).resolves.toBeUndefined();
  });
});

describe('tenancy overlap', () => {
  it('detects an overlap with an existing active tenancy', async () => {
    const unitId = await seedUnit('A');
    await seedTenancy(unitId, '2026-01-01', '2026-06-01');

    const overlap = await checkTenancyOverlap(
      unitId,
      new Date('2026-03-01'),
      new Date('2026-04-01')
    );

    expect(overlap.hasOverlap).toBe(true);
    expect(overlap.overlappingTenancyId).toBeTypeOf('string');
  });

  it('reports no overlap when the unit is free', async () => {
    const unitId = await seedUnit('B');

    const overlap = await checkTenancyOverlap(
      unitId,
      new Date('2026-03-01'),
      new Date('2026-04-01')
    );

    expect(overlap.hasOverlap).toBe(false);
    expect(overlap.overlappingTenancyId).toBeUndefined();
  });

  it('reports no overlap for a range that only touches the existing one', async () => {
    const unitId = await seedUnit('C');
    await seedTenancy(unitId, '2026-01-01', '2026-06-01');

    // Starts exactly when the existing tenancy ends — adjacent, not overlapping.
    const overlap = await checkTenancyOverlap(
      unitId,
      new Date('2026-06-01'),
      new Date('2026-07-01')
    );

    expect(overlap.hasOverlap).toBe(false);
  });

  it('ignores ended tenancies', async () => {
    const unitId = await seedUnit('D');
    await seedTenancy(unitId, '2026-01-01', '2026-06-01', 'TERMINATED');

    const overlap = await checkTenancyOverlap(
      unitId,
      new Date('2026-03-01'),
      new Date('2026-04-01')
    );

    expect(overlap.hasOverlap).toBe(false);
  });

  it('rejects an inverted date range before querying', async () => {
    const unitId = await seedUnit('E');

    await expect(
      validateTenancyDates(unitId, new Date('2026-05-01'), new Date('2026-04-01'))
    ).rejects.toThrow('endDate must be after startDate');
  });

  it('throws when the requested range collides with an active tenancy', async () => {
    const unitId = await seedUnit('F');
    await seedTenancy(unitId, '2026-01-01', '2026-06-01');

    await expect(
      validateTenancyDates(unitId, new Date('2026-02-01'), new Date('2026-03-01'))
    ).rejects.toThrow(/already has an active tenancy/);
  });

  it('resolves when the range is free', async () => {
    const unitId = await seedUnit('G');

    await expect(
      validateTenancyDates(unitId, new Date('2026-02-01'), new Date('2026-03-01'))
    ).resolves.toBeUndefined();
  });
});

describe('claim proofs', () => {
  async function seedEvidence(sourceUrl: string, id = 'ev-1') {
    await prisma.worldModelProject.upsert({
      where: { id: TEST_PROJECT_ID },
      update: {},
      create: {
        id: TEST_PROJECT_ID,
        repository: 'FeexSystems/test-project',
        name: 'test-project',
        owner: 'FeexSystems',
        url: 'https://github.com/FeexSystems/test-project',
      },
    });
    await prisma.worldModelEvidence.create({
      data: {
        id,
        projectId: TEST_PROJECT_ID,
        evidenceType: 'CODE',
        sourceUrl,
        sourceRef: 'README',
      },
    });
  }

  it('marks a claim supported when matching evidence exists', async () => {
    await seedEvidence('repo/authentication/middleware.ts');

    const result = await verifyClaimProofs(TEST_PROJECT_ID, [
      'authentication middleware',
    ]);

    expect(result.allClaimsSupported).toBe(true);
    expect(result.adjustedConfidence).toBe(1);
    expect(result.claimResults[0].supported).toBe(true);
    expect(result.claimResults[0].evidenceIds).toContain('ev-1');
  });

  it('leaves a claim unsupported when the ledger has no matching evidence', async () => {
    await prisma.worldModelProject.create({
      data: {
        id: TEST_PROJECT_ID,
        repository: 'FeexSystems/test-project',
        name: 'test-project',
        owner: 'FeexSystems',
        url: 'https://github.com/FeexSystems/test-project',
      },
    });

    const result = await verifyClaimProofs(TEST_PROJECT_ID, [
      'completely unverifiable claim',
    ]);

    expect(result.allClaimsSupported).toBe(false);
    expect(result.adjustedConfidence).toBe(0);
    expect(result.claimResults[0].supported).toBe(false);
  });

  it('scales confidence by the ratio of supported claims', async () => {
    await seedEvidence('repo/authentication/service.ts');

    const result = await verifyClaimProofs(TEST_PROJECT_ID, [
      'authentication service implementation',
      'zzz qqq xxxx',
    ]);

    expect(result.allClaimsSupported).toBe(false);
    expect(result.adjustedConfidence).toBe(0.5);
  });

  it('gates an interpretation on support, not on confidence alone', () => {
    expect(
      isInterpretationSupported({
        allClaimsSupported: true,
        claimResults: [],
        adjustedConfidence: 0.9,
      })
    ).toBe(true);

    expect(
      isInterpretationSupported({
        allClaimsSupported: false,
        claimResults: [],
        adjustedConfidence: 0.9,
      })
    ).toBe(false);

    expect(
      isInterpretationSupported({
        allClaimsSupported: true,
        claimResults: [],
        adjustedConfidence: 0.4,
      })
    ).toBe(false);
  });
});

describe('audit logging', () => {
  it('writes a tenant-scoped entry with actor and transition metadata', async () => {
    await writeAuditLog({
      tenantId: TEST_TENANT_ID,
      actorId: TEST_USER_ID,
      resourceType: 'OperationsEnquiry',
      resourceId: 'enquiry-1',
      action: 'approved',
      fromValue: 'PENDING',
      toValue: 'APPROVED',
    });

    const entries = await prisma.activityLog.findMany();
    expect(entries).toHaveLength(1);
    expect(entries[0].userId).toBe(TEST_USER_ID);
    expect(entries[0].action).toBe('approved');
    expect(entries[0].resource).toBe('OperationsEnquiry');
    expect(entries[0].resourceId).toBe('enquiry-1');

    const metadata = entries[0].metadata as Record<string, unknown>;
    expect(metadata.fromValue).toBe('PENDING');
    expect(metadata.toValue).toBe('APPROVED');
  });

  it('falls back to the tenant as actor when no actor is supplied', async () => {
    await writeAuditLog({
      tenantId: TEST_TENANT_ID,
      resourceType: 'OperationsEnquiry',
      resourceId: 'enquiry-1',
      action: 'updated',
    });

    const entries = await prisma.activityLog.findMany();
    expect(entries[0].userId).toBe(TEST_TENANT_ID);
  });

  it('binds the shared prisma instance to the in-memory client', () => {
    expect(prisma).toBe(prismaMock);
  });
});
