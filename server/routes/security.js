 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import express from 'express';

import { authMiddleware } from '../lib/middleware/auth.middleware';
import { rateLimit } from 'express-rate-limit';
import { securityService } from '../lib/services/security.service';
import {
  securityScanRequestSchema,
  scanQuerySchema,
  cveSearchSchema,
  validateScanTarget,
  sanitizeScanConfiguration
} from '../lib/validations/security';
import { securityCronService } from '../lib/services/security-cron.service';
import { vulnerabilityReportingService } from '../lib/services/vulnerability-reporting.service';
import { vulnerabilityAlertingService } from '../lib/services/vulnerability-alerting.service';
import { vulnerabilityRemediationService } from '../lib/services/vulnerability-remediation.service';

const router = express.Router();

// Apply authentication to all security routes
router.use(authMiddleware);

/**
 * POST /api/security/scan
 * Initiate a new security scan
 */
router.post('/scan',
  rateLimit({ windowMs: 60 * 1000, limit: 10 }), // 10 scans per minute
  async (req, res) => {
    try {
      // Validate request body
      const validation = securityScanRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors
        });
      }

      const { target, scanType, configuration, scheduledAt, priority } = validation.data;
      const userId = req.user.id;

      // Additional target validation
      const targetValidation = validateScanTarget(target);
      if (!targetValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid scan target',
          details: targetValidation.errors
        });
      }

      // Sanitize configuration if provided
      const sanitizedConfig = configuration ? sanitizeScanConfiguration(configuration) : undefined;

      // Parse scheduled date if provided
      const scheduledDate = scheduledAt ? new Date(scheduledAt) : undefined;

      // Validate scheduled date is in the future
      if (scheduledDate && scheduledDate <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Scheduled time must be in the future'
        });
      }

      // Submit the scan
      const result = await securityService.submitScan({
        userId,
        target: target ,
        scanType,
        configuration: sanitizedConfig,
        scheduledAt: scheduledDate,
        priority
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: {
          scanId: result.scanId,
          status: 'queued',
          message: scheduledDate ? 'Scan scheduled successfully' : 'Scan initiated successfully'
        }
      });

    } catch (error) {
      console.error('Error initiating security scan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate security scan'
      });
    }
  }
);

/**
 * GET /api/security/scans
 * Get user's security scan history
 */
router.get('/scans', async (req, res) => {
  try {
    // Validate query parameters
    const queryValidation = scanQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: queryValidation.error.errors
      });
    }

    const { limit = 20, offset = 0, status, scanType } = queryValidation.data;
    const userId = req.user.id;

    // Get user's scans
    const result = await securityService.getUserScans(userId, {
      limit,
      offset,
      status,
      scanType
    });

    res.json({
      success: true,
      data: {
        scans: result.scans,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: offset + limit < result.total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching security scans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security scans'
    });
  }
});

/**
 * GET /api/security/scan/:id/results
 * Get detailed scan results
 */
router.get('/scan/:id/results', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Validate scan ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid scan ID'
      });
    }

    const result = await securityService.getScanResults(id, userId);

    if (result.error) {
      const statusCode = result.error === 'Scan not found' ? 404 :
        result.error === 'Unauthorized' ? 403 : 400;
      return res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }

    if (!result.scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found'
      });
    }

    res.json({
      success: true,
      data: {
        scan: result.scan,
        hasResults: !!result.scan.results,
        completedAt: result.scan.completedAt
      }
    });

  } catch (error) {
    console.error('Error fetching scan results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scan results'
    });
  }
});

/**
 * GET /api/security/scan/:id/status
 * Get scan status and progress
 */
router.get('/scan/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Validate scan ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid scan ID'
      });
    }

    const result = await securityService.getScanStatus(id);

    if (result.error) {
      return res.status(404).json({
        success: false,
        error: result.error
      });
    }

    // Check if scan belongs to user
    if (_optionalChain([result, 'access', _ => _.scan, 'optionalAccess', _2 => _2.userId]) !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to scan'
      });
    }

    res.json({
      success: true,
      data: {
        scan: result.scan,
        queueStatus: result.queueStatus
      }
    });

  } catch (error) {
    console.error('Error fetching scan status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scan status'
    });
  }
});

