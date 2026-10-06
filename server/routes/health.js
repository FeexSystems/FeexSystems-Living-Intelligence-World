
import { checkDatabaseHealth } from '../lib/database';
import { checkRedisHealth } from '../lib/redis';

export async function handleHealthCheck(req, res) {
  try {
    const [dbHealth, redisHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth()
    ]);

    const overallStatus = dbHealth.status === 'healthy' && redisHealth.status === 'healthy'
      ? 'healthy'
      : 'unhealthy';

    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        redis: redisHealth
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthData);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function handleReadinessCheck(req, res) {
  try {
    const [dbHealth, redisHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth()
    ]);

    const isReady = dbHealth.status === 'healthy' && redisHealth.status === 'healthy';

    if (isReady) {
      res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        services: { database: dbHealth, redis: redisHealth }
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function handleLivenessCheck(_req, res) {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}

/**
 * Extended metrics endpoint — exposes process-level performance data for
 * the admin health dashboard. Does NOT require auth so Kubernetes/Cloud Run
 * probes can reach it, but is mounted at /health/metrics (not /api/admin)
 * and returns no user data.
 */
export async function handleMetrics(_req, res) {
  const mem = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  // Event loop lag heuristic: schedule a setTimeout(0) and measure actual delay
  const eventLoopLag = await new Promise((resolve) => {
    const start = Date.now();
    setImmediate(() => resolve(Date.now() - start));
  });

  res.status(200).json({
    timestamp: new Date().toISOString(),
    uptime_seconds: process.uptime(),
    node_version: process.version,
    pid: process.pid,
    memory: {
      rss_mb: +(mem.rss / 1024 / 1024).toFixed(2),
      heap_used_mb: +(mem.heapUsed / 1024 / 1024).toFixed(2),
      heap_total_mb: +(mem.heapTotal / 1024 / 1024).toFixed(2),
      external_mb: +(mem.external / 1024 / 1024).toFixed(2),
    },
    cpu: {
      user_ms: Math.round(cpuUsage.user / 1000),
      system_ms: Math.round(cpuUsage.system / 1000),
    },
    event_loop_lag_ms: eventLoopLag,
  });
}