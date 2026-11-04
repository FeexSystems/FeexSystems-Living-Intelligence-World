 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }










import { prisma } from '../database';
import { toIso } from '../utils/iso';
import { aiGateway } from './ai-gateway.service';
import {
  classifyMaintenanceDeterministically,
  MAINTENANCE_CLASSIFIER_SYSTEM_PROMPT,
  buildMaintenanceClassifierUserPrompt,
  parseMaintenanceClassification,
} from './rental-classifier';











function resolveProvider(rawProvider) {
  if (rawProvider === 'gemini' || rawProvider === 'openai') return rawProvider;
  return 'deterministic';
}

export class RentalServiceError extends Error {
  constructor(
    message,
     code,
     statusCode
  ) {
    super(message);this.code = code;this.statusCode = statusCode;;
    this.name = 'RentalServiceError';
  }
}




const toPropertyDTO = (p) => ({
  id: p.id,
  teamId: p.teamId,
  name: p.name,
  address: p.address,
  status: p.status ,
  ownerId: p.ownerId,
  description: p.description,
  createdAt: toIso(p.createdAt),
  updatedAt: toIso(p.updatedAt),
});

const toMaintenanceDTO = (r) => ({
  id: r.id,
  propertyId: r.propertyId,
  unitId: r.unitId,
  tenancyId: r.tenancyId,
  reportedByUserId: r.reportedByUserId,
  title: r.title,
  description: r.description,
  category: r.category ,
  priority: r.priority,
  status: r.status ,
  aiProvider: r.aiProvider,
  aiModel: r.aiModel,
  aiRecommendation: r.aiRecommendation,
  confidence: r.confidence,
  createdAt: toIso(r.createdAt),
  updatedAt: toIso(r.updatedAt),
});

export class RentalService {
  async createProperty(
    tenantId,
    input,
    actorUserId
  ) {
    const property = await prisma.property.create({
      data: {
        teamId: tenantId,
        // Migration anchor — distinct from `ownerId` (the property owner).
        createdByUserId: _nullishCoalesce(actorUserId, () => ( null)),
        name: input.name,
        address: input.address,
        ownerId: input.ownerId,
        description: _nullishCoalesce(input.description, () => ( null)),
      },
    });
    return toPropertyDTO(property );
  }

  async listProperties(tenantId) {
    const properties = await prisma.property.findMany({
      where: { teamId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return properties.map((p) => toPropertyDTO(p ));
  }

  async getProperty(tenantId, id) {
    const property = await prisma.property.findFirst({ where: { id, teamId: tenantId } });
    if (!property) throw new RentalServiceError('Property not found', 'PROPERTY_NOT_FOUND', 404);
    return toPropertyDTO(property );
  }

  async createPropertyUnit(tenantId, input) {
    const property = await prisma.property.findFirst({ where: { id: input.propertyId, teamId: tenantId } });
    if (!property) throw new RentalServiceError('Property not found', 'PROPERTY_NOT_FOUND', 404);
    return prisma.propertyUnit.create({
      data: {
        propertyId: input.propertyId,
        unitNumber: input.unitNumber,
        bedrooms: _nullishCoalesce(input.bedrooms, () => ( null)),
        bathrooms: _nullishCoalesce(input.bathrooms, () => ( null)),
        rentAmount: _nullishCoalesce(input.rentAmount, () => ( null)),
      },
    });
  }

  async listUnits(tenantId) {
    return prisma.propertyUnit.findMany({
      where: { property: { teamId: tenantId } },
      orderBy: { unitNumber: 'asc' },
    });
  }

  async createTenancy(tenantId, input) {
    const property = await prisma.property.findFirst({ where: { id: input.propertyId, teamId: tenantId } });
    if (!property) throw new RentalServiceError('Property not found', 'PROPERTY_NOT_FOUND', 404);
    return prisma.tenancy.create({
      data: {
        propertyId: input.propertyId,
        unitId: input.unitId,
        tenantUserId: input.tenantUserId,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        monthlyRent: _nullishCoalesce(input.monthlyRent, () => ( null)),
      },
    });
  }

  async listTenancies(tenantId) {
    return prisma.tenancy.findMany({
      where: { property: { teamId: tenantId } },
      orderBy: { startDate: 'desc' },
    });
  }

  async createMaintenanceRequest(
    tenantId,
    input
  ) {
    const property = await prisma.property.findFirst({ where: { id: input.propertyId, teamId: tenantId } });
    if (!property) throw new RentalServiceError('Property not found', 'PROPERTY_NOT_FOUND', 404);

    const existing = await prisma.maintenanceRequest.findFirst({
      where: {
        reportedByUserId: tenantId,
        title: input.title,
        description: input.description,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
    });
    if (existing) return toMaintenanceDTO(existing );

    const request = await prisma.maintenanceRequest.create({
      data: {
        propertyId: input.propertyId,
        unitId: _nullishCoalesce(input.unitId, () => ( null)),
        tenancyId: _nullishCoalesce(input.tenancyId, () => ( null)),
        reportedByUserId: tenantId,
        title: input.title,
        description: input.description,
        category: input.category ,
        priority: input.priority,
        status: 'OPEN',
      },
    });

    // Classify via AI gateway with deterministic fallback. Never fail the create
    // because classification failed — the request is still valid without it.
    let classification = classifyMaintenanceDeterministically({
      title: input.title,
      description: input.description,
      category: input.category,
    });
    let provider = 'deterministic';
    let model = null;

    try {
      const aiResult = await aiGateway.generateObject(
        MAINTENANCE_CLASSIFIER_SYSTEM_PROMPT,
        buildMaintenanceClassifierUserPrompt({
          title: input.title,
          description: input.description,
          category: input.category,
        }),
        { temperature: 0.1, maxTokens: 1200 }
      );

      if (_optionalChain([aiResult, 'optionalAccess', _ => _.object])) {
        const parsed = parseMaintenanceClassification(aiResult.object);
        if (parsed) {
          classification = parsed;
          provider = resolveProvider(aiResult.provider);
          model = _nullishCoalesce(aiResult.model, () => ( null));
        }
      }
    } catch (error) {
      console.warn('[rental] classification failed, using deterministic fallback', error);
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id: request.id },
      data: {
        aiProvider: provider,
        aiModel: model,
        aiRecommendation: classification.recommendedAction,
        confidence: classification.confidence,
      },
    });

    return toMaintenanceDTO(updated );
  }

  async listMaintenanceRequests(tenantId) {
    const requests = await prisma.maintenanceRequest.findMany({
      where: { reportedByUserId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((r) => toMaintenanceDTO(r ));
  }

  async getMaintenanceRequest(tenantId, id) {
    const request = await prisma.maintenanceRequest.findFirst({ where: { id, reportedByUserId: tenantId } });
    if (!request) throw new RentalServiceError('Maintenance request not found', 'MAINTENANCE_REQUEST_NOT_FOUND', 404);
    return toMaintenanceDTO(request );
  }

  async updateMaintenanceRequestStatus(
    tenantId,
    id,
    status
  ) {
    const request = await prisma.maintenanceRequest.findFirst({ where: { id, reportedByUserId: tenantId } });
    if (!request) throw new RentalServiceError('Maintenance request not found', 'MAINTENANCE_REQUEST_NOT_FOUND', 404);
    const updated = await prisma.maintenanceRequest.update({ where: { id }, data: { status } });
    return toMaintenanceDTO(updated );
  }
}

export const rentalService = new RentalService();
