
import { aiServiceRegistry } from './ai-registry.service';
import { aiRequestService } from './ai-request.service';
import { aiQueueService } from './ai-queue.service';
import { validateAIRequestInput, sanitizeAIRequestParameters, validateRequestSize } from '../validations/ai';

/**
 * Main AI Service - Orchestrates AI request processing
 */
export class AIServiceManager {
  /**
   * Initialize the AI service
   */
  async initialize() {
    await aiQueueService.initialize();
    console.log('✅ AI Service Manager initialized');
  }

  /**
   * Get all available AI services
   */
  getAvailableServices() {
    return aiServiceRegistry.getServices();
  }

  /**
   * Get services by category
   */
  getServicesByCategory(category) {
    return aiServiceRegistry.getServicesByCategory(category);
  }

  /**
   * Get a specific service
   */
  getService(serviceId) {
    return aiServiceRegistry.getService(serviceId);
  }

  /**
   * Submit an AI request
   */
  async submitRequest(data





) {
    try {
      // Get service configuration
      const service = aiServiceRegistry.getService(data.serviceId);
      if (!service) {
        return { success: false, error: 'Service not found' };
      }

      if (!service.isActive) {
        return { success: false, error: 'Service is currently unavailable' };
      }

      // Validate request size
      if (!validateRequestSize(data.input, service.limits.maxRequestSize)) {
        return { 
          success: false, 
          error: `Request size exceeds limit of ${service.limits.maxRequestSize} bytes` 
        };
      }

      // Validate and sanitize parameters
      const validation = validateAIRequestInput(
        data.input,
        data.parameters || {},
        service.parameters || {}
      );

      if (!validation.isValid) {
        return { 
          success: false, 
          error: `Validation failed: ${validation.errors.join(', ')}` 
        };
      }

      const sanitizedParameters = sanitizeAIRequestParameters(
        data.parameters || {},
        service.parameters || {}
      );

      // Check rate limits
      const rateLimitCheck = await aiRequestService.checkRateLimit(
        data.userId,
        data.serviceId,
        service.limits
      );

      if (!rateLimitCheck.allowed) {
        return { 
          success: false, 
          error: rateLimitCheck.reason || 'Rate limit exceeded' 
        };
      }

      // Create request in database
      const request = await aiRequestService.createRequest({
        userId: data.userId,
        serviceId: data.serviceId,
        input: data.input,
        parameters: sanitizedParameters,
        priority: data.priority || 'normal'
      });

      // Add to processing queue
      const job = {
        requestId: request.id,
        userId: data.userId,
        serviceId: data.serviceId,
        input: data.input,
        parameters: sanitizedParameters,
        priority: data.priority || 'normal'
      };

      await aiQueueService.addRequest(job);

      return { success: true, requestId: request.id };

    } catch (error) {
      console.error('Error submitting AI request:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get request status
   */
  async getRequestStatus(requestId)







 {
    try {
      // Get request from database
      const request = await aiRequestService.getRequest(requestId);
      if (!request) {
        return { error: 'Request not found' };
      }

      // Get queue status
      const queueStatus = await aiQueueService.getJobStatus(requestId);

      return {
        request,
        queueStatus: queueStatus || undefined
      };

    } catch (error) {
      console.error('Error getting request status:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get user's AI requests
   */
  async getUserRequests(
    userId,
    options




 = {}
  ) {
    return aiRequestService.getUserRequests(userId, options);
  }

  /**
   * Cancel a request
   */
  async cancelRequest(requestId, userId) {
    try {
      // Verify request belongs to user
      const request = await aiRequestService.getRequest(requestId);
      if (!request) {
        return { success: false, error: 'Request not found' };
      }

      if (request.userId !== userId) {
        return { success: false, error: 'Unauthorized' };
      }

      if (request.status === 'completed' || request.status === 'failed') {
        return { success: false, error: 'Request already completed' };
      }

      // Cancel job in queue
      const cancelled = await aiQueueService.cancelJob(requestId);
      
      return { success: cancelled };

    } catch (error) {
      console.error('Error cancelling request:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get user's usage statistics
   */
  async getUserStats(
    userId,
    period = 'day'
  )






 {
    return aiRequestService.getUserRequestStats(userId, period);
  }

  /**
   * Get queue statistics (admin only)
   */
  async getQueueStats()





 {
    return aiQueueService.getQueueStats();
  }

  /**
   * Test service availability
   */
  async testService(serviceId) {
    try {
      const service = aiServiceRegistry.getService(serviceId);
      if (!service) {
        return { success: false, error: 'Service not found' };
      }

      // Test provider connection
      const provider = aiServiceRegistry.getProvider(service.provider);
      if (!provider) {
        return { success: false, error: 'Provider not configured' };
      }

      // This would test the actual provider connection
      // For now, just check if service is active
      return { success: service.isActive };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Cleanup old requests and jobs
   */
  async cleanup() {
    try {
      // Cleanup old database records
      const deletedCount = await aiRequestService.cleanupOldRequests(30);
      console.log(`🧹 Cleaned up ${deletedCount} old AI requests`);

      // Cleanup queue jobs
      await aiQueueService.cleanupJobs();

    } catch (error) {
      console.error('Error during AI service cleanup:', error);
    }
  }
}

// Singleton instance
export const aiService = new AIServiceManager();