/**
 * DELETE /api/security/scan/:id
 * Cancel a security scan
 */
router.delete('/scan/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Validate scan ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid scan ID'
      });
    }

    const result = await securityService.cancelScan(id, userId);

    if (!result.success) {
      const statusCode = result.error === 'Scan not found' ? 404 :
        result.error === 'Unauthorized' ? 403 : 400;
      return res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Scan cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling security scan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel security scan'
    });
  }
});

/**
 * GET /api/security/scanners
 * Get available security scanners
 */
router.get('/scanners', async (req, res) => {
  try {
    const scanners = securityService.getAvailableScanners();

    res.json({
      success: true,
      data: {
        scanners,
        total: scanners.length
      }
    });
  } catch (error) {
    console.error('Error fetching security scanners:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security scanners'
    });
  }
});

/**
 * GET /api/security/scanners/:scanType
 * Get scanners by scan type
 */
router.get('/scanners/:scanType', async (req, res) => {
  try {
    const { scanType } = req.params;

    // Validate scan type
    const validScanTypes = ['VULNERABILITY', 'PENETRATION', 'COMPLIANCE'];
    if (!validScanTypes.includes(scanType.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scan type. Must be one of: ' + validScanTypes.join(', ')
      });
    }

    const scanners = securityService.getScannersByScanType(scanType.toUpperCase() );

    res.json({
      success: true,
      data: {
        scanners,
        scanType,
        total: scanners.length
      }
    });
  } catch (error) {
    console.error('Error fetching scanners by type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scanners'
    });
  }
});

/**
 * GET /api/security/stats
 * Get user's security scan statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const period = (req.query.period ) || 'day';

    // Validate period
    const validPeriods = ['hour', 'day', 'week', 'month'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Must be one of: ' + validPeriods.join(', ')
      });
    }

    const stats = await securityService.getUserStats(userId, period );

    res.json({
      success: true,
      data: {
        stats,
        period
      }
    });

  } catch (error) {
    console.error('Error fetching security stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security statistics'
    });
  }
});

/**
 * GET /api/security/cve/search
 * Search CVE database
 */
router.get('/cve/search', async (req, res) => {
  try {
    // Validate query parameters
    const validation = cveSearchSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid search parameters',
        details: validation.error.errors
      });
    }

    const { keyword, limit = 50 } = validation.data;

    const results = await securityService.searchCVEs(keyword, limit);

    res.json({
      success: true,
      data: {
        cves: results,
        keyword,
        total: results.length
      }
    });

  } catch (error) {
    console.error('Error searching CVEs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search CVE database'
    });
  }
});

/**
 * GET /api/security/cve/:id
 * Get specific CVE information
 */
router.get('/cve/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate CVE ID format
    const cveIdRegex = /^CVE-\d{4}-\d{4,}$/;
    if (!cveIdRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid CVE ID format. Expected format: CVE-YYYY-NNNN'
      });
    }

    const cve = await securityService.getCVE(id);

    if (!cve) {
      return res.status(404).json({
        success: false,
        error: 'CVE not found'
      });
    }

    res.json({
      success: true,
      data: { cve }
    });

  } catch (error) {
    console.error('Error fetching CVE:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch CVE information'
    });
  }
});

/**
 * GET /api/security/cve/recent
 * Get recent CVEs
 */
router.get('/cve/recent', async (req, res) => {
  try {
    const days = parseInt(req.query.days ) || 30;
    const limit = parseInt(req.query.limit ) || 100;

    // Validate parameters
    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        error: 'Days must be between 1 and 365'
      });
    }

    if (limit < 1 || limit > 500) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 500'
      });
    }

    const cves = await securityService.getRecentCVEs(days, limit);

    res.json({
      success: true,
      data: {
        cves,
        days,
        total: cves.length
      }
    });

  } catch (error) {
    console.error('Error fetching recent CVEs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent CVEs'
    });
  }
});

/**
 * GET /api/security/scanner/:id/test
 * Test scanner availability
 */
