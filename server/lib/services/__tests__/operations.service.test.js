 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OperationsService, OperationsError } from '../operations.service';
import { prisma } from '../../database';
import { aiGateway } from '../ai-gateway.service';


/**
 * Feex AI Operations service tests (Mission 001 acceptance criteria).
 *
 * Prisma is backed by `prismock` (see server/test/prisma-mock.ts) and reset
 * before every test, so these exercise the real service logic — idempotency
 * index, tenant scoping, state machine — rather than a hand-written stub.
 *
 * Acceptance criteria coverage map (docs/AI-CORE-MISSION-001.md §5):
 *   1. valid enquiry → persisted, classified, PENDING_APPROVAL
 *   2. same idempotencyKey → same record, no duplicate
 *   3. missing/invalid fields → validation error (schema-level, see validation suite)
 *   4. no AI credentials → deterministic classification + templated draft
 *   5. invalid model output → deterministic fallback
 *   6. approve/reject by owner → status change + event, no external call
 *   7. cross-tenant access → 404
 *   8. failure paths → status FAILED + error event
 *   9. UI shows status/category/priority/draft/provider (client suite)
 */

const service = new OperationsService();

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';
const ACTOR = 'actor-1';

let keyCounter = 0;

/**
 * The developer environment may export a real GEMINI_API_KEY / OPENAI_API_KEY.
 * Tests must never reach the network, so every test runs against an explicit
 * "no credential" gateway (returns null → deterministic path) unless it
 * overrides the spy itself. This pins the baseline behaviour deterministically.
 */
let gatewaySpy;

beforeEach(() => {
  gatewaySpy = vi.spyOn(aiGateway, 'generateObject').mockResolvedValue(null);
});

afterEach(() => {
  gatewaySpy.mockRestore();
});

function baseInput(
  overrides = {}
) {
  keyCounter += 1;
  return {
    contactName: 'Ada Lovelace',
    contactEmail: 'ada@example.com',
    subject: 'Pricing question',
    message: 'What does the enterprise plan cost for a team of 40?',
    idempotencyKey: `idem-${keyCounter}`,
    ...overrides,
  };
}

