import { Request, Response } from 'express';
import { logger } from '../lib/logging';

/**
 * Handle performance metrics from web-vitals library
 * Task 34: Phase 3, Sprint 9
 */
export async function handlePerformanceMetrics(req: Request, res: Response) {
  try {
    const payload = req.body;

    // Validate payload structure
    if (!payload || !payload.metrics) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Log metrics (in production, store in database or analytics service)
    logger.info('[Performance Metrics]', {
      url: payload.url,
      timestamp: payload.timestamp,
      metrics: payload.metrics,
    });

    // In production, store metrics in database or send to analytics service
    // For now, just acknowledge receipt
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('[Performance Metrics] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