router.get('/scanner/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await securityService.testScanner(id);

    res.json({
      success: true,
      data: {
        scannerId: id,
        available: result.success,
        error: result.error
      }
    });

  } catch (error) {
    console.error('Error testing scanner:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test scanner'
    });
  }
});

// Admin routes (require admin role)
/**
 * GET /api/security/admin/queue/stats
 * Get queue statistics (admin only)
 */
router.get('/admin/queue/stats', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const stats = await securityService.getQueueStats();

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('Error fetching queue stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue statistics'
    });
  }
});

/**
 * GET /api/security/admin/system/stats
 * Get system statistics (admin only)
 */
router.get('/admin/system/stats', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const stats = await securityService.getSystemStats();

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system statistics'
    });
  }
});

/**
 * GET /api/security/admin/health
 * Get service health status (admin only)
 */
router.get('/admin/health', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const health = await securityService.getHealthStatus();

    res.json({
      success: true,
      data: { health }
    });

  } catch (error) {
    console.error('Error fetching health status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch health status'
    });
  }
});

/**
 * PUT /api/security/admin/scanner/:id
 * Update scanner configuration (admin only)
 */
router.put('/admin/scanner/:id', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { id } = req.params;
    const updates = req.body;

    // Basic validation
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid update data'
      });
    }

    const result = await securityService.updateScanner(id, updates);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Scanner updated successfully'
    });

  } catch (error) {
    console.error('Error updating scanner:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update scanner'
    });
  }
});

// Scheduled scanning endpoints

/**
 * POST /api/security/schedule
 * Create a recurring scan schedule
 */
router.post('/schedule',
  rateLimit({ windowMs: 60 * 1000, limit: 5 }), // 5 schedules per minute
  async (req, res) => {
    try {
      const { target, scanType, cronExpression, configuration, isActive } = req.body;
      const userId = req.user.id;

      // Validate required fields
      if (!target || !scanType || !cronExpression) {
        return res.status(400).json({
          success: false,
          error: 'Target, scan type, and cron expression are required'
        });
      }

      // Validate target
      const targetValidation = validateScanTarget(target);
      if (!targetValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid scan target',
          details: targetValidation.errors
        });
      }

      // Validate scan type
      const validScanTypes = ['VULNERABILITY', 'PENETRATION', 'COMPLIANCE'];
      if (!validScanTypes.includes(scanType.toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid scan type. Must be one of: ' + validScanTypes.join(', ')
        });
      }

      // Sanitize configuration if provided
      const sanitizedConfig = configuration ? sanitizeScanConfiguration(configuration) : undefined;

      const result = await securityCronService.createRecurringScan({
        userId,
        target,
        scanType: scanType.toUpperCase(),
        cronExpression,
        configuration: sanitizedConfig,
        isActive
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: {
          scheduleId: result.scheduleId,
          message: 'Recurring scan schedule created successfully'
        }
      });

    } catch (error) {
      console.error('Error creating recurring scan schedule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create recurring scan schedule'
      });
    }
  }
);

/**
 * DELETE /api/security/schedule/:id
 * Stop a recurring scan schedule
 */
router.delete('/schedule/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Validate schedule ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid schedule ID'
      });
    }

    // TODO: Add authorization check to ensure user owns the schedule
    // For now, we'll let the service handle this

    const result = await securityCronService.stopRecurringScan(id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Recurring scan schedule stopped successfully'
    });

  } catch (error) {
    console.error('Error stopping recurring scan schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop recurring scan schedule'
    });
  }
});

/**
 * GET /api/security/admin/cron/status
 * Get cron service status (admin only)
 */
router.get('/admin/cron/status', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const status = securityCronService.getStatus();

    res.json({
      success: true,
      data: { status }
    });

  } catch (error) {
    console.error('Error fetching cron status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cron status'
    });
  }
});

// Vulnerability Reporting and Dashboard Endpoints

