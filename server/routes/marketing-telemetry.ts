import express from 'express';
import { z } from 'zod';
import { MarketingTelemetryService, MarketingEventSchema } from '../lib/marketing/telemetry.service';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();
const telemetryService = new MarketingTelemetryService(prisma);

// We might want to use authMiddleware here if these events are internal,
// but some events (like page views) might be anonymous.
// For now, we'll allow public ingestion but validate strictly.

/**
 * POST /api/marketing/telemetry/events
 * Ingest a new marketing event
 */
router.post('/events', async (req, res) => {
  try {
    const data = MarketingEventSchema.parse(req.body);
    const event = await telemetryService.ingestEvent(data);
    
    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Failed to ingest marketing event:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.errors });
    } else {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
});

/**
 * GET /api/marketing/telemetry/events/entity/:entityType/:entityId
 * Get recent events for a specific entity
 */
router.get('/events/entity/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    // Validate entityType
    if (!['product', 'asset', 'campaign', 'channel', 'worldModelProject'].includes(entityType)) {
      return res.status(400).json({ success: false, error: 'Invalid entity type' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    const events = await telemetryService.getEventsByEntity(
      entityType as 'product' | 'asset' | 'campaign' | 'channel' | 'worldModelProject', 
      entityId, 
      limit
    );

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Failed to fetch entity events:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/marketing/telemetry/stats
 * Get event statistics within a time window
 */
router.get('/stats', async (req, res) => {
  try {
    // Default to last 30 days if not provided
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = await telemetryService.getEventCounts(startDate, endDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Failed to fetch event stats:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
