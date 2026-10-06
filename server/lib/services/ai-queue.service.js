 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import Bull from 'bull';


import { aiServiceRegistry } from './ai-registry.service';
import { aiRequestService } from './ai-request.service';
import { aiProviderService } from './ai-provider.service';

/**
 * AI Queue Service - Manages AI request processing queue using Bull
 */
export class AIQueueService {
   __init() {this.queue = null}
   __init2() {this.isInitialized = false}

  constructor() {;AIQueueService.prototype.__init.call(this);AIQueueService.prototype.__init2.call(this);
    // Pure constructor - zero background handles or Redis connections at import time (Invariant #3)
  }

  /**
   * Get or create Bull queue instance lazily
   */
  getQueue() {
    if (!this.queue) {
      // Build into a local first. `this.queue` is declared `Queue | null` and
      // TypeScript does not carry a narrowing of a mutable class field across a
      // method boundary, so `setupProcessors`/`setupEventHandlers` would still
      // see `Queue | null` and fail on every `this.queue.…` access. Passing the
      // freshly constructed instance explicitly keeps the field nullable while
      // handing the helpers a definitely-non-null queue.
      const queue = new Bull('ai-requests', {
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

      this.setupProcessors(queue);
      this.setupEventHandlers(queue);
      this.queue = queue;
    }
    return this.queue;
  }

  /**
   * Initialize the queue service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Test Redis connection
      const q = this.getQueue();
      await q.isReady();

      console.log('✅ AI Queue Service initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      console.warn('⚠️ AI Queue Service could not connect to Redis (deferred):', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Add AI request to processing queue
   */
  async addRequest(job) {
    const priority = this.getPriorityValue(job.priority);

    const bullJob = await this.getQueue().add('process-ai-request', job, {
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
    const q = this.getQueue();
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      q.getWaiting(),
      q.getActive(),
      q.getCompleted(),
      q.getFailed(),
      q.getDelayed()
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
      const job = await this.getQueue().getJob(requestId);
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
      const job = await this.getQueue().getJob(requestId);
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
   setupProcessors(queue) {
    // Main AI request processor
    queue.process('process-ai-request', 5, async (job) => {
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
          requestId,
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
   setupEventHandlers(queue) {
    // Bull can emit these events without a job attached (for example when a
    // global event fires or the job record has already been removed), so every
    // handler must tolerate a null job rather than dereferencing it directly.
    queue.on('completed', (job, result) => {
      console.log(`🎉 Job ${_nullishCoalesce(_optionalChain([job, 'optionalAccess', _ => _.id]), () => ( 'unknown'))} completed successfully`);
    });

    queue.on('failed', (job, error) => {
      console.error(`💥 Job ${_nullishCoalesce(_optionalChain([job, 'optionalAccess', _2 => _2.id]), () => ( 'unknown'))} failed:`, error.message);
    });

    queue.on('stalled', (job) => {
      console.warn(`⏰ Job ${_nullishCoalesce(_optionalChain([job, 'optionalAccess', _3 => _3.id]), () => ( 'unknown'))} stalled and will be retried`);
    });

    queue.on('progress', (job, progress) => {
      console.log(`📊 Job ${_nullishCoalesce(_optionalChain([job, 'optionalAccess', _4 => _4.id]), () => ( 'unknown'))} progress: ${progress}%`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      if (this.queue) {
        console.log('🛑 Gracefully shutting down AI queue...');
        await this.queue.close();
      }
    });

    process.on('SIGINT', async () => {
      if (this.queue) {
        console.log('🛑 Gracefully shutting down AI queue...');
        await this.queue.close();
      }
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
      const q = this.getQueue();
      // Clean completed jobs older than 24 hours
      await q.clean(24 * 60 * 60 * 1000, 'completed');
      
      // Clean failed jobs older than 7 days
      await q.clean(7 * 24 * 60 * 60 * 1000, 'failed');
      
      console.log('🧹 Cleaned up old queue jobs');
    } catch (error) {
      console.error('Error cleaning up jobs:', error);
    }
  }
}

// Singleton instance
export const aiQueueService = new AIQueueService();