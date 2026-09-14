
import { prisma } from '../database';
import { cacheService } from '../services/cache.service';
import { monitoringService } from './monitoring.service';
import os from 'os';



























class HealthService {
  

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Check database health
   */
   async checkDatabase() {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      
      return {
        status: latency < 100 ? 'healthy' : 'degraded',
        latency
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start
      };
    }
  }

  /**
   * Check Redis cache health
   */
   async checkCache() {
    const start = Date.now();
    try {
      await cacheService.set('health_check', 'ok', 10);
      await cacheService.get('health_check');
      const latency = Date.now() - start;
      
      return {
        status: latency < 50 ? 'healthy' : 'degraded',
        latency
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start
      };
    }
  }

  /**
   * Get system metrics
   */
   getSystemMetrics() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      cpu: os.loadavg()[0], // 1 minute load average
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory
      },
      load: os.loadavg()
    };
  }

  /**
   * Get overall health status
   */
  async getHealth() {
    const [dbHealth, cacheHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkCache()
    ]);

    const systemMetrics = this.getSystemMetrics();

    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Date.now() - this.startTime,
      services: {
        database: dbHealth,
        cache: cacheHealth,
        system: systemMetrics
      }
    };

    // Determine overall status
    if (dbHealth.status === 'unhealthy' || cacheHealth.status === 'unhealthy') {
      status.status = 'unhealthy';
    } else if (dbHealth.status === 'degraded' || cacheHealth.status === 'degraded') {
      status.status = 'degraded';
    }

    // Track metrics
    monitoringService.trackMetric('health_check', 1, {
      status: status.status,
      database_status: dbHealth.status,
      cache_status: cacheHealth.status
    });

    return status;
  }

  /**
   * Handle health check request
   */
  async handleHealthCheck(req, res) {
    try {
      const health = await this.getHealth();
      
      // Set appropriate status code
      const statusCode = health.status === 'healthy' ? 200 :
                        health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json(health);
    } catch (error) {
      monitoringService.trackError(error , { endpoint: '/health' });
      
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle readiness check request
   */
  async handleReadinessCheck(req, res) {
    try {
      const health = await this.getHealth();
      
      // For readiness, we only care if the service can handle requests
      const isReady = health.status !== 'unhealthy';
      
      res.status(isReady ? 200 : 503).json({
        ready: isReady,
        timestamp: new Date().toISOString(),
        checks: {
          database: health.services.database.status !== 'unhealthy',
          cache: health.services.cache.status !== 'unhealthy'
        }
      });
    } catch (error) {
      monitoringService.trackError(error , { endpoint: '/health/ready' });
      
      res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle liveness check request
   */
  handleLivenessCheck(req, res) {
    // For liveness, we just need to know if the process is running
    res.status(200).json({
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
}

export const healthService = new HealthService();
