import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Define the incoming event schema
export const MarketingEventSchema = z.object({
  worldModelProjectId: z.string().optional(),
  productId: z.string().optional(),
  assetId: z.string().optional(),
  campaignId: z.string().optional(),
  channelId: z.string().optional(),
  eventType: z.string().min(1),
  metadata: z.record(z.any()).default({}),
});

export type CreateMarketingEventDto = z.infer<typeof MarketingEventSchema>;

export class MarketingTelemetryService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Ingest a new marketing event
   */
  async ingestEvent(data: CreateMarketingEventDto) {
    // Validate payload
    const validatedData = MarketingEventSchema.parse(data);

    // Persist event to the append-only store
    const event = await this.prisma.marketingEvent.create({
      data: {
        worldModelProjectId: validatedData.worldModelProjectId,
        productId: validatedData.productId,
        assetId: validatedData.assetId,
        campaignId: validatedData.campaignId,
        channelId: validatedData.channelId,
        eventType: validatedData.eventType,
        metadata: validatedData.metadata,
      }
    });

    // In a real production setup, we might also queue this event
    // for background processing (e.g. updating aggregate metrics).
    // For now, it's just persisted in the DB.

    return event;
  }

  /**
   * Query events for a specific entity
   */
  async getEventsByEntity(entityType: 'product' | 'asset' | 'campaign' | 'channel' | 'worldModelProject', entityId: string, limit = 50) {
    const where: any = {};
    
    switch(entityType) {
      case 'product': where.productId = entityId; break;
      case 'asset': where.assetId = entityId; break;
      case 'campaign': where.campaignId = entityId; break;
      case 'channel': where.channelId = entityId; break;
      case 'worldModelProject': where.worldModelProjectId = entityId; break;
    }

    return this.prisma.marketingEvent.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: limit
    });
  }

  /**
   * Get global event counts by type within a time window
   */
  async getEventCounts(startDate: Date, endDate: Date) {
    const events = await this.prisma.marketingEvent.groupBy({
      by: ['eventType'],
      where: {
        occurredAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      }
    });

    return events.reduce((acc, curr) => {
      acc[curr.eventType] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);
  }
}
