import { SecurityScan, SecurityScanJob, ScanTarget, ScanConfiguration, UserScanStats, ScanQueueStats } from '../types/security';
import { SecurityScanType, ScanStatus } from '@prisma/client';
import { securityScannerRegistry } from './security-scanner-registry.service';
import { securityScanRequestService } from './security-scan-request.service';
import { securityScanQueueService } from './security-scan-queue.service';
import { cveDatabase } from './cve-database.service';

/**
 * Main Security Service - Orchestrates security scanning functionality
 */
export class SecurityServiceManager {
  /**
   * Initialize the security service
   */
  async initialize(): Promise<void> {
    await securityScanQueueService.initialize();
    console.log('✅ Security Service Manager initialized');
  }

  /**
   * Get all available security scanners
   */
  getAvailableScanners() {
    return securityScannerRegistry.getActiveScanners();
  }

  /**
   * Get scanners by scan type
   */
  getScannersByScanType(scanType: SecurityScanType) {
    const normalizedScanType = scanType.toLowerCase() as 'vulnerability' | 'penetration' | 'compliance';
    return securityScannerRegistry.getScannersByScanType(normalizedScanType);
  }

  /**
   * Get compatible scanners for target
   */
  getCompatibleScanners(scanType: SecurityScanType, targetType: string) {
    const normalizedScanType = scanType.toLowerCase() as 'vulnerability' | 'penetration' | 'compliance';
    const normalizedTargetType = targetType as 'url' | 'ip' | 'domain' | 'repository' | 'file';
    return securityScannerRegistry.getCompatibleScanners(normalizedScanType, normalizedTargetType);
  }

  /**
   * Submit a security scan request
   */
  async submitScan(data: {
    userId: string;
    target: ScanTarget;
    scanType: SecurityScanType;
    configuration?: ScanConfiguration;
    scheduledAt?: Date;
    priority?: 'low' | 'normal' | 'high';
  }): Promise<{ success: boolean; scanId?: string; error?: string }> {
    try {
      // Validate scan type and target compatibility
      const normalizedScanType = data.scanType.toLowerCase() as 'vulnerability' | 'penetration' | 'compliance';
      const compatibleScanners = this.getCompatibleScanners(data.scanType, data.target.type);
      
      if (compatibleScanners.length === 0) {
        return {
          success: false,
          error: `No compatible scanners available for ${data.scanType} scan of ${data.target.type}`
        };
      }

      // Use the first available scanner for rate limiting check. The
      // `length === 0` early return above guarantees one exists.
      const scanner = compatibleScanners[0];
      if (!scanner) {
        return {
          success: false,
          error: `No compatible scanners available for ${data.scanType} scan of ${data.target.type}`
        };
      }
      
      // Check rate limits
      const rateLimitCheck = await securityScanRequestService.checkRateLimit(
        data.userId,
        data.scanType,
        scanner.limits
      );

      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: rateLimitCheck.reason || 'Rate limit exceeded'
        };
      }

      // Create scan request in database
      const scan = await securityScanRequestService.createScanRequest({
        userId: data.userId,
        target: data.target,
        scanType: data.scanType,
        scheduledAt: data.scheduledAt
      });

      // Add to processing queue
      const scanJob: SecurityScanJob = {
        scanId: scan.id,
        userId: data.userId,
        target: data.target,
        scanType: normalizedScanType,
        configuration: data.configuration,
        priority: data.priority || 'normal'
      };

      await securityScanQueueService.addScan(scanJob);

