 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIServiceManager } from '../ai.service';
import { aiServiceRegistry } from '../ai-registry.service';
import { aiRequestService } from '../ai-request.service';
import { aiQueueService } from '../ai-queue.service';

// Mock dependencies
vi.mock('../ai-registry.service');
vi.mock('../ai-request.service');
vi.mock('../ai-queue.service');

describe.skip('AIServiceManager', () => {
  let aiService;

  beforeEach(() => {
    aiService = new AIServiceManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAvailableServices', () => {
    it('should return available services from registry', () => {
      const mockServices = [
        {
          id: 'chat-gpt-3.5',
          name: 'ChatGPT 3.5',
          description: 'Test service',
          category: 'chat' ,
          pricing: { type: 'per_token' , cost: 0.002, currency: 'usd' },
          limits: { maxRequestsPerHour: 100, maxRequestsPerDay: 1000 },
          isActive: true,
          provider: 'openai'
        }
      ];

      vi.mocked(aiServiceRegistry.getServices).mockReturnValue(mockServices);

      const result = aiService.getAvailableServices();

      expect(result).toEqual(mockServices);
      expect(aiServiceRegistry.getServices).toHaveBeenCalledOnce();
    });
  });

  describe('submitRequest', () => {
    const mockService = {
      id: 'chat-gpt-3.5',
      name: 'ChatGPT 3.5',
      description: 'Test service',
      category: 'chat' ,
      pricing: { type: 'per_token' , cost: 0.002, currency: 'usd' },
      limits: { maxRequestsPerHour: 100, maxRequestsPerDay: 1000 },
      isActive: true,
      provider: 'openai',
      parameters: {
        temperature: {
          name: 'temperature',
          type: 'number' ,
          required: false,
          default: 0.7,
          min: 0,
          max: 2,
          description: 'Controls randomness'
        }
      }
    };

    const mockRequest = {
      id: 'req-123',
      userId: 'user-123',
      serviceId: 'chat-gpt-3.5',
      input: 'Hello world',
      parameters: { temperature: 0.7 },
      priority: 'normal' ,
      status: 'pending' ,
      createdAt: new Date()
    };

    beforeEach(() => {
      vi.mocked(aiServiceRegistry.getService).mockReturnValue(mockService);
      vi.mocked(aiRequestService.checkRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(aiRequestService.createRequest).mockResolvedValue(mockRequest);
      vi.mocked(aiQueueService.addRequest).mockResolvedValue({} );
    });

    it('should successfully submit a valid request', async () => {
      const requestData = {
        userId: 'user-123',
        serviceId: 'chat-gpt-3.5',
        input: 'Hello world',
        parameters: { temperature: 0.8 },
        priority: 'normal' 
      };

      const result = await aiService.submitRequest(requestData);

      expect(result.success).toBe(true);
      expect(result.requestId).toBe('req-123');
      expect(aiServiceRegistry.getService).toHaveBeenCalledWith('chat-gpt-3.5');
      expect(aiRequestService.checkRateLimit).toHaveBeenCalledWith(
        'user-123',
        'chat-gpt-3.5',
        mockService.limits
      );
      expect(aiRequestService.createRequest).toHaveBeenCalled();
      expect(aiQueueService.addRequest).toHaveBeenCalled();
    });

    it('should reject request for non-existent service', async () => {
      vi.mocked(aiServiceRegistry.getService).mockReturnValue(undefined);

      const requestData = {
        userId: 'user-123',
        serviceId: 'non-existent',
        input: 'Hello world'
      };

      const result = await aiService.submitRequest(requestData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service not found');
    });

    it('should reject request for inactive service', async () => {
      const inactiveService = { ...mockService, isActive: false };
      vi.mocked(aiServiceRegistry.getService).mockReturnValue(inactiveService);

      const requestData = {
        userId: 'user-123',
        serviceId: 'chat-gpt-3.5',
        input: 'Hello world'
      };

      const result = await aiService.submitRequest(requestData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service is currently unavailable');
    });

    it('should reject request when rate limit exceeded', async () => {
      vi.mocked(aiRequestService.checkRateLimit).mockResolvedValue({
        allowed: false,
        reason: 'Daily limit exceeded'
      });

      const requestData = {
        userId: 'user-123',
        serviceId: 'chat-gpt-3.5',
        input: 'Hello world'
      };

      const result = await aiService.submitRequest(requestData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Daily limit exceeded');
    });

    it('should validate and sanitize parameters', async () => {
      const requestData = {
        userId: 'user-123',
        serviceId: 'chat-gpt-3.5',
        input: 'Hello world',
        parameters: { temperature: '0.8' } // String instead of number
      };

      const result = await aiService.submitRequest(requestData);

      expect(result.success).toBe(true);
      
      // Check that createRequest was called with sanitized parameters
      const createRequestCall = vi.mocked(aiRequestService.createRequest).mock.calls[0][0];
      expect(typeof _optionalChain([createRequestCall, 'access', _ => _.parameters, 'optionalAccess', _2 => _2.temperature])).toBe('number');
      expect(_optionalChain([createRequestCall, 'access', _3 => _3.parameters, 'optionalAccess', _4 => _4.temperature])).toBe(0.8);
    });
  });

  describe('getRequestStatus', () => {
    it('should return request and queue status', async () => {
      const mockRequest = {
        id: 'req-123',
        userId: 'user-123',
        serviceId: 'chat-gpt-3.5',
        input: 'Hello world',
        parameters: {},
        priority: 'normal' ,
        status: 'processing' ,
        createdAt: new Date()
      };

      const mockQueueStatus = {
        status: 'active',
        progress: 50
      };

      vi.mocked(aiRequestService.getRequest).mockResolvedValue(mockRequest);
      vi.mocked(aiQueueService.getJobStatus).mockResolvedValue(mockQueueStatus);

      const result = await aiService.getRequestStatus('req-123');

      expect(result.request).toEqual(mockRequest);
      expect(result.queueStatus).toEqual(mockQueueStatus);
      expect(result.error).toBeUndefined();
    });

    it('should return error for non-existent request', async () => {
      vi.mocked(aiRequestService.getRequest).mockResolvedValue(null);

      const result = await aiService.getRequestStatus('non-existent');

      expect(result.error).toBe('Request not found');
      expect(result.request).toBeUndefined();
    });
  });

  describe('cancelRequest', () => {
    const mockRequest = {
      id: 'req-123',
      userId: 'user-123',
      serviceId: 'chat-gpt-3.5',
      input: 'Hello world',
      parameters: {},
      priority: 'normal' ,
      status: 'pending' ,
      createdAt: new Date()
    };

    it('should successfully cancel a pending request', async () => {
      vi.mocked(aiRequestService.getRequest).mockResolvedValue(mockRequest);
      vi.mocked(aiQueueService.cancelJob).mockResolvedValue(true);

      const result = await aiService.cancelRequest('req-123', 'user-123');

      expect(result.success).toBe(true);
      expect(aiQueueService.cancelJob).toHaveBeenCalledWith('req-123');
    });

    it('should reject cancellation for non-existent request', async () => {
      vi.mocked(aiRequestService.getRequest).mockResolvedValue(null);

      const result = await aiService.cancelRequest('non-existent', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request not found');
    });

    it('should reject cancellation for unauthorized user', async () => {
      vi.mocked(aiRequestService.getRequest).mockResolvedValue(mockRequest);

      const result = await aiService.cancelRequest('req-123', 'other-user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('should reject cancellation for completed request', async () => {
      const completedRequest = { ...mockRequest, status: 'completed'  };
      vi.mocked(aiRequestService.getRequest).mockResolvedValue(completedRequest);

      const result = await aiService.cancelRequest('req-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request already completed');
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        total: 10,
        completed: 8,
        failed: 1,
        pending: 1,
        processing: 0,
        tokensUsed: 5000
      };

      vi.mocked(aiRequestService.getUserRequestStats).mockResolvedValue(mockStats);

      const result = await aiService.getUserStats('user-123', 'day');

      expect(result).toEqual(mockStats);
      expect(aiRequestService.getUserRequestStats).toHaveBeenCalledWith('user-123', 'day');
    });
  });
});