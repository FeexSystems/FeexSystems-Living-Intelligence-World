/**
 * FarmPlug AI service (Mission 004).
 *
 * Tenant-scoped farm, plot, observation and advisory-request management.
 * Advisory text is generated through the provider-neutral aiGateway with a
 * deterministic fallback; it is a recommendation, never an authorisation.
 */

import {
  AdvisoryRequestStatus,
  CropPlotStatus,
  ObservationSeverity,
  ObservationType,
} from '@prisma/client';
import { prisma } from '../database';
import { aiGateway } from './ai-gateway.service';
import {
  CreateAdvisoryRequestInput,
  CreateCropPlotInput,
  CreateFarmInput,
  CreateFarmObservationInput,
} from '../validations/rental';
import {
  AdvisoryRequestDTO,
  CropPlotDTO,
  FarmDTO,
  FarmObservationDTO,
} from '../../../shared/rental';

export class FarmPlugError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'FarmPlugError';
  }
}

type FarmRow = { id: string; teamId: string; name: string; location: string | null; size: string | null; primaryCrop: string | null; status: string; createdAt: Date; updatedAt: Date };
type PlotRow = { id: string; farmId: string; name: string; cropType: string | null; plantedAt: Date | null; area: string | null; status: string; createdAt: Date; updatedAt: Date };
type ObservationRow = { id: string; plotId: string; reportedByUserId: string; observationType: string; description: string; severity: string; observedAt: Date; createdAt: Date };
type AdvisoryRow = { id: string; plotId: string; reportedByUserId: string; question: string; observations: string | null; advisoryText: string | null; aiProvider: string | null; aiModel: string | null; confidence: number | null; status: string; createdAt: Date; updatedAt: Date };

const toFarmDTO = (f: FarmRow): FarmDTO => ({
  id: f.id,
  teamId: f.teamId,
  name: f.name,
  location: f.location,
  size: f.size,
  primaryCrop: f.primaryCrop,
  status: f.status as FarmDTO['status'],
  createdAt: f.createdAt.toISOString(),
  updatedAt: f.updatedAt.toISOString(),
});

