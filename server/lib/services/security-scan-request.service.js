 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

import { cveDatabase } from './cve-database.service';

/**
 * Security Scan Request Service - Manages security scan database operations
 */
export class SecurityScanRequestService {
  constructor( prisma) {;this.prisma = prisma;}

  /**
   * Create a new security scan request
   */
  async createScanRequest(data




) {
    const scan = await this.prisma.securityScan.create({
      data: {
        userId: data.userId,
        targetData: data.target ,
        scanType: data.scanType,
        status: 'QUEUED',
        scheduledAt: data.scheduledAt,
      },
    });

    return this.mapPrismaToSecurityScan(scan);
  }

  /**
   * Get scan by ID
   */
  async getScan(scanId) {
    const scan = await this.prisma.securityScan.findUnique({
      where: { id: scanId },
    });

    return scan ? this.mapPrismaToSecurityScan(scan) : null;
  }

  /**
   * Get user's scans
   */
  async getUserScans(
    userId,
    options




 = {}
  ) {
    const where = { userId };
    
    if (options.status) {
      where.status = options.status;
    }
    
    if (options.scanType) {
      where.scanType = options.scanType;
    }

    const [scans, total] = await Promise.all([
      this.prisma.securityScan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.securityScan.count({ where }),
    ]);

    return {
      scans: scans.map(scan => this.mapPrismaToSecurityScan(scan)),
      total,
    };
  }

  /**
   * Update scan status
   */
  async updateScanStatus(
    scanId,
    status,
    additionalData




  ) {
    const updateData = { status };

    if (_optionalChain([additionalData, 'optionalAccess', _ => _.startedAt])) {
      updateData.startedAt = additionalData.startedAt;
    }

    if (_optionalChain([additionalData, 'optionalAccess', _2 => _2.completedAt])) {
      updateData.completedAt = additionalData.completedAt;
    }

    if (_optionalChain([additionalData, 'optionalAccess', _3 => _3.results])) {
      // Enrich vulnerabilities with CVE data
      const enrichedResults = { ...additionalData.results };
      enrichedResults.vulnerabilities = enrichedResults.vulnerabilities.map(vuln =>
        cveDatabase.enrichVulnerability(vuln)
      );
      
      updateData.results = enrichedResults ;
    }

    const scan = await this.prisma.securityScan.update({
      where: { id: scanId },
      data: updateData,
    });

    return this.mapPrismaToSecurityScan(scan);
  }

  /**
   * Check rate limits for user
   */
  async checkRateLimit(
    userId,
    scanType,
    limits
  ) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check hourly limit
    const hourlyCount = await this.prisma.securityScan.count({
      where: {
        userId,
        scanType,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (hourlyCount >= limits.maxScansPerHour) {
      const resetTime = new Date(oneHourAgo.getTime() + 60 * 60 * 1000);
      return {
        allowed: false,
        reason: `Hourly limit exceeded (${hourlyCount}/${limits.maxScansPerHour})`,
        resetTime,
      };
    }

    // Check daily limit
    const dailyCount = await this.prisma.securityScan.count({
      where: {
        userId,
        scanType,
        createdAt: { gte: oneDayAgo },
      },
    });

    if (dailyCount >= limits.maxScansPerDay) {
      const resetTime = new Date(oneDayAgo.getTime() + 24 * 60 * 60 * 1000);
      return {
        allowed: false,
        reason: `Daily limit exceeded (${dailyCount}/${limits.maxScansPerDay})`,
        resetTime,
      };
    }

    return { allowed: true };
  }

  /**
   * Get user scan statistics
   */
  async getUserScanStats(
    userId,
    period = 'day'
  ) {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const scans = await this.prisma.securityScan.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
    });

    const stats = {
      totalScans: scans.length,
      completedScans: scans.filter(s => s.status === 'COMPLETED').length,
      failedScans: scans.filter(s => s.status === 'FAILED').length,
      pendingScans: scans.filter(s => s.status === 'QUEUED').length,
      runningScans: scans.filter(s => s.status === 'RUNNING').length,
      vulnerabilitiesFound: 0,
      criticalVulnerabilities: 0,
    };

    // Calculate vulnerability statistics
    scans.forEach(scan => {
      if (scan.results && typeof scan.results === 'object') {
        const results = scan.results ;
        if (results.summary) {
          stats.vulnerabilitiesFound += results.summary.totalVulnerabilities || 0;
          stats.criticalVulnerabilities += results.summary.criticalCount || 0;
        }
      }
    });

    // Get last scan date
    const lastScan = await this.prisma.securityScan.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (lastScan) {
      stats.lastScanDate = lastScan.createdAt;
    }

    return stats;
  }

  /**
   * Get scheduled scans that are ready to run
   */
  async getScheduledScans() {
    const now = new Date();
    
    const scans = await this.prisma.securityScan.findMany({
      where: {
        status: 'QUEUED',
        scheduledAt: {
          lte: now,
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return scans.map(scan => this.mapPrismaToSecurityScan(scan));
  }

  /**
   * Delete old completed scans
   */
  async cleanupOldScans(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.securityScan.deleteMany({
      where: {
        status: { in: ['COMPLETED', 'FAILED'] },
        completedAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }

  /**
   * Get scan statistics for admin dashboard
   */
  async getScanStatistics()




 {
    const [totalScans, statusCounts, typeCounts] = await Promise.all([
      this.prisma.securityScan.count(),
      this.prisma.securityScan.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.securityScan.groupBy({
        by: ['scanType'],
        _count: { scanType: true },
      }),
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentScans = await this.prisma.securityScan.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    // Group by date
    const activityMap = new Map();
    recentScans.forEach(scan => {
      const date = scan.createdAt.toISOString().split('T')[0];
      activityMap.set(date, (activityMap.get(date) || 0) + 1);
    });

    const recentActivity = Array.from(activityMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total: totalScans,
      byStatus: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} ),
      byType: typeCounts.reduce((acc, item) => {
        acc[item.scanType] = item._count.scanType;
        return acc;
      }, {} ),
      recentActivity,
    };
  }

  /**
   * Map Prisma SecurityScan to our SecurityScan interface
   */
   mapPrismaToSecurityScan(scan) {
    return {
      id: scan.id,
      userId: scan.userId,
      target: scan.targetData ,
      scanType: scan.scanType.toLowerCase() ,
      status: scan.status.toLowerCase() ,
      results: scan.results ,
      scheduledAt: scan.scheduledAt || undefined,
      startedAt: scan.startedAt || undefined,
      completedAt: scan.completedAt || undefined,
      createdAt: scan.createdAt,
    };
  }
}

// Create service instance with Prisma client
import { PrismaClient as PrismaClientType } from '@prisma/client';
const prisma = new PrismaClientType();
export const securityScanRequestService = new SecurityScanRequestService(prisma);