/**
 * GET /api/security/dashboard
 * Get vulnerability dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    const timeframe = (req.query.timeframe ) || '30d';

    // Validate timeframe
    const validTimeframes = ['7d', '30d', '90d'];
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timeframe. Must be one of: ' + validTimeframes.join(', ')
      });
    }

    const dashboardData = await vulnerabilityReportingService.getDashboardData(userId, timeframe );

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching vulnerability dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vulnerability dashboard data'
    });
  }
});

/**
 * GET /api/security/vulnerability-trends
 * Get vulnerability trends over time
 */
router.get('/vulnerability-trends', async (req, res) => {
  try {
    const userId = req.user.id;
    const period = (req.query.period ) || '30d';

    // Validate period
    const validPeriods = ['7d', '30d', '90d'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Must be one of: ' + validPeriods.join(', ')
      });
    }

    const trends = await vulnerabilityReportingService.getVulnerabilityTrends(userId, period );

    res.json({
      success: true,
      data: trends
    });

  } catch (error) {
    console.error('Error fetching vulnerability trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vulnerability trends'
    });
  }
});

/**
 * GET /api/security/vulnerability-report
 * Get detailed vulnerability report with filters
 */
router.get('/vulnerability-report', async (req, res) => {
  try {
    const userId = req.user.id;
    const { severity, scanType, startDate, endDate, components } = req.query;

    const filters = {};

    // Parse severity filter
    if (severity) {
      filters.severity = Array.isArray(severity) ? severity : [severity];
    }

    // Parse scan type filter
    if (scanType) {
      filters.scanType = Array.isArray(scanType) ? scanType : [scanType];
    }

    // Parse date range
    if (startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate ),
        end: new Date(endDate )
      };
    }

    // Parse components filter
    if (components) {
      filters.components = Array.isArray(components) ? components : [components];
    }

    const report = await vulnerabilityReportingService.getVulnerabilityReport(userId, filters);

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Error generating vulnerability report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate vulnerability report'
    });
  }
});

/**
 * POST /api/security/compliance-report
 * Generate compliance report for a specific framework
 */
router.post('/compliance-report', async (req, res) => {
  try {
    const userId = req.user.id;
    const { framework, startDate, endDate } = req.body;

    // Validate required fields
    if (!framework || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Framework, start date, and end date are required'
      });
    }

    // Validate framework
    const validFrameworks = ['SOC2', 'ISO27001', 'PCI_DSS', 'HIPAA', 'GDPR'];
    if (!validFrameworks.includes(framework)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid framework. Must be one of: ' + validFrameworks.join(', ')
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    if (start >= end) {
      return res.status(400).json({
        success: false,
        error: 'Start date must be before end date'
      });
    }

    const report = await vulnerabilityReportingService.generateComplianceReport(
      userId,
      framework,
      { startDate: start, endDate: end }
    );

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate compliance report'
    });
  }
});

// Vulnerability Alerting Endpoints

/**
 * GET /api/security/alerts
 * Get user's vulnerability alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, severity, limit = 50, offset = 0 } = req.query;

    const filters = {
      limit: parseInt(limit ),
      offset: parseInt(offset )
    };

    if (status) {
      filters.status = status;
    }

    if (severity) {
      filters.severity = Array.isArray(severity) ? severity : [severity];
    }

    const result = await vulnerabilityAlertingService.getUserAlerts(userId, filters);

    res.json({
      success: true,
      data: {
        alerts: result.alerts,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: filters.offset + filters.limit < result.total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts'
    });
  }
});

/**
 * POST /api/security/alert-rules
 * Create a new alert rule
 */
router.post('/alert-rules', async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, conditions, actions, isActive = true } = req.body;

    // Validate required fields
    if (!name || !conditions || !actions) {
      return res.status(400).json({
        success: false,
        error: 'Name, conditions, and actions are required'
      });
    }

    // Validate conditions array
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one condition is required'
      });
    }

    // Validate actions array
    if (!Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one action is required'
      });
    }

    const rule = await vulnerabilityAlertingService.createAlertRule(userId, {
      name,
      description,
      conditions,
      actions,
      isActive
    });

    res.status(201).json({
      success: true,
      data: rule
    });

  } catch (error) {
    console.error('Error creating alert rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert rule'
    });
  }
});

