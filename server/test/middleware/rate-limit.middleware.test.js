import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  rateLimitMiddleware as rateLimitBySubscription,
  incrementUsageAfterSuccess,
  checkStorageLimit,
  incrementStorageAfterUpload,
  trackBandwidthUsage,
} from '../../lib/middleware/rate-limit.middleware.js';
import { usageService } from '../../lib/services/usage.service.js';
import { subscriptionService } from '../../lib/services/subscription.service.js';

// Mock services
vi.mock('../../lib/services/usage.service.js');
vi.mock('../../lib/services/subscription.service.js');

describe('Rate Limit Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-1', email: 'test@example.com', role: 'USER' },
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rateLimitBySubscription', () => {
    it('should allow action when under limit', async () => {
      vi.mocked(usageService.canPerformAction).mockResolvedValue({
        allowed: true,
        currentUsage: 50,
        limit: 100,
      });

      const middleware = rateLimitBySubscription({ action: 'ai_request' });
      await middleware(mockReq , mockRes , mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.rateLimitAction).toBe('ai_request');
      expect(mockReq.rateLimitUserId).toBe('user-1');
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should deny action when over limit', async () => {
      vi.mocked(usageService.canPerformAction).mockResolvedValue({
        allowed: false,
        reason: 'AI request limit exceeded',
        currentUsage: 100,
        limit: 100,
      });

      vi.mocked(subscriptionService.getUserSubscription).mockResolvedValue({
        id: 'sub-1',
        planId: 'plan-starter',
        plan: { id: 'plan-starter', name: 'Starter' },
      } );

      vi.mocked(subscriptionService.getPlans).mockResolvedValue([
        { id: 'plan-free', name: 'Free', price: 0 },
        { id: 'plan-starter', name: 'Starter', price: 2900 },
        { id: 'plan-pro', name: 'Professional', price: 9900 },
      ] );

      const middleware = rateLimitBySubscription({ action: 'ai_request' });
      await middleware(mockReq , mockRes , mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          type: 'RATE_LIMIT_ERROR',
          message: 'AI request limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          details: {
            action: 'ai_request',
            currentUsage: 100,
            limit: 100,
            period: expect.any(String),
            upgradeAvailable: true,
            suggestedPlan: {
              id: 'plan-pro',
              name: 'Professional',
              price: 9900,
            },
          },
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user not authenticated', async () => {
      mockReq.user = undefined;

      const middleware = rateLimitBySubscription({ action: 'ai_request' });
      await middleware(mockReq , mockRes , mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use custom error message', async () => {
      vi.mocked(usageService.canPerformAction).mockResolvedValue({
        allowed: false,
        reason: 'Limit exceeded',
        currentUsage: 10,
        limit: 10,
      });

      vi.mocked(subscriptionService.getUserSubscription).mockResolvedValue(null);
      vi.mocked(subscriptionService.getPlans).mockResolvedValue([]);

      const middleware = rateLimitBySubscription({
        action: 'ai_request',
        customErrorMessage: 'Custom limit message',
      });
      await middleware(mockReq , mockRes , mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Custom limit message',
          }),
        })
      );
    });

    it('should handle service errors gracefully', async () => {
      vi.mocked(usageService.canPerformAction).mockRejectedValue(new Error('Service error'));

      const middleware = rateLimitBySubscription({ action: 'ai_request' });
      await middleware(mockReq , mockRes , mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check rate limits',
          code: 'RATE_LIMIT_CHECK_FAILED',
        },
      });
    });
  });

  describe('incrementUsageAfterSuccess', () => {
    it('should increment usage on successful response', async () => {
      mockReq.rateLimitAction = 'ai_request';
      mockReq.rateLimitUserId = 'user-1';

      const originalJson = vi.fn();
      mockRes.json = vi.fn().mockImplementation(function(body) {
        // Simulate successful response
        mockRes.statusCode = 200;
        return originalJson.call(this, body);
      });

      vi.mocked(usageService.incrementUsage).mockResolvedValue({} );

      const middleware = incrementUsageAfterSuccess();
      middleware(mockReq , mockRes , mockNext);

      expect(mockNext).toHaveBeenCalled();

      // Simulate calling res.json
      await (mockRes.json )({ success: true });

      // Wait for async increment
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(usageService.incrementUsage).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'ai_request',
      });
    });

    it('should not increment usage on error response', async () => {
      mockReq.rateLimitAction = 'ai_request';
      mockReq.rateLimitUserId = 'user-1';

      const originalJson = vi.fn();
      mockRes.json = vi.fn().mockImplementation(function(body) {
        // Simulate error response
        mockRes.statusCode = 400;
        return originalJson.call(this, body);
      });

      const middleware = incrementUsageAfterSuccess();
      middleware(mockReq , mockRes , mockNext);

      // Simulate calling res.json with error
      await (mockRes.json )({ error: 'Bad request' });

      expect(usageService.incrementUsage).not.toHaveBeenCalled();
    });

    it('should not increment usage when no action set', async () => {
      const originalJson = vi.fn();
      mockRes.json = vi.fn().mockImplementation(function(body) {
        mockRes.statusCode = 200;
        return originalJson.call(this, body);
      });

      const middleware = incrementUsageAfterSuccess();
      middleware(mockReq , mockRes , mockNext);

      await (mockRes.json )({ success: true });

      expect(usageService.incrementUsage).not.toHaveBeenCalled();
    });
  });

  describe('checkStorageLimit', () => {
    it('should allow upload when under storage limit', async () => {
      mockReq.headers = { 'content-length': '1048576' }; // 1MB

      vi.mocked(usageService.getUserUsageReport).mockResolvedValue({
        usage: {
          storageUsed: BigInt(1024 * 1024 * 1024), // 1GB
        },
        limits: {
          storageGB: 10,
        },
      } );

      const middleware = checkStorageLimit();
      await middleware(mockReq , mockRes , mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.uploadFileSize).toBe(BigInt(1048576));
      expect(mockReq.rateLimitUserId).toBe('user-1');
    });

    it('should deny upload when over storage limit', async () => {
      mockReq.headers = { 'content-length': '2147483648' }; // 2GB

      vi.mocked(usageService.getUserUsageReport).mockResolvedValue({
        usage: {
          storageUsed: BigInt(9 * 1024 * 1024 * 1024), // 9GB
        },
        limits: {
          storageGB: 10,
        },
      } );

      const middleware = checkStorageLimit();
      await middleware(mockReq , mockRes , mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(413);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          type: 'STORAGE_LIMIT_ERROR',
          message: 'Storage limit exceeded',
          code: 'STORAGE_LIMIT_EXCEEDED',
          details: {
            currentUsageGB: expect.any(Number),
            fileSizeGB: expect.any(Number),
            limitGB: 10,
            availableGB: expect.any(Number),
          },
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing content-length header', async () => {
      mockReq.headers = {};

      vi.mocked(usageService.getUserUsageReport).mockResolvedValue({
        usage: { storageUsed: BigInt(0) },
        limits: { storageGB: 10 },
      } );

      const middleware = checkStorageLimit();
      await middleware(mockReq , mockRes , mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.uploadFileSize).toBe(BigInt(0));
    });
  });

  describe('incrementStorageAfterUpload', () => {
    it('should increment storage usage on successful upload', async () => {
      mockReq.uploadFileSize = BigInt(1048576); // 1MB
      mockReq.rateLimitUserId = 'user-1';

      const originalJson = vi.fn();
      mockRes.json = vi.fn().mockImplementation(function(body) {
        mockRes.statusCode = 200;
        return originalJson.call(this, body);
      });

      vi.mocked(usageService.incrementUsage).mockResolvedValue({} );

      const middleware = incrementStorageAfterUpload();
      middleware(mockReq , mockRes , mockNext);

      expect(mockNext).toHaveBeenCalled();

      await (mockRes.json )({ success: true });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(usageService.incrementUsage).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'storage',
        storageBytes: BigInt(1048576),
      });
    });
  });

  describe('trackBandwidthUsage', () => {
    it('should track bandwidth usage for authenticated users', async () => {
      mockReq.headers = { 'content-length': '1024' };

      const originalJson = vi.fn();
      mockRes.json = vi.fn().mockImplementation(function(body) {
        const responseSize = Buffer.byteLength(JSON.stringify(body), 'utf8');
        // The middleware should track bandwidth here
        return originalJson.call(this, body);
      });

      vi.mocked(usageService.incrementUsage).mockResolvedValue({} );

      const middleware = trackBandwidthUsage();
      middleware(mockReq , mockRes , mockNext);

      expect(mockNext).toHaveBeenCalled();

      // Simulate response
      await (mockRes.json )({ message: 'test response' });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(usageService.incrementUsage).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'bandwidth',
        bandwidthBytes: expect.any(BigInt),
      });
    });

    it('should not track bandwidth for unauthenticated users', async () => {
      mockReq.user = undefined;

      const middleware = trackBandwidthUsage();
      middleware(mockReq , mockRes , mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(usageService.incrementUsage).not.toHaveBeenCalled();
    });
  });
});