describe('OperationsService.createEnquiry', () => {
  it('persists and classifies a valid enquiry into PENDING_APPROVAL (AC-1)', async () => {
    const { enquiry, created } = await service.createEnquiry(TENANT_A, baseInput());

    expect(created).toBe(true);
    expect(enquiry.status).toBe('PENDING_APPROVAL');
    expect(enquiry.tenantId).toBe(TENANT_A);
    expect(enquiry.category).toBeTruthy();
    expect(enquiry.priority).toBeTruthy();
    expect(enquiry.draftResponse).toBeTruthy();

    // The record is retrievable through the tenant-scoped read path.
    const fetched = await service.getEnquiry(TENANT_A, enquiry.id);
    expect(fetched.id).toBe(enquiry.id);
  });

  it('records a receive event and a classify event (AC-6/AC-8 auditability)', async () => {
    const { enquiry } = await service.createEnquiry(TENANT_A, baseInput());

    const events = await prisma.operationsEnquiryEvent.findMany({
      where: { enquiryId: enquiry.id },
      orderBy: { createdAt: 'asc' },
    });

    const types = events.map((e) => e.type);
    expect(types).toContain('enquiry.received');
    expect(types).toContain('enquiry.classified');

    const classified = events.find((e) => e.type === 'enquiry.classified');
    expect(_optionalChain([classified, 'optionalAccess', _ => _.fromStatus])).toBe('RECEIVED');
    expect(_optionalChain([classified, 'optionalAccess', _2 => _2.toStatus])).toBe('PENDING_APPROVAL');
  });

  it('replays the same record for a duplicate idempotencyKey (AC-2)', async () => {
    const input = baseInput({ idempotencyKey: 'fixed-key' });

    const first = await service.createEnquiry(TENANT_A, input);
    const second = await service.createEnquiry(TENANT_A, input);

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.enquiry.id).toBe(first.enquiry.id);

    const all = await prisma.operationsEnquiry.findMany({ where: { tenantId: TENANT_A } });
    expect(all).toHaveLength(1);
  });

  it('scopes idempotency per tenant — the same key is independent across tenants (AC-2/AC-7)', async () => {
    const input = baseInput({ idempotencyKey: 'shared-key' });

    const a = await service.createEnquiry(TENANT_A, input);
    const b = await service.createEnquiry(TENANT_B, input);

    expect(a.created).toBe(true);
    expect(b.created).toBe(true);
    expect(a.enquiry.id).not.toBe(b.enquiry.id);
  });

  it('falls back deterministically when no AI credential is configured (AC-4)', async () => {
    // No GEMINI_API_KEY / OPENAI_API_KEY in the test env → gateway returns null.
    const { enquiry } = await service.createEnquiry(TENANT_A, baseInput());

    expect(enquiry.aiProvider).toBe('deterministic');
    expect(enquiry.aiModel).toBeNull();
    expect(enquiry.confidence).toBeGreaterThanOrEqual(0);
    // A deterministic draft is always produced, never left empty.
    expect(enquiry.draftResponse).toBeTruthy();
  });

  it('falls back deterministically when the model output is unusable (AC-5)', async () => {
    // Simulate a provider that answers with an unparseable object.
    gatewaySpy.mockResolvedValue({
      object: { nonsense: true },
      provider: 'gemini',
      model: 'test-model',
    } );

    const { enquiry } = await service.createEnquiry(TENANT_A, baseInput());

    // Invalid output must NOT be persisted as a model interpretation.
    expect(enquiry.aiProvider).toBe('deterministic');
    expect(enquiry.status).toBe('PENDING_APPROVAL');
    expect(enquiry.draftResponse).toBeTruthy();
    expect(enquiry.error).toMatch(/invalid classification/i);
  });

  it('survives a gateway exception and still reaches PENDING_APPROVAL (AC-5)', async () => {
    gatewaySpy.mockRejectedValue(new Error('provider exploded'));

    const { enquiry } = await service.createEnquiry(TENANT_A, baseInput());

    expect(enquiry.aiProvider).toBe('deterministic');
    expect(enquiry.status).toBe('PENDING_APPROVAL');
    expect(enquiry.error).toContain('provider exploded');
  });

  it('uses model output when it is valid (AC-5 positive path)', async () => {
    gatewaySpy.mockResolvedValue({
      object: {
        category: 'billing',
        priority: 'HIGH',
        confidence: 0.91,
        summary: 'Customer asks about enterprise pricing.',
        draftResponse: 'Thanks Ada — our enterprise tier starts at X.',
      },
      provider: 'gemini',
      model: 'gemini-test',
    } );

    const { enquiry } = await service.createEnquiry(TENANT_A, baseInput());

    expect(enquiry.aiProvider).toBe('gemini');
    expect(enquiry.aiModel).toBe('gemini-test');
    expect(enquiry.category).toBe('billing');
    expect(enquiry.priority).toBe('HIGH');
    expect(enquiry.confidence).toBeCloseTo(0.91);
    expect(enquiry.error).toBeNull();
  });
});

describe('OperationsService.listEnquiries', () => {
  it('returns only the tenant’s enquiries, newest first (AC-7)', async () => {
    await service.createEnquiry(TENANT_A, baseInput());
    await service.createEnquiry(TENANT_A, baseInput());
    await service.createEnquiry(TENANT_B, baseInput());

    const { enquiries, total } = await service.listEnquiries(TENANT_A);

    expect(total).toBe(2);
    expect(enquiries).toHaveLength(2);
    expect(enquiries.every((e) => e.tenantId === TENANT_A)).toBe(true);
  });

  it('filters by status', async () => {
    const { enquiry } = await service.createEnquiry(TENANT_A, baseInput());
    await service.approveEnquiry(TENANT_A, enquiry.id, ACTOR);

    const pending = await service.listEnquiries(TENANT_A, { status: 'PENDING_APPROVAL' });
    const approved = await service.listEnquiries(TENANT_A, { status: 'APPROVED' });

    expect(pending.total).toBe(0);
    expect(approved.total).toBe(1);
  });

  it('clamps the limit between 1 and 100', async () => {
    await service.createEnquiry(TENANT_A, baseInput());

    const zero = await service.listEnquiries(TENANT_A, { limit: 0 });
    expect(zero.enquiries).toHaveLength(1);

    const huge = await service.listEnquiries(TENANT_A, { limit: 10000 });
    expect(huge.enquiries).toHaveLength(1);
  });
});

