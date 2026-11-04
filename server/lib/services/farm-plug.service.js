 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }













import { prisma } from '../database';
import { toIso, toIsoOrNull } from '../utils/iso';
import { aiGateway } from './ai-gateway.service';













export class FarmPlugError extends Error {
  constructor(
    message,
     code,
     statusCode
  ) {
    super(message);this.code = code;this.statusCode = statusCode;;
    this.name = 'FarmPlugError';
  }
}






const toFarmDTO = (f) => ({
  id: f.id,
  teamId: f.teamId,
  name: f.name,
  location: f.location,
  size: f.size,
  primaryCrop: f.primaryCrop,
  status: f.status ,
  createdAt: toIso(f.createdAt),
  updatedAt: toIso(f.updatedAt),
});

const toPlotDTO = (p) => ({
  id: p.id,
  farmId: p.farmId,
  name: p.name,
  cropType: p.cropType,
  plantedAt: toIsoOrNull(p.plantedAt),
  area: p.area,
  status: p.status ,
  createdAt: toIso(p.createdAt),
  updatedAt: toIso(p.updatedAt),
});

const toObservationDTO = (o) => ({
  id: o.id,
  plotId: o.plotId,
  reportedByUserId: o.reportedByUserId,
  observationType: o.observationType ,
  description: o.description,
  severity: o.severity ,
  observedAt: toIso(o.observedAt),
  createdAt: toIso(o.createdAt),
});

const toAdvisoryDTO = (r) => ({
  id: r.id,
  plotId: r.plotId,
  reportedByUserId: r.reportedByUserId,
  question: r.question,
  observations: r.observations,
  advisoryText: r.advisoryText,
  aiProvider: r.aiProvider,
  aiModel: r.aiModel,
  confidence: r.confidence,
  status: r.status ,
  createdAt: toIso(r.createdAt),
  updatedAt: toIso(r.updatedAt),
});

const ADVISORY_SYSTEM_PROMPT = [
  'You are an agricultural advisory assistant.',
  'Provide practical, cautious guidance based only on the supplied observation.',
  'Never give pesticide, chemical, dosage or regulatory instructions.',
  'Always recommend consulting a local agronomist for site-specific decisions.',
  'Return ONLY JSON: { "advisoryText": string, "confidence": number 0..1 }',
].join('\n');

export class FarmPlugService {
  async createFarm(tenantId, input, actorUserId) {
    const farm = await prisma.farm.create({
      data: {
        teamId: tenantId,
        // Migration anchor for the tenant-key reconciliation.
        createdByUserId: _nullishCoalesce(actorUserId, () => ( null)),
        name: input.name,
        location: _nullishCoalesce(input.location, () => ( null)),
        size: _nullishCoalesce(input.size, () => ( null)),
        primaryCrop: _nullishCoalesce(input.primaryCrop, () => ( null)),
      },
    });
    return toFarmDTO(farm );
  }

  async listFarms(tenantId) {
    const farms = await prisma.farm.findMany({ where: { teamId: tenantId }, orderBy: { createdAt: 'desc' } });
    return farms.map((f) => toFarmDTO(f ));
  }

  async getFarm(tenantId, id) {
    const farm = await prisma.farm.findFirst({ where: { id, teamId: tenantId } });
    if (!farm) throw new FarmPlugError('Farm not found', 'FARM_NOT_FOUND', 404);
    return toFarmDTO(farm );
  }

  async createCropPlot(tenantId, input) {
    const farm = await prisma.farm.findFirst({ where: { id: input.farmId, teamId: tenantId } });
    if (!farm) throw new FarmPlugError('Farm not found', 'FARM_NOT_FOUND', 404);
    const plot = await prisma.cropPlot.create({
      data: {
        farmId: input.farmId,
        name: input.name,
        cropType: _nullishCoalesce(input.cropType, () => ( null)),
        plantedAt: input.plantedAt ? new Date(input.plantedAt) : null,
        area: _nullishCoalesce(input.area, () => ( null)),
      },
    });
    return toPlotDTO(plot );
  }

