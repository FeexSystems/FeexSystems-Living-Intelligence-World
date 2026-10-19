/**
 * RentAll SmartOps service (Mission 004).
 *
 * Tenant-scoped property, unit, tenancy and maintenance-request management.
 * `teamId` is always derived from the verified Firebase token.
 */

import {
  MaintenanceCategory,
  MaintenanceRequestStatus,
} from '@prisma/client';
import { prisma } from '../database';
import {
  CreateMaintenanceRequestInput,
  CreatePropertyInput,
  CreatePropertyUnitInput,
  CreateTenancyInput,
} from '../validations/rental';
import {
  MaintenanceRequestDTO,
  PropertyDTO,
} from '../../../shared/rental';

export class RentalServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'RentalServiceError';
  }
}

type PropertyRow = { id: string; teamId: string; name: string; address: string; status: string; ownerId: string; description: string | null; createdAt: Date; updatedAt: Date };
type MaintenanceRow = { id: string; propertyId: string; unitId: string | null; tenancyId: string | null; reportedByUserId: string; title: string; description: string; category: string; priority: string; status: string; aiProvider: string | null; aiModel: string | null; aiRecommendation: string | null; confidence: number | null; createdAt: Date; updatedAt: Date };

const toPropertyDTO = (p: PropertyRow): PropertyDTO => ({
  id: p.id,
  teamId: p.teamId,
  name: p.name,
  address: p.address,
  status: p.status as PropertyDTO['status'],
  ownerId: p.ownerId,
  description: p.description,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

const toMaintenanceDTO = (r: MaintenanceRow): MaintenanceRequestDTO => ({
  id: r.id,
  propertyId: r.propertyId,
  unitId: r.unitId,
  tenancyId: r.tenancyId,
  reportedByUserId: r.reportedByUserId,
  title: r.title,
  description: r.description,
  category: r.category as MaintenanceCategory,
  priority: r.priority,
  status: r.status as MaintenanceRequestStatus,
  aiProvider: r.aiProvider,
  aiModel: r.aiModel,
  aiRecommendation: r.aiRecommendation,
  confidence: r.confidence,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export class RentalService {
  async createProperty(tenantId: string, input: CreatePropertyInput): Promise<PropertyDTO> {
    const property = await prisma.property.create({
      data: {
        teamId: tenantId,
        name: input.name,
        address: input.address,
        ownerId: input.ownerId,
        description: input.description ?? null,
      },
    });
    return toPropertyDTO(property as PropertyRow);
  }

  async listProperties(tenantId: string): Promise<PropertyDTO[]> {
    const properties = await prisma.property.findMany({
      where: { teamId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return properties.map((p) => toPropertyDTO(p as PropertyRow));
  }

  async getProperty(tenantId: string, id: string): Promise<PropertyDTO> {
    const property = await prisma.property.findFirst({ where: { id, teamId: tenantId } });
    if (!property) throw new RentalServiceError('Property not found', 'PROPERTY_NOT_FOUND', 404);
    return toPropertyDTO(property as PropertyRow);
  }

  async createPropertyUnit(tenantId: string, input: CreatePropertyUnitInput) {
    const property = await prisma.property.findFirst({ where: { id: input.propertyId, teamId: tenantId } });
    if (!property) throw new RentalServiceError('Property not found', 'PROPERTY_NOT_FOUND', 404);
    return prisma.propertyUnit.create({
      data: {
        propertyId: input.propertyId,
        unitNumber: input.unitNumber,
        bedrooms: input.bedrooms ?? null,
        bathrooms: input.bathrooms ?? null,
        rentAmount: input.rentAmount ?? null,
      },
    });
  }

  async listUnits(tenantId: string) {
    return prisma.propertyUnit.findMany({
      where: { property: { teamId: tenantId } },
      orderBy: { unitNumber: 'asc' },
    });
  }

  async createTenancy(tenantId: string, input: CreateTenancyInput) {
    const property = await prisma.property.findFirst({ where: { id: input.propertyId, teamId: tenantId } });
    if (!property) throw new RentalServiceError('Property not found', 'PROPERTY_NOT_FOUND', 404);
    return prisma.tenancy.create({
      data: {
        propertyId: input.propertyId,
        unitId: input.unitId,
        tenantUserId: input.tenantUserId,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        monthlyRent: input.monthlyRent ?? null,
      },
    });
  }

  async listTenancies(tenantId: string) {
    return prisma.tenancy.findMany({
      where: { property: { teamId: tenantId } },
      orderBy: { startDate: 'desc' },
    });
  }

  async createMaintenanceRequest(tenantId: string, input: CreateMaintenanceRequestInput): Promise<MaintenanceRequestDTO> {
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
    if (existing) return toMaintenanceDTO(existing as MaintenanceRow);

    const request = await prisma.maintenanceRequest.create({
      data: {
        propertyId: input.propertyId,
        unitId: input.unitId ?? null,
        tenancyId: input.tenancyId ?? null,
        reportedByUserId: tenantId,
        title: input.title,
        description: input.description,
        category: input.category as MaintenanceCategory,
        priority: input.priority,
        status: 'OPEN',
      },
    });
    return toMaintenanceDTO(request as MaintenanceRow);
  }

  async listMaintenanceRequests(tenantId: string): Promise<MaintenanceRequestDTO[]> {
    const requests = await prisma.maintenanceRequest.findMany({
      where: { reportedByUserId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((r) => toMaintenanceDTO(r as MaintenanceRow));
  }

  async getMaintenanceRequest(tenantId: string, id: string): Promise<MaintenanceRequestDTO> {
    const request = await prisma.maintenanceRequest.findFirst({ where: { id, reportedByUserId: tenantId } });
    if (!request) throw new RentalServiceError('Maintenance request not found', 'MAINTENANCE_REQUEST_NOT_FOUND', 404);
    return toMaintenanceDTO(request as MaintenanceRow);
  }

  async updateMaintenanceRequestStatus(
    tenantId: string,
    id: string,
    status: MaintenanceRequestStatus
  ): Promise<MaintenanceRequestDTO> {
    const request = await prisma.maintenanceRequest.findFirst({ where: { id, reportedByUserId: tenantId } });
    if (!request) throw new RentalServiceError('Maintenance request not found', 'MAINTENANCE_REQUEST_NOT_FOUND', 404);
    const updated = await prisma.maintenanceRequest.update({ where: { id }, data: { status } });
    return toMaintenanceDTO(updated as MaintenanceRow);
  }
}

export const rentalService = new RentalService();
