 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import Bull from 'bull';


import { securityScanRequestService } from './security-scan-request.service';
import { securityScannerRegistry } from './security-scanner-registry.service';
import { securityScanProcessor } from './security-scan-processor.service';
import { vulnerabilityAlertingService } from './vulnerability-alerting.service';

/**
 * Security Scan Queue Service - Manages security scan processing queue using Bull
 */
export class SecurityScanQueueService {
  
   __init() {this.isInitialized = false}

  constructor() {;SecurityScanQueueService.prototype.__init.call(this);
    // Initialize queue with Redis connection
    this.queue = new Bull('security-scans', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '1') // Use different DB than AI queue
      },
      defaultJobOptions: {
        removeOnComplete: 50, // Keep last 50 completed jobs
        removeOnFail: 25, // Keep last 25 failed jobs
        attempts: 2, // Retry failed scans once
        backoff: {
          type: 'exponential',
          delay: 5000
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
      
      // Process scheduled scans
      this.startScheduledScanProcessor();
      
      this.isInitialized = true;
      console.log('✅ Security Scan Queue Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Security Scan Queue Service:', error);
      throw error;
    }
  }

  /**
   * Setup job processors
   */
   setupProcessors() {
    // Process security scan jobs
    this.queue.process('security-scan', 3, async (job) => {
      const { scanId, userId, target, scanType, configuration, priority } = job.data;
      
      console.log(`🔍 Processing security scan: ${scanId} (${scanType})`);
      
      try {
        // Update scan status to running
        await securityScanRequestService.updateScanStatus(scanId, 'RUNNING' , {
          startedAt: new Date()
        });

        // Get compatible scanners
        const scanners = securityScannerRegistry.getCompatibleScanners(scanType, target.type);
        if (scanners.length === 0) {
          throw new Error(`No compatible scanners found for ${scanType} scan of ${target.type}`);
        }

        // Use the first available scanner (could be enhanced with load balancing)
        const scanner = scanners[0];
        
        // Update job progress
        job.progress(10);

        // Process the scan
        const results = await securityScanProcessor.processScan({
          scanId,
          scanner,
          target,
          configuration: configuration || {}
        }, (progress) => {
          job.progress(10 + (progress * 0.8)); // Map 0-100% to 10-90%
        });

        // Update job progress
        job.progress(95);

        // Update scan with results
        const completedScan = await securityScanRequestService.updateScanStatus(scanId, 'COMPLETED', {
          completedAt: new Date(),
          results
        });

        // Process vulnerability alerts
        if (completedScan) {
          try {
            await vulnerabilityAlertingService.processScanResults(completedScan);
            console.log(`🔔 Processed vulnerability alerts for scan: ${scanId}`);
          } catch (alertError) {
            console.error(`⚠️ Failed to process vulnerability alerts for scan ${scanId}:`, alertError);
            // Don't fail the scan if alerting fails
          }
        }

        job.progress(100);
        
        console.log(`✅ Security scan completed: ${scanId}`);
        return { success: true, scanId, results };

      } catch (error) {
        console.error(`❌ Security scan failed: ${scanId}`, error);
        
        // Update scan status to failed
        await securityScanRequestService.updateScanStatus(scanId, 'FAILED', {
          completedAt: new Date()
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
      console.log(`✅ Security scan job completed: ${job.id}`);
    });

    this.queue.on('failed', (job, err) => {
      console.error(`❌ Security scan job failed: ${job.id}`, err.message);
    });

    this.queue.on('stalled', (job) => {
      console.warn(`⚠️ Security scan job stalled: ${job.id}`);
    });

    this.queue.on('progress', (job, progress) => {
      console.log(`🔄 Security scan progress: ${job.id} - ${progress}%`);
    });
  }

  /**
   * Add security scan to queue
   */
  async addScan(scanJob) {
    const jobOptions = {
      priority: this.getPriorityValue(scanJob.priority),
      delay: 0,
    };

    // If scan is scheduled, add delay
    const scan = await securityScanRequestService.getScan(scanJob.scanId);
    if (_optionalChain([scan, 'optionalAccess', _ => _.scheduledAt]) && scan.scheduledAt > new Date()) {
      jobOptions.delay = scan.scheduledAt.getTime() - Date.now();
    }

    const job = await this.queue.add('security-scan', scanJob, jobOptions);
    
    console.log(`📋 Added security scan to queue: ${scanJob.scanId} (Priority: ${scanJob.priority})`);
    return job;
  }

  /**
   * Get job status
   */
  async getJobStatus(scanId)



 {
    const jobs = await this.queue.getJobs(['waiting', 'active', 'completed', 'failed']);
    const job = jobs.find(j => j.data.scanId === scanId);
    
    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress();
    const failedReason = job.failedReason;

    return {
      status: state.toUpperCase(),
      progress: typeof progress === 'number' ? progress : undefined,
      error: failedReason || undefined
    };
  }

  /**
   * Cancel a scan job
   */
  async cancelJob(scanId) {
    const jobs = await this.queue.getJobs(['waiting', 'active', 'delayed']);
    const job = jobs.find(j => j.data.scanId === scanId);
    
    if (!job) return false;

    try {
      await job.remove();
      
      // Update scan status in database
      await securityScanRequestService.updateScanStatus(scanId, 'FAILED' , {
        completedAt: new Date()
      });
      
      console.log(`🚫 Cancelled security scan job: ${scanId}`);
      return true;
    } catch (error) {
      console.error(`Failed to cancel security scan job: ${scanId}`, error);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed(),
      this.queue.getDelayed()
    ]);

    // Calculate average processing time from recent completed jobs
    const recentCompleted = completed.slice(-20); // Last 20 jobs
    let averageProcessingTime = 0;
    
    if (recentCompleted.length > 0) {
      const totalTime = recentCompleted.reduce((sum, job) => {
        const processedOn = job.processedOn || 0;
        const finishedOn = job.finishedOn || 0;
        return sum + (finishedOn - processedOn);
      }, 0);
      
      averageProcessingTime = totalTime / recentCompleted.length;
    }

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      totalProcessed: completed.length + failed.length,
      averageProcessingTime
    };
  }

  /**
   * Clean up old jobs
   */
  async cleanupJobs() {
    try {
      // Clean completed jobs older than 7 days
      await this.queue.clean(7 * 24 * 60 * 60 * 1000, 'completed');
      
      // Clean failed jobs older than 3 days
      await this.queue.clean(3 * 24 * 60 * 60 * 1000, 'failed');
      
      console.log('🧹 Security scan queue cleanup completed');
    } catch (error) {
      console.error('Error cleaning up security scan queue:', error);
    }
  }

  /**
   * Start scheduled scan processor
   */
   startScheduledScanProcessor() {
    // Check for scheduled scans every minute
    setInterval(async () => {
      try {
        const scheduledScans = await securityScanRequestService.getScheduledScans();
        
        for (const scan of scheduledScans) {
          // Check if job already exists in queue
          const existingJob = await this.getJobStatus(scan.id);
          if (existingJob) continue;

          // Add to queue
          const scanJob = {
            scanId: scan.id,
            userId: scan.userId,
            target: scan.target,
            scanType: scan.scanType,
            priority: 'normal'
          };

          await this.addScan(scanJob);
        }
      } catch (error) {
        console.error('Error processing scheduled scans:', error);
      }
    }, 60000); // Every minute
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
   * Pause the queue
   */
  async pause() {
    await this.queue.pause();
    console.log('⏸️ Security scan queue paused');
  }

  /**
   * Resume the queue
   */
  async resume() {
    await this.queue.resume();
    console.log('▶️ Security scan queue resumed');
  }

  /**
   * Get queue health status
   */
  async getHealthStatus()





 {
    try {
      const isPaused = await this.queue.isPaused();
      const stats = await this.getQueueStats();
      
      return {
        isHealthy: !isPaused && stats.failed < 10, // Consider unhealthy if too many failures
        queueStatus: isPaused ? 'paused' : 'running',
        redisConnected: true,
        activeJobs: stats.active,
        failedJobs: stats.failed
      };
    } catch (error) {
      return {
        isHealthy: false,
        queueStatus: 'error',
        redisConnected: false,
        activeJobs: 0,
        failedJobs: 0
      };
    }
  }
}

// Singleton instance
export const securityScanQueueService = new SecurityScanQueueService();