  async listPlots(tenantId) {
    const plots = await prisma.cropPlot.findMany({
      where: { farm: { teamId: tenantId } },
      orderBy: { createdAt: 'desc' },
    });
    return plots.map((p) => toPlotDTO(p ));
  }

  async createObservation(tenantId, input) {
    const plot = await prisma.cropPlot.findFirst({ where: { id: input.plotId, farm: { teamId: tenantId } } });
    if (!plot) throw new FarmPlugError('Plot not found', 'PLOT_NOT_FOUND', 404);
    const observation = await prisma.farmObservation.create({
      data: {
        plotId: input.plotId,
        reportedByUserId: tenantId,
        observationType: input.observationType ,
        description: input.description,
        severity: _nullishCoalesce((input.severity ), () => ( 'MEDIUM')),
        observedAt: new Date(),
      },
    });
    return toObservationDTO(observation );
  }

  async listObservations(tenantId) {
    const observations = await prisma.farmObservation.findMany({
      where: { plot: { farm: { teamId: tenantId } } },
      orderBy: { observedAt: 'desc' },
    });
    return observations.map((o) => toObservationDTO(o ));
  }

  async createAdvisoryRequest(tenantId, input) {
    const plot = await prisma.cropPlot.findFirst({ where: { id: input.plotId, farm: { teamId: tenantId } } });
    if (!plot) throw new FarmPlugError('Plot not found', 'PLOT_NOT_FOUND', 404);

    const existing = await prisma.advisoryRequest.findFirst({
      where: {
        reportedByUserId: tenantId,
        question: input.question,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
    });
    if (existing) return toAdvisoryDTO(existing );

    const ai = await aiGateway.generateObject(
      ADVISORY_SYSTEM_PROMPT,
      [
        `Plot: ${plot.name}`,
        `Crop: ${_nullishCoalesce(plot.cropType, () => ( 'unknown'))}`,
        `Question: ${input.question}`,
        `Observations: ${_nullishCoalesce(input.observations, () => ( 'none provided'))}`,
      ].join('\n'),
      { temperature: 0.2, maxTokens: 1000, correlationId: `advisory-${input.idempotencyKey}` }
    );

    const advisoryText =
      _nullishCoalesce(_optionalChain([ai, 'optionalAccess', _ => _.object, 'optionalAccess', _2 => _2.advisoryText]), () => (
      `We recommend consulting a local agricultural extension officer for a site-specific assessment of "${input.question}". Monitor the condition, document changes, and avoid applying treatments without professional advice.`));
    const confidence = _nullishCoalesce(_optionalChain([ai, 'optionalAccess', _3 => _3.object, 'optionalAccess', _4 => _4.confidence]), () => ( 0));
    const aiProvider = _nullishCoalesce(_optionalChain([ai, 'optionalAccess', _5 => _5.provider]), () => ( 'deterministic'));

    const request = await prisma.advisoryRequest.create({
      data: {
        plotId: input.plotId,
        reportedByUserId: tenantId,
        question: input.question,
        observations: _nullishCoalesce(input.observations, () => ( null)),
        advisoryText,
        aiProvider,
        aiModel: _nullishCoalesce(_optionalChain([ai, 'optionalAccess', _6 => _6.model]), () => ( null)),
        confidence,
        status: 'PENDING',
      },
    });
    return toAdvisoryDTO(request );
  }

  async listAdvisoryRequests(tenantId) {
    const requests = await prisma.advisoryRequest.findMany({
      where: { reportedByUserId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((r) => toAdvisoryDTO(r ));
  }

  async getAdvisoryRequest(tenantId, id) {
    const request = await prisma.advisoryRequest.findFirst({ where: { id, reportedByUserId: tenantId } });
    if (!request) throw new FarmPlugError('Advisory request not found', 'ADVISORY_REQUEST_NOT_FOUND', 404);
    return toAdvisoryDTO(request );
  }
}

export const farmPlugService = new FarmPlugService();

