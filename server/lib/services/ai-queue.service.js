import Bull from 'bull';
import { createRedisClient } from '../redis';

import { aiServiceRegistry } from './ai-registry.service';
import { aiRequestService } from './ai-request.service';
import { aiProviderService } from './ai-provider.service';

/**
 * AI Queue Service - Manages AI request processing queue using Bull
 */
export class AIQueueService {
  
   __init() {this.isInitialized = false}

  constructor() {;AIQueueService.prototype.__init.call(this);
    // Initialize queue with Redis connection
    const redisClient = createRedisClient();
    
    this.queue = new Bull('ai-requests', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0')
      },
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    this.setupProcessors();
    this.setupEventHandlers();
  }

  /**
   * Initialize the queue service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Test Redis connection
      await this.queue.isReady();
      
      console.log('✅ AI Queue Service initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize AI Queue Service:', error);
      throw error;
    }
  }

  /**
   * Add AI request to processing queue
   */
  async addRequest(job) {
    const priority = this.getPriorityValue(job.priority);
    
    const bullJob = await this.queue.add('process-ai-request', job, {
      priority,
      delay: 0,
      jobId: job.requestId // Use request ID as job ID for tracking
    });

    console.log(`📝 Added AI request ${job.requestId} to queue with priority ${job.priority}`);
    return bullJob;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats()





 {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed(),
      this.queue.getDelayed()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length
    };
  }

  /**
   * Get job status
   */
  async getJobStatus(requestId)



 {
    try {
      const job = await this.queue.getJob(requestId);
      if (!job) return null;

      const state = await job.getState();
      
      return {
        status: state,
        progress: job.progress(),
        error: job.failedReason
      };
    } catch (error) {
      console.error(`Error getting job status for ${requestId}:`, error);
      return null;
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(requestId) {
    try {
      const job = await this.queue.getJob(requestId);
      if (!job) return false;

      await job.remove();
      
      // Update request status in database
      await aiRequestService.updateRequestStatus(requestId, 'failed', {
        error: 'Request cancelled by user'
      });

      return true;
    } catch (error) {
      console.error(`Error cancelling job ${requestId}:`, error);
      return false;
    }
  }

  /**
   * Setup queue processors
   */
   setupProcessors() {
    // Main AI request processor
    this.queue.process('process-ai-request', 5, async (job) => {
      const { requestId, userId, serviceId, input, parameters } = job.data;

      try {
        // Update job progress
        await job.progress(10);

        // Get service configuration
        const service = aiServiceRegistry.getService(serviceId);
        if (!service) {
          throw new Error(`Service ${serviceId} not found`);
        }

        // Update request status to processing
        await aiRequestService.updateRequestStatus(requestId, 'processing');
        await job.progress(20);

        // Process the request using the appropriate provider
        const startTime = Date.now();
        const response = await aiProviderService.processRequest(service, {
          input,
          parameters: parameters || {}
        });

        await job.progress(80);

        // Calculate processing time
        const processingTime = Date.now() - startTime;

        // Create AI response
        const aiResponse = {
          requestId,
          result: response.result,
          metadata: {
            processingTime,
            tokensUsed: response.tokensUsed,
            citations: response.citations,
            confidence: response.confidence,
            provider: service.provider,
            model: response.model
          },
          status: 'completed'
        };

        // Save response and update request
        await aiRequestService.completeRequest(requestId, aiResponse);
        await job.progress(100);

        console.log(`✅ Completed AI request ${requestId} in ${processingTime}ms`);
        return aiResponse;

      } catch (error) {
        console.error(`❌ Failed to process AI request ${requestId}:`, error);
        
        // Update request status to failed
        await aiRequestService.updateRequestStatus(requestId, 'failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        throw error;
      }
    });
  }

  /**
   * Setup event handlers
   */
   setupEventHandlers() {
    this.queue.on('completed', (job, result) => {
      console.log(`🎉 Job ${job.id} completed successfully`);
    });

    this.queue.on('failed', (job, error) => {
      console.error(`💥 Job ${job.id} failed:`, error.message);
    });

    this.queue.on('stalled', (job) => {
      console.warn(`⏰ Job ${job.id} stalled and will be retried`);
    });

    this.queue.on('progress', (job, progress) => {
      console.log(`📊 Job ${job.id} progress: ${progress}%`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 Gracefully shutting down AI queue...');
      await this.queue.close();
    });

    process.on('SIGINT', async () => {
      console.log('🛑 Gracefully shutting down AI queue...');
      await this.queue.close();
    });
  }

  /**
   * Convert priority string to numeric value for Bull queue
   */
   getPriorityValue(priority) {
    switch (priority) {
      case 'high': return 1;
      case 'normal': return 5;
      case 'low': return 10;
      default: return 5;
    }
  }

  /**
   * Clean up old jobs
   */
  async cleanupJobs() {
    try {
      // Clean completed jobs older than 24 hours
      await this.queue.clean(24 * 60 * 60 * 1000, 'completed');
      
      // Clean failed jobs older than 7 days
      await this.queue.clean(7 * 24 * 60 * 60 * 1000, 'failed');
      
      console.log('🧹 Cleaned up old queue jobs');
    } catch (error) {
      console.error('Error cleaning up jobs:', error);
    }
  }

  /**
   * Get queue instance for advanced operations
   */
  getQueue() {
    return this.queue;
  }
}

// Singleton instance
export const aiQueueService = new AIQueueService();