/**
 * GET /api/security/alert-rules
 * Get user's alert rules
 */
router.get('/alert-rules', async (req, res) => {
  try {
    const userId = req.user.id;
    const rules = await vulnerabilityAlertingService.getAlertRules(userId);

    res.json({
      success: true,
      data: {
        rules,
        total: rules.length
      }
    });

  } catch (error) {
    console.error('Error fetching alert rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert rules'
    });
  }
});

/**
 * PUT /api/security/alert-rules/:id
 * Update an alert rule
 */
router.put('/alert-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate rule ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid rule ID'
      });
    }

    const updatedRule = await vulnerabilityAlertingService.updateAlertRule(id, updates);

    if (!updatedRule) {
      return res.status(404).json({
        success: false,
        error: 'Alert rule not found'
      });
    }

    res.json({
      success: true,
      data: updatedRule
    });

  } catch (error) {
    console.error('Error updating alert rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update alert rule'
    });
  }
});

/**
 * DELETE /api/security/alert-rules/:id
 * Delete an alert rule
 */
router.delete('/alert-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate rule ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid rule ID'
      });
    }

    const deleted = await vulnerabilityAlertingService.deleteAlertRule(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Alert rule not found'
      });
    }

    res.json({
      success: true,
      message: 'Alert rule deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting alert rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete alert rule'
    });
  }
});

/**
 * PUT /api/security/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.put('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Validate alert ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid alert ID'
      });
    }

    const acknowledged = await vulnerabilityAlertingService.acknowledgeAlert(id, userId);

    if (!acknowledged) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found or already acknowledged'
      });
    }

    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });

  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
});

/**
 * PUT /api/security/alerts/:id/resolve
 * Resolve an alert
 */
router.put('/alerts/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Validate alert ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid alert ID'
      });
    }

    const resolved = await vulnerabilityAlertingService.resolveAlert(id, userId);

    if (!resolved) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found or already resolved'
      });
    }

    res.json({
      success: true,
      message: 'Alert resolved successfully'
    });

  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert'
    });
  }
});

/**
 * GET /api/security/notification-templates
 * Get available notification templates
 */
router.get('/notification-templates', async (req, res) => {
  try {
    const templates = vulnerabilityAlertingService.getNotificationTemplates();

    res.json({
      success: true,
      data: {
        templates,
        total: templates.length
      }
    });

  } catch (error) {
    console.error('Error fetching notification templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification templates'
    });
  }
});

/**
 * POST /api/security/notification-templates
 * Create a custom notification template
 */
router.post('/notification-templates', async (req, res) => {
  try {
    const { name, type, subject, body, variables } = req.body;

    // Validate required fields
    if (!name || !type || !body) {
      return res.status(400).json({
        success: false,
        error: 'Name, type, and body are required'
      });
    }

    // Validate type
    const validTypes = ['email', 'slack', 'webhook'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Must be one of: ' + validTypes.join(', ')
      });
    }

    const template = await vulnerabilityAlertingService.createNotificationTemplate({
      name,
      type,
      subject: subject || '',
      body,
      variables: variables || []
    });

    res.status(201).json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('Error creating notification template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification template'
    });
  }
});

// Vulnerability Remediation Endpoints

/**
 * GET /api/security/remediation/tickets
 * Get remediation tickets for the user
 */
router.get('/remediation/tickets', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, priority, severity, assignedTo, tags, limit = 50, offset = 0 } = req.query;

    const filters = {
      limit: parseInt(limit ),
      offset: parseInt(offset )
    };

    if (status) {
      filters.status = Array.isArray(status) ? status : [status];
    }

    if (priority) {
      filters.priority = Array.isArray(priority) ? priority : [priority];
    }

    if (severity) {
      filters.severity = Array.isArray(severity) ? severity : [severity];
    }

    if (assignedTo) {
      filters.assignedTo = assignedTo;
    }

    if (tags) {
      filters.tags = Array.isArray(tags) ? tags : [tags];
    }

    const result = await vulnerabilityRemediationService.getRemediationTickets(userId, filters);

    res.json({
      success: true,
      data: {
        tickets: result.tickets,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: filters.offset + filters.limit < result.total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching remediation tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch remediation tickets'
    });
  }
});

