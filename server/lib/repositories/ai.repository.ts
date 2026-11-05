/** AI Repository — handles AI service and model operations */

import { prisma } from '../database';
import { AiService, AiModel, AiProvider } from '@prisma/client';

export interface AiRepository {
  getService(name: string): Promise<AiService | null>;

  listServices(): Promise<AiService[]>;

  updateServiceStatus(name: string, status: 'healthy' | 'unhealthy' | 'degraded'): Promise<AiService>;

  recordUsage(service: string, model: string, tokens: number, cost: number, requestId?: string): Promise<void>;

  getModelPreferences(model: string): Promise<AiModel | null>;

  listAvailableModels(): Promise<AiModel[]>;
}

export class PrismaAiRepository implements AiRepository {
  async getService(name: string): Promise<AiService | null> {
    return prisma.ai_service.findFirst({ where: { name } });
  }

  async listServices(): Promise<AiService[]> {
    return prisma.ai_service.findMany();
  }

  async updateServiceStatus(name: string, status: 'healthy' | 'unhealthy' | 'degraded'): Promise<AiService> {
    return prisma.ai_service.update({
      where: { name },
      data: { status, last_checked_at: new Date() }
    });
  }

  async recordUsage(service: string, model: string, tokens: number, cost: number, requestId?: string): Promise<void> {
    await prisma.aI_usage_log.create({
      data: {
        service: service,
        model,
        tokens,
        cost,
        request_id: requestId,
        recorded_at: new Date(),
      }
    });
  }

  async getModelPreferences(model: string): Promise<AiModel | null> {
    return prisma.ai_model.findFirst({ where: { name: model } });
  }

  async listAvailableModels(): Promise<AiModel[]> {
    return prisma.ai_model.findMany({ where: { available: true } });
  }
}