describe('OperationsService.getEnquiry — tenant isolation', () => {
  it('hides another tenant’s enquiry behind a 404 (AC-7)', async () => {
    const { enquiry } = await service.createEnquiry(TENANT_A, baseInput());

    await expect(service.getEnquiry(TENANT_B, enquiry.id)).rejects.toMatchObject({
      code: 'ENQUIRY_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('throws 404 for an unknown id', async () => {
    await expect(service.getEnquiry(TENANT_A, 'does-not-exist')).rejects.toBeInstanceOf(
      OperationsError
    );
  });
});

describe('OperationsService — human approval gate', () => {
  it('approves a PENDING_APPROVAL enquiry and records the decision (AC-6)', async () => {
    const { enquiry } = await service.createEnquiry(TENANT_A, baseInput());

    const approved = await service.approveEnquiry(TENANT_A, enquiry.id, ACTOR, 'looks good');

    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedBy).toBe(ACTOR);
    expect(approved.approvedAt).toBeTruthy();

    const events = await prisma.operationsEnquiryEvent.findMany({
      where: { enquiryId: enquiry.id, type: 'enquiry.approved' },
    });
    expect(events).toHaveLength(1);

    const detail = events[0].detail ;
    expect(detail.externalActionPerformed).toBe(false);
  });

  it('rejects a PENDING_APPROVAL enquiry', async () => {
    const { enquiry } = await service.createEnquiry(TENANT_A, baseInput());

    const rejected = await service.rejectEnquiry(TENANT_A, enquiry.id, ACTOR, 'not a fit');

    expect(rejected.status).toBe('REJECTED');
    expect(rejected.approvedBy).toBe(ACTOR);
  });

  it('refuses to re-review an already-approved enquiry with 409 (AC-6)', async () => {
    const { enquiry } = await service.createEnquiry(TENANT_A, baseInput());
    await service.approveEnquiry(TENANT_A, enquiry.id, ACTOR);

    await expect(service.approveEnquiry(TENANT_A, enquiry.id, ACTOR)).rejects.toMatchObject({
      code: 'ENQUIRY_NOT_REVIEWABLE',
      statusCode: 409,
    });
  });

  it('refuses cross-tenant approval with 404, not 403 (AC-7)', async () => {
    const { enquiry } = await service.createEnquiry(TENANT_A, baseInput());

    await expect(service.approveEnquiry(TENANT_B, enquiry.id, 'intruder')).rejects.toMatchObject({
      code: 'ENQUIRY_NOT_FOUND',
      statusCode: 404,
    });

    // The record is unchanged by the failed attempt.
    const still = await service.getEnquiry(TENANT_A, enquiry.id);
    expect(still.status).toBe('PENDING_APPROVAL');
  });
});

describe('OperationsService — failure path (AC-8)', () => {
  let updateSpy;

  afterEach(() => {
    _optionalChain([updateSpy, 'optionalAccess', _3 => _3.mockRestore, 'call', _4 => _4()]);
    updateSpy = undefined;
  });

  it('marks the enquiry FAILED and records an error event when classification cannot persist', async () => {
    // The first update (classification) fails; the second (failure marker) succeeds.
    const original = prisma.operationsEnquiry.update.bind(prisma.operationsEnquiry);
    let calls = 0;
    updateSpy = vi
      .spyOn(prisma.operationsEnquiry, 'update')
      .mockImplementation(async (...args) => {
        calls += 1;
        if (calls === 1) throw new Error('database unavailable');
        return (original )(...args);
      });

    const { enquiry } = await service.createEnquiry(TENANT_A, baseInput());

    // createEnquiry returns the FAILED record rather than throwing.
    expect(enquiry.status).toBe('FAILED');
    expect(enquiry.error).toContain('database unavailable');

    const failedEvents = await prisma.operationsEnquiryEvent.findMany({
      where: { enquiryId: enquiry.id, type: 'enquiry.failed' },
    });
    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0].toStatus).toBe('FAILED');
  });
});

describe('OperationsService — no external side effects', () => {
  beforeEach(() => {
    // Guard: the approval path must never reach a network fetch.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network access in approval path')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('approval performs no outbound network call (AC-6)', async () => {
    const { enquiry } = await service.createEnquiry(TENANT_A, baseInput());

    // Classification may legitimately attempt the gateway; approval must not.
    const fetchMock = globalThis.fetch ;
    fetchMock.mockClear();

    await service.approveEnquiry(TENANT_A, enquiry.id, ACTOR, 'approved');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