/**
 * POST /api/security/remediation/tickets
 * Create a remediation ticket from a vulnerability
 */
router.post('/remediation/tickets', async (req, res) => {
  try {
    const userId = req.user.id;
    const { vulnerability, scanId, assignedTo, priority, dueDate, tags, notes } = req.body;

    // Validate required fields
    if (!vulnerability || !scanId) {
      return res.status(400).json({
        success: false,
        error: 'Vulnerability and scan ID are required'
      });
    }

    // Validate vulnerability object
    if (!vulnerability.id || !vulnerability.title || !vulnerability.severity) {
      return res.status(400).json({
        success: false,
        error: 'Invalid vulnerability object. Must include id, title, and severity'
      });
    }

    const options = {};

    if (assignedTo) options.assignedTo = assignedTo;
    if (priority) options.priority = priority;
    if (dueDate) options.dueDate = new Date(dueDate);
    if (tags) options.tags = Array.isArray(tags) ? tags : [tags];
    if (notes) options.notes = notes;

    const ticket = await vulnerabilityRemediationService.createRemediationTicket(
      userId,
      vulnerability,
      scanId,
      options
    );

    res.status(201).json({
      success: true,
      data: ticket
    });

  } catch (error) {
    console.error('Error creating remediation ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create remediation ticket'
    });
  }
});

/**
 * POST /api/security/remediation/tickets/bulk
 * Bulk create remediation tickets from scan results
 */
router.post('/remediation/tickets/bulk', async (req, res) => {
  try {
    const userId = req.user.id;
    const { scanId, vulnerabilities, autoAssign, defaultAssignee, priorityOverride, tags } = req.body;

    // Validate required fields
    if (!scanId || !vulnerabilities || !Array.isArray(vulnerabilities)) {
      return res.status(400).json({
        success: false,
        error: 'Scan ID and vulnerabilities array are required'
      });
    }

    if (vulnerabilities.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one vulnerability is required'
      });
    }

    const options = {};
    if (autoAssign) options.autoAssign = autoAssign;
    if (defaultAssignee) options.defaultAssignee = defaultAssignee;
    if (priorityOverride) options.priorityOverride = priorityOverride;
    if (tags) options.tags = Array.isArray(tags) ? tags : [tags];

    const tickets = await vulnerabilityRemediationService.bulkCreateTickets(
      userId,
      scanId,
      vulnerabilities,
      options
    );

    res.status(201).json({
      success: true,
      data: {
        tickets,
        count: tickets.length
      }
    });

  } catch (error) {
    console.error('Error bulk creating remediation tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk create remediation tickets'
    });
  }
});

/**
 * PUT /api/security/remediation/tickets/:id
 * Update a remediation ticket
 */
router.put('/remediation/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate ticket ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticket ID'
      });
    }

    // Parse date fields if provided
    if (updates.dueDate) {
      updates.dueDate = new Date(updates.dueDate);
    }

    const updatedTicket = await vulnerabilityRemediationService.updateRemediationTicket(id, updates);

    if (!updatedTicket) {
      return res.status(404).json({
        success: false,
        error: 'Remediation ticket not found'
      });
    }

    res.json({
      success: true,
      data: updatedTicket
    });

  } catch (error) {
    console.error('Error updating remediation ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update remediation ticket'
    });
  }
});

/**
 * POST /api/security/remediation/tickets/:id/notes
 * Add a note to a remediation ticket
 */
router.post('/remediation/tickets/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { content, isInternal = false } = req.body;

    // Validate ticket ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticket ID'
      });
    }

    // Validate content
    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Note content is required'
      });
    }

    const note = await vulnerabilityRemediationService.addNote(id, userId, content, isInternal);

    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Remediation ticket not found'
      });
    }

    res.status(201).json({
      success: true,
      data: note
    });

  } catch (error) {
    console.error('Error adding note to remediation ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add note to remediation ticket'
    });
  }
});