      return { success: true, scanId: scan.id };

    } catch (error) {
      console.error('Error submitting security scan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get scan status
   */
  async getScanStatus(scanId: string): Promise<{
    scan?: SecurityScan;
    queueStatus?: {
      status: string;
      progress?: number;
      error?: string;
    };
    error?: string;
  }> {
    try {
      // Get scan from database
      const scan = await securityScanRequestService.getScan(scanId);
      if (!scan) {
        return { error: 'Scan not found' };
      }

      // Get queue status
      const queueStatus = await securityScanQueueService.getJobStatus(scanId);

      return {
        scan,
        queueStatus: queueStatus || undefined
      };

    } catch (error) {
      console.error('Error getting scan status:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's security scans
   */
  async getUserScans(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: ScanStatus;
      scanType?: SecurityScanType;
    } = {}
  ): Promise<{ scans: SecurityScan[]; total: number }> {
    return securityScanRequestService.getUserScans(userId, options);
  }

  /**
   * Cancel a scan
   */
  async cancelScan(scanId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify scan belongs to user
      const scan = await securityScanRequestService.getScan(scanId);
      if (!scan) {
        return { success: false, error: 'Scan not found' };
      }

      if (scan.userId !== userId) {
        return { success: false, error: 'Unauthorized' };
      }

      if (scan.status === 'completed' || scan.status === 'failed') {
        return { success: false, error: 'Scan already completed' };
      }

      // Cancel job in queue
      const cancelled = await securityScanQueueService.cancelJob(scanId);
      
      return { success: cancelled };

    } catch (error) {
      console.error('Error cancelling scan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's scan statistics
   */
  async getUserStats(
    userId: string,
    period: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<UserScanStats> {
    return securityScanRequestService.getUserScanStats(userId, period);
  }

  /**
   * Get queue statistics (admin only)
   */
  async getQueueStats(): Promise<ScanQueueStats> {
    return securityScanQueueService.getQueueStats();
  }

  /**
   * Get scan results with detailed vulnerability information
   */
  async getScanResults(scanId: string, userId?: string): Promise<{
    scan?: SecurityScan;
    error?: string;
  }> {
    try {
      const scan = await securityScanRequestService.getScan(scanId);
      if (!scan) {
        return { error: 'Scan not found' };
      }

      // Check authorization if userId provided
      if (userId && scan.userId !== userId) {
        return { error: 'Unauthorized' };
      }

      return { scan };

    } catch (error) {
      console.error('Error getting scan results:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Search CVE database
   */
  async searchCVEs(keyword: string, limit: number = 50) {
    return cveDatabase.searchCVEs(keyword, limit);
  }

  /**
   * Get CVE by ID
   */
  async getCVE(cveId: string) {
    return cveDatabase.getCVE(cveId);
  }

  /**
   * Get recent CVEs
   */
  async getRecentCVEs(days: number = 30, limit: number = 100) {
    return cveDatabase.getRecentCVEs(days, limit);
  }

  /**
   * Get system statistics (admin only)
   */
  async getSystemStats(): Promise<{
    scanStats: any;
    queueStats: ScanQueueStats;
    cveStats: any;
    scannerStats: any;
  }> {
    const [scanStats, queueStats, cveStats, scannerStats] = await Promise.all([
      securityScanRequestService.getScanStatistics(),
      this.getQueueStats(),
      cveDatabase.getCVEStats(),
      securityScannerRegistry.getScannerStats()
    ]);

    return {
      scanStats,
      queueStats,
      cveStats,
      scannerStats
    };
  }

  /**
   * Test scanner availability
   */
  async testScanner(scannerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const scanner = securityScannerRegistry.getScanner(scannerId);
      if (!scanner) {
        return { success: false, error: 'Scanner not found' };
      }

      if (!scanner.isActive) {
        return { success: false, error: 'Scanner is not active' };
      }

      // For now, just check if scanner is configured
      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update scanner configuration (admin only)
   */
  async updateScanner(scannerId: string, updates: any): Promise<{ success: boolean; error?: string }> {
    try {
      const updated = securityScannerRegistry.updateScanner(scannerId, updates);
      return { success: updated };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Cleanup old scans and jobs
   */
  async cleanup(): Promise<void> {
    try {
      // Cleanup old database records
      const deletedCount = await securityScanRequestService.cleanupOldScans(90);
      console.log(`🧹 Cleaned up ${deletedCount} old security scans`);

      // Cleanup queue jobs
      await securityScanQueueService.cleanupJobs();

      // Update CVE database if needed
      if (cveDatabase.needsUpdate()) {
        const updateResult = await cveDatabase.updateCVEDatabase();
        if (updateResult.success) {
          console.log(`🔄 CVE database updated: ${updateResult.updated} new entries`);
        }
      }

    } catch (error) {
      console.error('Error during security service cleanup:', error);
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    services: {
      queue: any;
      database: boolean;
      scanners: number;
    };
  }> {
    try {
      const [queueHealth, scannerStats] = await Promise.all([
        securityScanQueueService.getHealthStatus(),
        securityScannerRegistry.getScannerStats()
      ]);

      return {
        isHealthy: queueHealth.isHealthy && scannerStats.active > 0,
        services: {
          queue: queueHealth,
          database: true, // Assume healthy if no errors
          scanners: scannerStats.active
        }
      };
    } catch (error) {
      return {
        isHealthy: false,
        services: {
          queue: { isHealthy: false },
          database: false,
          scanners: 0
        }
      };
    }
  }
}

// Singleton instance
export const securityService = new SecurityServiceManager();