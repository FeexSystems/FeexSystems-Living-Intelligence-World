/** @vitest-environment node */
import request from 'supertest';
import { createServer } from '../../index';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const app = createServer();
const prisma = new PrismaClient();

import { vi } from 'vitest';

// Mock the security service
vi.mock('../../lib/services/security.service', () => ({
  securityService: {
    initialize: vi.fn(),
    submitScan: vi.fn(),
    getUserScans: vi.fn(),
    getScanResults: vi.fn(),
    getScanStatus: vi.fn(),
    cancelScan: vi.fn(),
    getAvailableScanners: vi.fn(),
    getScannersByScanType: vi.fn(),
    getUserStats: vi.fn(),
    searchCVEs: vi.fn(),
    getCVE: vi.fn(),
    getRecentCVEs: vi.fn(),
    testScanner: vi.fn(),
    getQueueStats: vi.fn(),
    getSystemStats: vi.fn(),
    getHealthStatus: vi.fn(),
    updateScanner: vi.fn()
  }
}));

// Mock the cron service
vi.mock('../../lib/services/security-cron.service', () => ({
  securityCronService: {
    initialize: vi.fn(),
    createRecurringScan: vi.fn(),
    stopRecurringScan: vi.fn(),
    getStatus: vi.fn()
  }
}));

