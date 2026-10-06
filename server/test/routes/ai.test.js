/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../../index';
import { setupTestDatabase, cleanupTestDatabase, createTestUser, createTestSession } from '../helpers/database';
import { aiService } from '../../lib/services/ai.service';

// Mock AI service
vi.mock('../../lib/services/ai.service');

describe('AI Routes', () => {
  let app;
  let testUser;
  let authToken;

  beforeEach(async () => {
    app = createServer();
    await setupTestDatabase();
    
    // Create test user and session
    testUser = await createTestUser({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    });
    
    const session = await createTestSession(testUser.id);
    authToken = session.token;

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
    vi.restoreAllMocks();
  });

  describe('GET /api/ai/services', () => {
    it('should return available AI services', async () => {
      const mockServices = [
        {
          id: 'chat-gpt-3.5',
          name: 'ChatGPT 3.5',
          description: 'Fast conversational AI',
          category: 'chat',
          pricing: { type: 'per_token', cost: 0.002, currency: 'usd' },
          limits: { maxRequestsPerHour: 100, maxRequestsPerDay: 1000 },
          isActive: true,
          provider: 'openai'
        }
      ];

      vi.mocked(aiService.getAvailableServices).mockReturnValue(mockServices);

      const response = await request(app)
        .get('/api/ai/services')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.services).toEqual(mockServices);
      expect(response.body.data.total).toBe(1);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/ai/services')
        .expect(401);
    });
  });

  describe('GET /api/ai/services/:category', () => {
    it('should return services by category', async () => {
      const mockServices = [
        {
          id: 'chat-gpt-3.5',
          name: 'ChatGPT 3.5',
          category: 'chat'
        }
      ];

      vi.mocked(aiService.getServicesByCategory).mockReturnValue(mockServices );

      const response = await request(app)
        .get('/api/ai/services/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.services).toEqual(mockServices);
      expect(response.body.data.category).toBe('chat');
    });

    it('should reject invalid category', async () => {
      const response = await request(app)
        .get('/api/ai/services/invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid category');
    });
  });

  describe('POST /api/ai/request', () => {
    it('should submit AI request successfully', async () => {
      vi.mocked(aiService.submitRequest).mockResolvedValue({
        success: true,
        requestId: 'req-123'
      });

      const requestData = {
        serviceId: 'chat-gpt-3.5',
        input: 'Hello world',
        parameters: { temperature: 0.7 },
        priority: 'normal'
      };

      const response = await request(app)
        .post('/api/ai/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.requestId).toBe('req-123');
      expect(response.body.data.status).toBe('pending');

      expect(aiService.submitRequest).toHaveBeenCalledWith({
        userId: testUser.id,
        serviceId: 'chat-gpt-3.5',
        input: 'Hello world',
        parameters: { temperature: 0.7 },
        priority: 'normal'
      });
    });

    it('should validate request data', async () => {
      const response = await request(app)
        .post('/api/ai/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          input: 'Hello world'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid request data');
    });

    it('should handle service errors', async () => {
      vi.mocked(aiService.submitRequest).mockResolvedValue({
        success: false,
        error: 'Service not available'
      });

      const response = await request(app)
        .post('/api/ai/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          serviceId: 'chat-gpt-3.5',
          input: 'Hello world'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Service not available');
    });
  });

  describe('GET /api/ai/request/:id', () => {
    it('should return request status', async () => {
      const mockRequest = {
        id: 'req-123',
        userId: testUser.id,
        serviceId: 'chat-gpt-3.5',
        status: 'processing',
        createdAt: new Date()
      };

      const mockQueueStatus = {
        status: 'active',
        progress: 50
      };

      vi.mocked(aiService.getRequestStatus).mockResolvedValue({
        request: mockRequest ,
        queueStatus: mockQueueStatus
      });

      const response = await request(app)
        .get('/api/ai/request/req-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.request.id).toBe('req-123');
      expect(response.body.data.queueStatus.progress).toBe(50);
    });

    it('should reject unauthorized access', async () => {
      const mockRequest = {
        id: 'req-123',
        userId: 'other-user',
        serviceId: 'chat-gpt-3.5',
        status: 'processing'
      };

      vi.mocked(aiService.getRequestStatus).mockResolvedValue({
        request: mockRequest 
      });

      const response = await request(app)
        .get('/api/ai/request/req-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unauthorized access to request');
    });

    it('should handle non-existent request', async () => {
      vi.mocked(aiService.getRequestStatus).mockResolvedValue({
        error: 'Request not found'
      });

      const response = await request(app)
        .get('/api/ai/request/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Request not found');
    });
  });

  describe('DELETE /api/ai/request/:id', () => {
    it('should cancel request successfully', async () => {
      vi.mocked(aiService.cancelRequest).mockResolvedValue({
        success: true
      });

      const response = await request(app)
        .delete('/api/ai/request/req-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Request cancelled successfully');

      expect(aiService.cancelRequest).toHaveBeenCalledWith('req-123', testUser.id);
    });

    it('should handle cancellation errors', async () => {
      vi.mocked(aiService.cancelRequest).mockResolvedValue({
        success: false,
        error: 'Request already completed'
      });

      const response = await request(app)
        .delete('/api/ai/request/req-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Request already completed');
    });
  });

  describe('GET /api/ai/requests', () => {
    it('should return user requests with pagination', async () => {
      const mockRequests = [
        {
          id: 'req-1',
          userId: testUser.id,
          serviceId: 'chat-gpt-3.5',
          status: 'completed'
        },
        {
          id: 'req-2',
          userId: testUser.id,
          serviceId: 'chat-gpt-4',
          status: 'pending'
        }
      ];

      vi.mocked(aiService.getUserRequests).mockResolvedValue({
        requests: mockRequests ,
        total: 2
      });

      const response = await request(app)
        .get('/api/ai/requests?limit=10&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.requests).toEqual(mockRequests);
      expect(response.body.data.pagination.total).toBe(2);
      expect(response.body.data.pagination.hasMore).toBe(false);

      expect(aiService.getUserRequests).toHaveBeenCalledWith(testUser.id, {
        limit: 10,
        offset: 0,
        status: undefined,
        serviceId: undefined
      });
    });

    it('should handle query parameters', async () => {
      vi.mocked(aiService.getUserRequests).mockResolvedValue({
        requests: [],
        total: 0
      });

      await request(app)
        .get('/api/ai/requests?status=completed&serviceId=chat-gpt-3.5&limit=5&offset=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(aiService.getUserRequests).toHaveBeenCalledWith(testUser.id, {
        limit: 5,
        offset: 10,
        status: 'completed',
        serviceId: 'chat-gpt-3.5'
      });
    });
  });

  describe('GET /api/ai/stats', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        total: 10,
        completed: 8,
        failed: 1,
        pending: 1,
        processing: 0,
        tokensUsed: 5000
      };

      vi.mocked(aiService.getUserStats).mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/ai/stats?period=day')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toEqual(mockStats);
      expect(response.body.data.period).toBe('day');

      expect(aiService.getUserStats).toHaveBeenCalledWith(testUser.id, 'day');
    });

    it('should validate period parameter', async () => {
      const response = await request(app)
        .get('/api/ai/stats?period=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid period');
    });
  });

  describe('GET /api/ai/service/:id/test', () => {
    it('should test service availability', async () => {
      vi.mocked(aiService.testService).mockResolvedValue({
        success: true
      });

      const response = await request(app)
        .get('/api/ai/service/chat-gpt-3.5/test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceId).toBe('chat-gpt-3.5');
      expect(response.body.data.available).toBe(true);

      expect(aiService.testService).toHaveBeenCalledWith('chat-gpt-3.5');
    });

    it('should handle service test failure', async () => {
      vi.mocked(aiService.testService).mockResolvedValue({
        success: false,
        error: 'Service unavailable'
      });

      const response = await request(app)
        .get('/api/ai/service/chat-gpt-3.5/test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.available).toBe(false);
      expect(response.body.data.error).toBe('Service unavailable');
    });
  });

  describe('Admin Routes', () => {
    let adminUser;
    let adminToken;

    beforeEach(async () => {
      adminUser = await createTestUser({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN'
      });
      
      const adminSession = await createTestSession(adminUser.id);
      adminToken = adminSession.token;
    });

    describe('GET /api/ai/admin/queue/stats', () => {
      it('should return queue statistics for admin', async () => {
        const mockStats = {
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 3,
          delayed: 1
        };

        vi.mocked(aiService.getQueueStats).mockResolvedValue(mockStats);

        const response = await request(app)
          .get('/api/ai/admin/queue/stats')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.stats).toEqual(mockStats);
      });

      it('should reject non-admin users', async () => {
        const response = await request(app)
          .get('/api/ai/admin/queue/stats')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Admin access required');
      });
    });
  });
});