/**
 * GET /api/security/remediation/tickets/:id/progress
 * Get remediation progress for a ticket
 */
router.get('/remediation/tickets/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ticket ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticket ID'
      });
    }

    const progress = await vulnerabilityRemediationService.getProgress(id);

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Progress tracking not found for this ticket'
      });
    }

    res.json({
      success: true,
      data: progress
    });

  } catch (error) {
    console.error('Error fetching remediation progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch remediation progress'
    });
  }
});

/**
 * PUT /api/security/remediation/tickets/:id/progress
 * Update remediation progress for a ticket
 */
router.put('/remediation/tickets/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { completedSteps, currentStep, blockers, estimatedCompletion } = req.body;

    // Validate ticket ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticket ID'
      });
    }

    const updates = {};
    if (completedSteps !== undefined) updates.completedSteps = parseInt(completedSteps);
    if (currentStep) updates.currentStep = currentStep;
    if (blockers) updates.blockers = Array.isArray(blockers) ? blockers : [blockers];
    if (estimatedCompletion) updates.estimatedCompletion = new Date(estimatedCompletion);

    const progress = await vulnerabilityRemediationService.updateProgress(id, updates);

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Progress tracking not found for this ticket'
      });
    }

    res.json({
      success: true,
      data: progress
    });

  } catch (error) {
    console.error('Error updating remediation progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update remediation progress'
    });
  }
});

/**
 * GET /api/security/remediation/metrics
 * Get remediation metrics for the user
 */
router.get('/remediation/metrics', async (req, res) => {
  try {
    const userId = req.user.id;
    const timeframe = (req.query.timeframe ) || '30d';

    // Validate timeframe
    const validTimeframes = ['7d', '30d', '90d'];
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timeframe. Must be one of: ' + validTimeframes.join(', ')
      });
    }

    const metrics = await vulnerabilityRemediationService.getRemediationMetrics(userId, timeframe );

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Error fetching remediation metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch remediation metrics'
    });
  }
});

/**
 * GET /api/security/remediation/templates
 * Get available remediation templates
 */
router.get('/remediation/templates', async (req, res) => {
  try {
    const templates = vulnerabilityRemediationService.getRemediationTemplates();

    res.json({
      success: true,
      data: {
        templates,
        total: templates.length
      }
    });

  } catch (error) {
    console.error('Error fetching remediation templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch remediation templates'
    });
  }
});

/**
 * GET /api/security/remediation/templates/:id
 * Get a specific remediation template
 */
router.get('/remediation/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate template ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }

    const template = vulnerabilityRemediationService.getRemediationTemplate(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Remediation template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('Error fetching remediation template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch remediation template'
    });
  }
});

/**
 * POST /api/security/remediation/templates
 * Create a custom remediation template
 */
router.post('/remediation/templates', async (req, res) => {
  try {
    const { name, description, vulnerabilityType, severity, steps, estimatedEffort, requiredSkills, tools, references } = req.body;

    // Validate required fields
    if (!name || !vulnerabilityType || !severity || !steps) {
      return res.status(400).json({
        success: false,
        error: 'Name, vulnerability type, severity, and steps are required'
      });
    }

    // Validate steps array
    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one step is required'
      });
    }

    const template = await vulnerabilityRemediationService.createRemediationTemplate({
      name,
      description: description || '',
      vulnerabilityType,
      severity,
      steps,
      estimatedEffort: estimatedEffort || 0,
      requiredSkills: requiredSkills || [],
      tools: tools || [],
      references: references || []
    });

    res.status(201).json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('Error creating remediation template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create remediation template'
    });
  }
});

/**
 * POST /api/security/remediation/report
 * Generate remediation report for a specific period
 */
router.post('/remediation/report', async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.body;

    // Validate required fields
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    if (start >= end) {
      return res.status(400).json({
        success: false,
        error: 'Start date must be before end date'
      });
    }

    const report = await vulnerabilityRemediationService.generateRemediationReport(
      userId,
      { startDate: start, endDate: end }
    );

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Error generating remediation report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate remediation report'
    });
  }
});

export default router;