const toPlotDTO = (p: PlotRow): CropPlotDTO => ({
  id: p.id,
  farmId: p.farmId,
  name: p.name,
  cropType: p.cropType,
  plantedAt: p.plantedAt ? p.plantedAt.toISOString() : null,
  area: p.area,
  status: p.status as CropPlotStatus,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

const toObservationDTO = (o: ObservationRow): FarmObservationDTO => ({
  id: o.id,
  plotId: o.plotId,
  reportedByUserId: o.reportedByUserId,
  observationType: o.observationType as ObservationType,
  description: o.description,
  severity: o.severity as ObservationSeverity,
  observedAt: o.observedAt.toISOString(),
  createdAt: o.createdAt.toISOString(),
});

const toAdvisoryDTO = (r: AdvisoryRow): AdvisoryRequestDTO => ({
  id: r.id,
  plotId: r.plotId,
  reportedByUserId: r.reportedByUserId,
  question: r.question,
  observations: r.observations,
  advisoryText: r.advisoryText,
  aiProvider: r.aiProvider,
  aiModel: r.aiModel,
  confidence: r.confidence,
  status: r.status as AdvisoryRequestStatus,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

const ADVISORY_SYSTEM_PROMPT = [
  'You are an agricultural advisory assistant.',
  'Provide practical, cautious guidance based only on the supplied observation.',
  'Never give pesticide, chemical, dosage or regulatory instructions.',
  'Always recommend consulting a local agronomist for site-specific decisions.',
  'Return ONLY JSON: { "advisoryText": string, "confidence": number 0..1 }',
].join('\n');

export class FarmPlugService {
  async createFarm(tenantId: string, input: CreateFarmInput): Promise<FarmDTO> {
    const farm = await prisma.farm.create({
      data: {
        teamId: tenantId,
        name: input.name,
        location: input.location ?? null,
        size: input.size ?? null,
        primaryCrop: input.primaryCrop ?? null,
      },
    });
    return toFarmDTO(farm as FarmRow);
  }

  async listFarms(tenantId: string): Promise<FarmDTO[]> {
    const farms = await prisma.farm.findMany({ where: { teamId: tenantId }, orderBy: { createdAt: 'desc' } });
    return farms.map((f) => toFarmDTO(f as FarmRow));
  }

  async getFarm(tenantId: string, id: string): Promise<FarmDTO> {
    const farm = await prisma.farm.findFirst({ where: { id, teamId: tenantId } });
    if (!farm) throw new FarmPlugError('Farm not found', 'FARM_NOT_FOUND', 404);
    return toFarmDTO(farm as FarmRow);
  }

  async createCropPlot(tenantId: string, input: CreateCropPlotInput): Promise<CropPlotDTO> {
    const farm = await prisma.farm.findFirst({ where: { id: input.farmId, teamId: tenantId } });
    if (!farm) throw new FarmPlugError('Farm not found', 'FARM_NOT_FOUND', 404);
    const plot = await prisma.cropPlot.create({
      data: {
        farmId: input.farmId,
        name: input.name,
        cropType: input.cropType ?? null,
        plantedAt: input.plantedAt ? new Date(input.plantedAt) : null,
        area: input.area ?? null,
      },
    });
    return toPlotDTO(plot as PlotRow);
  }

  async listPlots(tenantId: string): Promise<CropPlotDTO[]> {
    const plots = await prisma.cropPlot.findMany({
      where: { farm: { teamId: tenantId } },
      orderBy: { createdAt: 'desc' },
    });
    return plots.map((p) => toPlotDTO(p as PlotRow));
  }

  async createObservation(tenantId: string, input: CreateFarmObservationInput): Promise<FarmObservationDTO> {
    const plot = await prisma.cropPlot.findFirst({ where: { id: input.plotId, farm: { teamId: tenantId } } });
    if (!plot) throw new FarmPlugError('Plot not found', 'PLOT_NOT_FOUND', 404);
    const observation = await prisma.farmObservation.create({
      data: {
        plotId: input.plotId,
        reportedByUserId: tenantId,
        observationType: input.observationType as ObservationType,
        description: input.description,
        severity: (input.severity as ObservationSeverity) ?? 'MEDIUM',
        observedAt: new Date(),
      },
    });
    return toObservationDTO(observation as ObservationRow);
  }

  async listObservations(tenantId: string): Promise<FarmObservationDTO[]> {
    const observations = await prisma.farmObservation.findMany({
      where: { plot: { farm: { teamId: tenantId } } },
      orderBy: { observedAt: 'desc' },
    });
    return observations.map((o) => toObservationDTO(o as ObservationRow));
  }

  async createAdvisoryRequest(tenantId: string, input: CreateAdvisoryRequestInput): Promise<AdvisoryRequestDTO> {
    const plot = await prisma.cropPlot.findFirst({ where: { id: input.plotId, farm: { teamId: tenantId } } });
    if (!plot) throw new FarmPlugError('Plot not found', 'PLOT_NOT_FOUND', 404);

    const existing = await prisma.advisoryRequest.findFirst({
      where: {
        reportedByUserId: tenantId,
        question: input.question,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
    });
    if (existing) return toAdvisoryDTO(existing as AdvisoryRow);

    const ai = await aiGateway.generateObject<{ advisoryText: string; confidence: number }>(
      ADVISORY_SYSTEM_PROMPT,
      [
        `Plot: ${plot.name}`,
        `Crop: ${plot.cropType ?? 'unknown'}`,
        `Question: ${input.question}`,
        `Observations: ${input.observations ?? 'none provided'}`,
      ].join('\n'),
      { temperature: 0.2, maxTokens: 1000, correlationId: `advisory-${input.idempotencyKey}` }
    );

    const advisoryText =
      ai?.object?.advisoryText ??
      `We recommend consulting a local agricultural extension officer for a site-specific assessment of "${input.question}". Monitor the condition, document changes, and avoid applying treatments without professional advice.`;
    const confidence = ai?.object?.confidence ?? 0;
    const aiProvider = ai?.provider ?? 'deterministic';

    const request = await prisma.advisoryRequest.create({
      data: {
        plotId: input.plotId,
        reportedByUserId: tenantId,
        question: input.question,
        observations: input.observations ?? null,
        advisoryText,
        aiProvider,
        aiModel: ai?.model ?? null,
        confidence,
        status: 'PENDING',
      },
    });
    return toAdvisoryDTO(request as AdvisoryRow);
  }

  async listAdvisoryRequests(tenantId: string): Promise<AdvisoryRequestDTO[]> {
    const requests = await prisma.advisoryRequest.findMany({
      where: { reportedByUserId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((r) => toAdvisoryDTO(r as AdvisoryRow));
  }

  async getAdvisoryRequest(tenantId: string, id: string): Promise<AdvisoryRequestDTO> {
    const request = await prisma.advisoryRequest.findFirst({ where: { id, reportedByUserId: tenantId } });
    if (!request) throw new FarmPlugError('Advisory request not found', 'ADVISORY_REQUEST_NOT_FOUND', 404);
    return toAdvisoryDTO(request as AdvisoryRow);
  }
}

export const farmPlugService = new FarmPlugService();

