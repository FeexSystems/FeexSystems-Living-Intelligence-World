/** @vitest-environment node */
import request from 'supertest';
import { createServer } from '../../index';
import { PrismaClient, } from '@prisma/client';

const app = createServer();
const prisma = new PrismaClient();

// Mock admin middleware
vi.mock('../../lib/middleware/admin.middleware', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    adminAuthMiddleware: (req, res, next) => next(),
    protectAdminRoute: () => [(req, res, next) => {
      req.adminContext = { permissions: [], role: 'SUPER_ADMIN' };
      next();
    }],
    adminRateLimit: () => (req, res, next) => next()
  };
});

// Mock authentication middleware
vi.mock('../../lib/middleware/auth.middleware', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    authMiddleware: (req, res, next) => {
      req.user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN'
      };
      next();
    },
    requireAdmin: (req, res, next) => next()
  };
});

// Mock admin service
vi.mock('../../lib/services/admin.service', () => {
  const AdminService = vi.fn();
  AdminService.prototype.getDashboardMetrics = vi.fn().mockResolvedValue({
    systemHealth: {
      status: 'healthy',
      database: 'healthy',
      redis: 'healthy',
      uptime: 99.9,
      memoryUsage: {},
      cpuUsage: {}
    },
    userMetrics: {
      totalUsers: 100,
      activeUsers: 80,
      newUsersToday: 5,
      newUsersThisWeek: 15,
      usersByRole: { ADMIN: 1, USER: 99 }
    },
    subscriptionMetrics: {
      totalSubscriptions: 50,
      activeSubscriptions: 45,
      revenue: { monthly: 1000, yearly: 12000, currency: 'USD' },
      planDistribution: []
    },
    usageMetrics: {
      aiRequests: 5000,
      deployments: 10,
      securityScans: 20,
      storage: 1000,
      bandwidth: 500
    },
    securityMetrics: {
      totalScans: 100,
      criticalVulnerabilities: 0,
      highVulnerabilities: 0,
      scanSuccessRate: 99.9
    }
  });
  AdminService.prototype.getUserAnalytics = vi.fn().mockResolvedValue({
    users: [],
    total: 0,
    analytics: { registrationTrends: [], roleDistribution: {} }
  });
  AdminService.prototype.updateUserRole = vi.fn().mockResolvedValue({
    success: true,
    user: { id: 'user-id', email: 'user@example.com', role: 'USER' }
  });
  AdminService.prototype.getSecurityReport = vi.fn().mockResolvedValue({
    overview: { totalScans: 100, completedScans: 95, failedScans: 5, successRate: 95 },
    vulnerabilities: { critical: 2, high: 8, medium: 15, low: 25, info: 10 },
    trends: [],
    recentScans: []
  });
  AdminService.prototype.getAdminAuditLogs = vi.fn().mockResolvedValue({
    logs: [],
    total: 0
  });
  
  return { AdminService };
});

describe('Admin API', () => {
  beforeAll(async () => {
    // Setup test database if needed
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/admin/metrics', () => {
    it('should return dashboard metrics for admin user', async () => {
      const response = await request(app)
        .get('/api/admin/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metrics).toBeDefined();
      expect(response.body.metrics.systemHealth).toBeDefined();
      expect(response.body.metrics.userMetrics).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/admin/users', () => {
    it('should return user analytics', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(response.body.analytics).toBeDefined();
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/admin/users?page=0')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/admin/users/:id/role', () => {
    it('should validate role update request', async () => {
      const response = await request(app)
        .put('/api/admin/users/user-id/role')
        .send({ role: 'INVALID_ROLE' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should update user role successfully', async () => {
      const response = await request(app)
        .put('/api/admin/users/user-id/role')
        .send({ role: 'USER' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });
  });

  describe('GET /api/admin/security', () => {
    it('should return security analytics', async () => {
      const response = await request(app)
        .get('/api/admin/security')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.overview).toBeDefined();
      expect(response.body.report.vulnerabilities).toBeDefined();
    });
  });

  describe('GET /api/admin/audit-logs', () => {
    it('should return audit logs', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.logs).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs?limit=200')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/admin/permissions', () => {
    it('should return admin permissions', async () => {
      const response = await request(app)
        .get('/api/admin/permissions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.permissions).toBeDefined();
      expect(response.body.role).toBeDefined();
    });
  });

  describe('GET /api/admin/system/health', () => {
    it('should return system health status', async () => {
      const response = await request(app)
        .get('/api/admin/system/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.systemHealth).toBeDefined();
      expect(response.body.systemHealth.status).toBeDefined();
    });
  });
});