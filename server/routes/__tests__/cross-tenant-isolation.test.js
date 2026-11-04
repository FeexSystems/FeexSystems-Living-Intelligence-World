 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import request from 'supertest';
import { createServer } from '../../index';
import { prismaMock } from '../../test/prisma-mock';

/**
 * Route-level cross-tenant isolation tests (audit finding R5 / D-4 residual).
 *
 * Missions 001/004/005 scope by `req.user.id`. These tests drive the real
 * Express routers and assert that a second authenticated tenant cannot read,
 * mutate, or enumerate another tenant's records — and that the failure is
 * indistinguishable from "not found" (404), never 403-with-existence-leak.
 *
 * Identity is injected through a mutable holder so each request can act as a
 * different user, which the older single-user mocks could not express.
 */

const state = { userId: 'tenant-a' };

vi.mock('../../lib/middleware/auth.middleware', () => ({
  authMiddleware: (req, _res, next) => {
    req.user = { id: state.userId, email: `${state.userId}@example.com`, role: 'USER' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
  optionalAuthenticate: (_req, _res, next) => next(),
  requireAuth: (_req, _res, next) => next(),
  rateLimit: () => (_req, _res, next) => next(),
  rateLimitConfigs: { general: {}, auth: {}, passwordReset: {}, aiServices: {} },
  validateRequest: () => (_req, _res, next) => next(),
  validateQuery: () => (_req, _res, next) => next(),
}));

vi.mock('../../lib/middleware/rate-limit.middleware', () => ({
  rateLimitMiddleware: () => (_req, _res, next) => next(),
  incrementUsageAfterSuccess: () => (_req, _res, next) => next(),
  checkStorageLimit: () => (_req, _res, next) => next(),
  incrementStorageAfterUpload: () => (_req, _res, next) => next(),
  trackBandwidthUsage: () => (_req, _res, next) => next(),
}));

const app = createServer();
const prisma = prismaMock;

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';

const as = (userId) => {
  state.userId = userId;
};

beforeEach(() => {
  as(TENANT_A);
});

describe('RentAll (/api/rental) cross-tenant isolation', () => {
  async function seedProperty(tenantId, name) {
    return prisma.property.create({
      data: { teamId: tenantId, name, address: '1 Test St', ownerId: 'owner-ref' } ,
    });
  }

  it('does not list another tenant’s properties', async () => {
    await seedProperty(TENANT_A, 'A House');
    await seedProperty(TENANT_B, 'B House');

    as(TENANT_A);
    const res = await request(app).get('/api/rental/properties').expect(200);

    const names = (res.body.data.properties ).map((p) => p.name);
    expect(names).toContain('A House');
    expect(names).not.toContain('B House');
  });

  it('returns 404 (not 403) when a tenant requests another tenant’s maintenance request', async () => {
    const property = await seedProperty(TENANT_B, 'B House');
    const created = await prisma.maintenanceRequest.create({
      data: {
        propertyId: property.id,
        reportedByUserId: TENANT_B,
        title: 'Leak',
        description: 'Roof leak',
        category: 'PLUMBING',
        priority: 'HIGH',
        status: 'OPEN',
      } ,
    });

    as(TENANT_A);
    const res = await request(app).get(`/api/rental/maintenance-requests/${created.id}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('cannot create a unit under another tenant’s property', async () => {
    const property = await seedProperty(TENANT_B, 'B House');

    as(TENANT_A);
    const res = await request(app)
      .post(`/api/rental/properties/${property.id}/units`)
      .send({ unitNumber: '1A' });

    expect(res.status).toBe(404);
  });

  it('cannot transition another tenant’s maintenance request status', async () => {
    const property = await seedProperty(TENANT_B, 'B House');
    const created = await prisma.maintenanceRequest.create({
      data: {
        propertyId: property.id,
        reportedByUserId: TENANT_B,
        title: 'Leak',
        description: 'Roof leak',
        category: 'PLUMBING',
        priority: 'HIGH',
        status: 'OPEN',
      } ,
    });

    as(TENANT_A);
    const res = await request(app)
      .patch(`/api/rental/maintenance-requests/${created.id}/status`)
      .send({ status: 'RESOLVED' });

    expect(res.status).toBe(404);

    // The record must be untouched by the failed attempt.
    const after = await prisma.maintenanceRequest.findUnique({ where: { id: created.id } });
    expect(_optionalChain([after, 'optionalAccess', _ => _.status])).toBe('OPEN');
  });
});

describe('FarmPlug (/api/farm) cross-tenant isolation', () => {
  async function seedFarm(teamId, name) {
    return prisma.farm.create({ data: { teamId, name }  });
  }

  it('does not list another tenant’s farms', async () => {
    await seedFarm(TENANT_A, 'A Farm');
    await seedFarm(TENANT_B, 'B Farm');

    as(TENANT_A);
    const res = await request(app).get('/api/farm/farms').expect(200);

    const names = (res.body.data.farms ).map((f) => f.name);
    expect(names).toContain('A Farm');
    expect(names).not.toContain('B Farm');
  });

  it('returns 404 for another tenant’s farm', async () => {
    const farm = await seedFarm(TENANT_B, 'B Farm');

    as(TENANT_A);
    await request(app).get(`/api/farm/farms/${farm.id}`).expect(404);
  });

  it('cannot add a plot to another tenant’s farm', async () => {
    const farm = await seedFarm(TENANT_B, 'B Farm');

    as(TENANT_A);
    const res = await request(app).post(`/api/farm/farms/${farm.id}/plots`).send({ name: 'Plot 1' });

    expect(res.status).toBe(404);
    const plots = await prisma.cropPlot.findMany({ where: { farmId: farm.id } });
    expect(plots).toHaveLength(0);
  });

  it('cannot add an observation to another tenant’s plot', async () => {
    const farm = await seedFarm(TENANT_B, 'B Farm');
    const plot = await prisma.cropPlot.create({ data: { farmId: farm.id, name: 'Plot A' }  });

    as(TENANT_A);
    const res = await request(app)
      .post(`/api/farm/plots/${plot.id}/observations`)
      .send({ observationType: 'PEST', description: 'Aphids observed on the lower leaves', severity: 'MEDIUM' });

    expect(res.status).toBe(404);
  });

  it('does not list another tenant’s advisory requests', async () => {
    const farm = await seedFarm(TENANT_B, 'B Farm');
    const plot = await prisma.cropPlot.create({ data: { farmId: farm.id, name: 'Plot A' }  });
    await prisma.advisoryRequest.create({
      data: {
        plotId: plot.id,
        reportedByUserId: TENANT_B,
        question: 'Should I irrigate?',
        status: 'PENDING',
      } ,
    });

    as(TENANT_A);
    const res = await request(app).get('/api/farm/advisory-requests').expect(200);

    expect(res.body.data.requests).toHaveLength(0);
  });
});

describe('Knowledge (/api/knowledge) cross-tenant isolation', () => {
  async function seedDocument(teamId, filename) {
    return prisma.knowledgeDocument.create({
      data: {
        teamId,
        filename,
        mimeType: 'text/plain',
        sizeBytes: 10,
        contentHash: `hash-${teamId}-${filename}`,
        status: 'READY',
      } ,
    });
  }

  it('does not list another tenant’s documents', async () => {
    await seedDocument(TENANT_A, 'a.txt');
    await seedDocument(TENANT_B, 'b.txt');

    as(TENANT_A);
    const res = await request(app).get('/api/knowledge/documents').expect(200);

    const names = (res.body.data.documents ).map((d) => d.filename);
    expect(names).toContain('a.txt');
    expect(names).not.toContain('b.txt');
  });

  it('returns 404 for another tenant’s document by id', async () => {
    const doc = await seedDocument(TENANT_B, 'secret.txt');

    as(TENANT_A);
    await request(app).get(`/api/knowledge/documents/${doc.id}`).expect(404);
  });
});

describe('Operations (/api/operations) cross-tenant isolation', () => {
  async function seedEnquiry(tenantId, key) {
    return prisma.operationsEnquiry.create({
      data: {
        tenantId,
        idempotencyKey: key,
        contactName: 'Ada',
        contactEmail: 'ada@example.com',
        subject: 'Hello',
        message: 'Question',
        status: 'PENDING_APPROVAL',
      } ,
    });
  }

  it('does not list another tenant’s enquiries', async () => {
    const a = await seedEnquiry(TENANT_A, 'k-a');
    const b = await seedEnquiry(TENANT_B, 'k-b');

    as(TENANT_A);
    const res = await request(app).get('/api/operations/enquiries').expect(200);

    const ids = (res.body.data.enquiries ).map((e) => e.id);
    expect(ids).toContain(a.id);
    expect(ids).not.toContain(b.id);
  });

  it('returns 404 for another tenant’s enquiry', async () => {
    const enquiry = await seedEnquiry(TENANT_B, 'k-b');
    as(TENANT_A);
    await request(app).get(`/api/operations/enquiries/${enquiry.id}`).expect(404);
  });

  it('cannot approve another tenant’s enquiry, and leaves it unchanged', async () => {
    const enquiry = await seedEnquiry(TENANT_B, 'k-b');

    as(TENANT_A);
    const res = await request(app)
      .post(`/api/operations/enquiries/${enquiry.id}/approve`)
      .send({ note: 'hijack' });

    expect(res.status).toBe(404);

    const after = await prisma.operationsEnquiry.findUnique({ where: { id: enquiry.id } });
    expect(_optionalChain([after, 'optionalAccess', _2 => _2.status])).toBe('PENDING_APPROVAL');
    expect(_optionalChain([after, 'optionalAccess', _3 => _3.approvedBy])).toBeNull();
  });
});
