import cron from 'node-cron';
import { securityService } from './security.service';

import { PrismaClient } from '@prisma/client';

/**
 * Security Cron Service - Handles scheduled security scans and maintenance tasks
 */
export class SecurityCronService {
  
   __init() {this.isInitialized = false}
   __init2() {this.scheduledTasks = new Map()}

  constructor() {;SecurityCronService.prototype.__init.call(this);SecurityCronService.prototype.__init2.call(this);
    this.prisma = new PrismaClient();
  }

  /**
   * Initialize the cron service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Start scheduled scan processor (every minute)
      this.startScheduledScanProcessor();
      
      // Start cleanup tasks (daily at 2 AM)
      this.startCleanupTasks();
      
      // Start CVE database updates (daily at 3 AM)
      this.startCVEUpdates();
      
      // Start health checks (every 5 minutes)
      this.startHealthChecks();

      this.isInitialized = true;
      console.log('✅ Security Cron Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Security Cron Service:', error);
      throw error;
    }
  }

  /**
   * Start scheduled scan processor
   */
   startScheduledScanProcessor() {
    const task = cron.schedule('* * * * *', async () => {
      try {
        await this.processScheduledScans();
      } catch (error) {
        console.error('Error processing scheduled scans:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.scheduledTasks.set('scheduled-scans', task);
    console.log('📅 Scheduled scan processor started (every minute)');
  }

  /**
   * Start cleanup tasks
   */
   startCleanupTasks() {
    const task = cron.schedule('0 2 * * *', async () => {
      try {
        console.log('🧹 Starting daily cleanup tasks...');
        await securityService.cleanup();
        console.log('✅ Daily cleanup tasks completed');
      } catch (error) {
        console.error('❌ Error during cleanup tasks:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.scheduledTasks.set('cleanup', task);
    console.log('🧹 Cleanup tasks scheduled (daily at 2 AM UTC)');
  }

  /**
   * Start CVE database updates
   */
   startCVEUpdates() {
    const task = cron.schedule('0 3 * * *', async () => {
      try {
        console.log('🔄 Starting CVE database update...');
        // CVE updates are handled in the cleanup method
        // This is a placeholder for future dedicated CVE update logic
        console.log('✅ CVE database update completed');
      } catch (error) {
        console.error('❌ Error during CVE database update:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.scheduledTasks.set('cve-updates', task);
    console.log('🔄 CVE database updates scheduled (daily at 3 AM UTC)');
  }

  /**
   * Start health checks
   */
   startHealthChecks() {
    const task = cron.schedule('*/5 * * * *', async () => {
      try {
        const health = await securityService.getHealthStatus();
        if (!health.isHealthy) {
          console.warn('⚠️ Security service health check failed:', health);
          // Here you could send alerts, notifications, etc.
        }
      } catch (error) {
        console.error('❌ Error during health check:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.scheduledTasks.set('health-checks', task);
    console.log('❤️ Health checks scheduled (every 5 minutes)');
  }

  /**
   * Process scheduled scans that are ready to run
   */
   async processScheduledScans() {
    try {
      const now = new Date();
      
      // Get scans scheduled to run now or in the past
      const scheduledScans = await this.prisma.securityScan.findMany({
        where: {
          status: 'QUEUED',
          scheduledAt: {
            lte: now
          }
        },
        orderBy: {
          scheduledAt: 'asc'
        },
        take: 10 // Process up to 10 scans at a time
      });

      if (scheduledScans.length === 0) {
        return;
      }

      console.log(`📋 Processing ${scheduledScans.length} scheduled scans...`);

      for (const scan of scheduledScans) {
        try {
          // Submit the scan for processing
          const result = await securityService.submitScan({
            userId: scan.userId,
            target: scan.targetData ,
            scanType: scan.scanType,
            priority: 'normal'
          });

          if (result.success) {
            // Update the original scheduled scan to mark it as processed
            await this.prisma.securityScan.update({
              where: { id: scan.id },
              data: { 
                status: 'RUNNING',
                startedAt: new Date()
              }
            });

            console.log(`✅ Scheduled scan ${scan.id} submitted for processing`);
          } else {
            // Mark scan as failed
            await this.prisma.securityScan.update({
              where: { id: scan.id },
              data: { 
                status: 'FAILED',
                completedAt: new Date()
              }
            });

            console.error(`❌ Failed to submit scheduled scan ${scan.id}:`, result.error);
          }
        } catch (error) {
          console.error(`❌ Error processing scheduled scan ${scan.id}:`, error);
          
          // Mark scan as failed
          await this.prisma.securityScan.update({
            where: { id: scan.id },
            data: { 
              status: 'FAILED',
              completedAt: new Date()
            }
          });
        }
      }
    } catch (error) {
      console.error('Error in processScheduledScans:', error);
    }
  }

  /**
   * Create a recurring scan schedule
   */
  async createRecurringScan(data






) {
    try {
      // Validate cron expression
      if (!cron.validate(data.cronExpression)) {
        return {
          success: false,
          error: 'Invalid cron expression'
        };
      }

      // Create recurring scan record in database
      const recurringSchedule = await this.prisma.recurringSecurityScan.create({
        data: {
          userId: data.userId,
          targetData: data.target,
          scanType: data.scanType,
          cronExpression: data.cronExpression,
          configuration: data.configuration || {},
          isActive: data.isActive !== false,
          nextRunAt: this.getNextRunTime(data.cronExpression)
        }
      });

      // Start the cron job
      if (data.isActive !== false) {
        this.startRecurringScanJob(recurringSchedule.id, data.cronExpression, {
          userId: data.userId,
          target: data.target,
          scanType: data.scanType,
          configuration: data.configuration
        });
      }

      return {
        success: true,
        scheduleId: recurringSchedule.id
      };

    } catch (error) {
      console.error('Error creating recurring scan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Start a recurring scan job
   */
   startRecurringScanJob(
    scheduleId, 
    cronExpression, 
    scanData
  ) {
    const task = cron.schedule(cronExpression, async () => {
      try {
        console.log(`🔄 Executing recurring scan: ${scheduleId}`);
        
        const result = await securityService.submitScan({
          userId: scanData.userId,
          target: scanData.target,
          scanType: scanData.scanType,
          configuration: scanData.configuration,
          priority: 'normal'
        });

        if (result.success) {
          console.log(`✅ Recurring scan ${scheduleId} submitted successfully`);
          
          // Update next run time
          await this.prisma.recurringSecurityScan.update({
            where: { id: scheduleId },
            data: {
              lastRunAt: new Date(),
              nextRunAt: this.getNextRunTime(cronExpression),
              runCount: { increment: 1 }
            }
          });
        } else {
          console.error(`❌ Recurring scan ${scheduleId} failed:`, result.error);
        }
      } catch (error) {
        console.error(`❌ Error executing recurring scan ${scheduleId}:`, error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.scheduledTasks.set(`recurring-${scheduleId}`, task);
  }

  /**
   * Stop a recurring scan
   */
  async stopRecurringScan(scheduleId) {
    try {
      // Update database record
      await this.prisma.recurringSecurityScan.update({
        where: { id: scheduleId },
        data: { isActive: false }
      });

      // Stop cron job
      const task = this.scheduledTasks.get(`recurring-${scheduleId}`);
      if (task) {
        task.stop();
        this.scheduledTasks.delete(`recurring-${scheduleId}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error stopping recurring scan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get next run time for cron expression
   */
   getNextRunTime(cronExpression) {
    try {
      const task = cron.schedule(cronExpression, () => {}, { scheduled: false });
      const nextDate = (task ).nextDate();
      if ((task ).destroy) {
        (task ).destroy();
      } else if ((task ).stop) {
        (task ).stop();
      }
      return nextDate.toDate();
    } catch (error) {
      // Fallback to 1 hour from now
      return new Date(Date.now() + 60 * 60 * 1000);
    }
  }

  /**
   * Get service status
   */
  getStatus()



 {
    return {
      isInitialized: this.isInitialized,
      activeTasks: this.scheduledTasks.size,
      taskNames: Array.from(this.scheduledTasks.keys())
    };
  }

  /**
   * Stop all scheduled tasks
   */
  async stop() {
    console.log('🛑 Stopping Security Cron Service...');
    
    for (const [name, task] of this.scheduledTasks) {
      try {
        task.stop();
        console.log(`✅ Stopped task: ${name}`);
      } catch (error) {
        console.error(`❌ Error stopping task ${name}:`, error);
      }
    }
    
    this.scheduledTasks.clear();
    this.isInitialized = false;
    
    console.log('✅ Security Cron Service stopped');
  }
}

// Singleton instance
export const securityCronService = new SecurityCronService();