describe('Security API Routes', () => {
  let authToken: string;
  let adminToken: string;
  let testUser: any;
  let adminUser: any;

  beforeAll(async () => {
    // Create test users
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        emailVerified: true
      }
    });

    adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        emailVerified: true
      }
    });

    // Generate JWT tokens
    authToken = jwt.sign(
      { userId: testUser.id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: adminUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['test@example.com', 'admin@example.com']
        }
      }
    });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/security/scan', () => {
    it('should initiate a security scan successfully', async () => {
      const { securityService } = require('../../lib/services/security.service');
      securityService.submitScan.mockResolvedValue({
        success: true,
        scanId: 'scan-123'
      });

      const scanRequest = {
        target: {
          type: 'url',
          value: 'https://example.com'
        },
        scanType: 'VULNERABILITY',
        priority: 'normal'
      };

      const response = await request(app)
        .post('/api/security/scan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scanRequest)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          scanId: 'scan-123',
          status: 'queued',
          message: 'Scan initiated successfully'
        }
      });

      expect(securityService.submitScan).toHaveBeenCalledWith({
        userId: testUser.id,
        target: scanRequest.target,
        scanType: scanRequest.scanType,
        configuration: undefined,
        scheduledAt: undefined,
        priority: scanRequest.priority
      });
    });

    it('should reject invalid scan target', async () => {
      const scanRequest = {
        target: {
          type: 'url',
          value: 'invalid-url'
        },
        scanType: 'VULNERABILITY'
      };

      const response = await request(app)
        .post('/api/security/scan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scanRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid scan target');
    });

    it('should reject scan when service returns error', async () => {
      const { securityService } = require('../../lib/services/security.service');
      securityService.submitScan.mockResolvedValue({
        success: false,
        error: 'Rate limit exceeded'
      });

      const scanRequest = {
        target: {
          type: 'url',
          value: 'https://example.com'
        },
        scanType: 'VULNERABILITY'
      };

      const response = await request(app)
        .post('/api/security/scan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scanRequest)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Rate limit exceeded'
      });
    });

    it('should require authentication', async () => {
      const scanRequest = {
        target: {
          type: 'url',
          value: 'https://example.com'
        },
        scanType: 'VULNERABILITY'
      };

      await request(app)
        .post('/api/security/scan')
        .send(scanRequest)
        .expect(401);
    });
  });

  describe('GET /api/security/scans', () => {
    it('should return user scans with pagination', async () => {
      const { securityService } = require('../../lib/services/security.service');
      const mockScans = [
        {
          id: 'scan-1',
          userId: testUser.id,
          target: { type: 'url', value: 'https://example.com' },
          scanType: 'vulnerability',
          status: 'completed',
          createdAt: new Date()
        }
      ];

      securityService.getUserScans.mockResolvedValue({
        scans: mockScans,
        total: 1
      });

      const response = await request(app)
        .get('/api/security/scans?limit=10&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          scans: mockScans,
          pagination: {
            total: 1,
            limit: 10,
            offset: 0,
            hasMore: false
          }
        }
      });

      expect(securityService.getUserScans).toHaveBeenCalledWith(testUser.id, {
        limit: 10,
        offset: 0,
        status: undefined,
        scanType: undefined
      });
    });

    it('should handle query parameters correctly', async () => {
      const { securityService } = require('../../lib/services/security.service');
      securityService.getUserScans.mockResolvedValue({
        scans: [],
        total: 0
      });

      await request(app)
        .get('/api/security/scans?limit=5&offset=10&status=COMPLETED&scanType=VULNERABILITY')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(securityService.getUserScans).toHaveBeenCalledWith(testUser.id, {
        limit: 5,
        offset: 10,
        status: 'COMPLETED',
        scanType: 'VULNERABILITY'
      });
    });
  });

  describe('GET /api/security/scan/:id/results', () => {
    it('should return scan results for authorized user', async () => {
      const { securityService } = require('../../lib/services/security.service');
      const mockScan = {
        id: 'scan-123',
        userId: testUser.id,
        results: {
          summary: { totalVulnerabilities: 2 },
          vulnerabilities: []
        },
        completedAt: new Date()
      };

      securityService.getScanResults.mockResolvedValue({
        scan: mockScan
      });

      const response = await request(app)
        .get('/api/security/scan/scan-123/results')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          scan: mockScan,
          hasResults: true,
          completedAt: mockScan.completedAt
        }
      });

      expect(securityService.getScanResults).toHaveBeenCalledWith('scan-123', testUser.id);
    });

    it('should return 404 for non-existent scan', async () => {
      const { securityService } = require('../../lib/services/security.service');
      securityService.getScanResults.mockResolvedValue({
        error: 'Scan not found'
      });

      const response = await request(app)
        .get('/api/security/scan/non-existent/results')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Scan not found'
      });
    });

    it('should return 403 for unauthorized access', async () => {
      const { securityService } = require('../../lib/services/security.service');
      securityService.getScanResults.mockResolvedValue({
        error: 'Unauthorized'
      });

      const response = await request(app)
        .get('/api/security/scan/scan-123/results')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'Unauthorized'
      });
    });
  });

  describe('DELETE /api/security/scan/:id', () => {
    it('should cancel scan successfully', async () => {
      const { securityService } = require('../../lib/services/security.service');
      securityService.cancelScan.mockResolvedValue({
        success: true
      });

      const response = await request(app)
        .delete('/api/security/scan/scan-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Scan cancelled successfully'
      });

      expect(securityService.cancelScan).toHaveBeenCalledWith('scan-123', testUser.id);
    });

    it('should handle cancellation errors', async () => {
      const { securityService } = require('../../lib/services/security.service');
      securityService.cancelScan.mockResolvedValue({
        success: false,
        error: 'Scan already completed'
      });

      const response = await request(app)
        .delete('/api/security/scan/scan-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Scan already completed'
      });
    });
  });

  describe('GET /api/security/scanners', () => {
    it('should return available scanners', async () => {
      const { securityService } = require('../../lib/services/security.service');
      const mockScanners = [
        {
          id: 'owasp-zap',
          name: 'OWASP ZAP',
          scanTypes: ['vulnerability'],
          isActive: true
        }
      ];

      securityService.getAvailableScanners.mockReturnValue(mockScanners);

      const response = await request(app)
        .get('/api/security/scanners')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          scanners: mockScanners,
          total: 1
        }
      });
    });
  });

  describe('GET /api/security/cve/search', () => {
    it('should search CVEs successfully', async () => {
      const { securityService } = require('../../lib/services/security.service');
      const mockCVEs = [
        {
          id: 'CVE-2023-0001',
          description: 'Test vulnerability',
          severity: 'high'
        }
      ];

      securityService.searchCVEs.mockResolvedValue(mockCVEs);

      const response = await request(app)
        .get('/api/security/cve/search?keyword=test&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          cves: mockCVEs,
          keyword: 'test',
          total: 1
        }
      });

      expect(securityService.searchCVEs).toHaveBeenCalledWith('test', 10);
    });

    it('should require keyword parameter', async () => {
      const response = await request(app)
        .get('/api/security/cve/search')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid search parameters');
    });
  });

  describe('POST /api/security/schedule', () => {
    it('should create recurring scan schedule successfully', async () => {
      const { securityCronService } = require('../../lib/services/security-cron.service');
      securityCronService.createRecurringScan.mockResolvedValue({
        success: true,
        scheduleId: 'schedule-123'
      });

      const scheduleRequest = {
        target: {
          type: 'url',
          value: 'https://example.com'
        },
        scanType: 'VULNERABILITY',
        cronExpression: '0 0 * * *', // Daily at midnight
        isActive: true
      };

      const response = await request(app)
        .post('/api/security/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scheduleRequest)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          scheduleId: 'schedule-123',
          message: 'Recurring scan schedule created successfully'
        }
      });

      expect(securityCronService.createRecurringScan).toHaveBeenCalledWith({
        userId: testUser.id,
        target: scheduleRequest.target,
        scanType: 'VULNERABILITY',
        cronExpression: scheduleRequest.cronExpression,
        configuration: undefined,
        isActive: scheduleRequest.isActive
      });
    });

    it('should reject invalid cron expression', async () => {
      const { securityCronService } = require('../../lib/services/security-cron.service');
      securityCronService.createRecurringScan.mockResolvedValue({
        success: false,
        error: 'Invalid cron expression'
      });

      const scheduleRequest = {
        target: {
          type: 'url',
          value: 'https://example.com'
        },
        scanType: 'VULNERABILITY',
        cronExpression: 'invalid-cron'
      };

      const response = await request(app)
        .post('/api/security/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scheduleRequest)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid cron expression'
      });
    });
  });

  describe('Admin Routes', () => {
    describe('GET /api/security/admin/queue/stats', () => {
      it('should return queue stats for admin', async () => {
        const { securityService } = require('../../lib/services/security.service');
        const mockStats = {
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 3
        };

        securityService.getQueueStats.mockResolvedValue(mockStats);

        const response = await request(app)
          .get('/api/security/admin/queue/stats')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: { stats: mockStats }
        });
      });

      it('should reject non-admin users', async () => {
        const response = await request(app)
          .get('/api/security/admin/queue/stats')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);

        expect(response.body).toEqual({
          success: false,
          error: 'Admin access required'
        });
      });
    });

    describe('GET /api/security/admin/system/stats', () => {
      it('should return system stats for admin', async () => {
        const { securityService } = require('../../lib/services/security.service');
        const mockStats = {
          scanStats: { total: 150 },
          queueStats: { waiting: 5 },
          cveStats: { total: 50000 },
          scannerStats: { active: 4 }
        };

        securityService.getSystemStats.mockResolvedValue(mockStats);

        const response = await request(app)
          .get('/api/security/admin/system/stats')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: { stats: mockStats }
        });
      });
    });

    describe('PUT /api/security/admin/scanner/:id', () => {
      it('should update scanner configuration for admin', async () => {
        const { securityService } = require('../../lib/services/security.service');
        securityService.updateScanner.mockResolvedValue({
          success: true
        });

        const updates = {
          isActive: false,
          timeout: 300
        };

        const response = await request(app)
          .put('/api/security/admin/scanner/owasp-zap')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updates)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Scanner updated successfully'
        });

        expect(securityService.updateScanner).toHaveBeenCalledWith('owasp-zap', updates);
      });

      it('should reject non-admin users', async () => {
        const response = await request(app)
          .put('/api/security/admin/scanner/owasp-zap')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isActive: false })
          .expect(403);

        expect(response.body).toEqual({
          success: false,
          error: 'Admin access required'
        });
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to scan endpoint', async () => {
      const { securityService } = require('../../lib/services/security.service');
      securityService.submitScan.mockResolvedValue({
        success: true,
        scanId: 'scan-123'
      });

      const scanRequest = {
        target: {
          type: 'url',
          value: 'https://example.com'
        },
        scanType: 'VULNERABILITY'
      };

      // Make multiple requests quickly
      const requests = Array(12).fill(null).map(() =>
        request(app)
          .post('/api/security/scan')
          .set('Authorization', `Bearer ${authToken}`)
          .send(scanRequest)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});