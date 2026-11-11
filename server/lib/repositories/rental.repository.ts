/** Rental Repository â€” handles property, unit, tenancy, and maintenance operations */

import { prisma } from '../database';
import { MaintenanceCategory, MaintenanceRequestStatus, PropertyStatus } from '@prisma/client';
import { PropertyDTO, MaintenanceRequestDTO } from '../../../shared/rental';

export interface RentalRepository {
  createProperty(tenantId: string, input: {
    name: string;
    address: string;
    ownerId: string;
    description?: string;
  }): Promise<PropertyDTO>;

  listProperties(tenantId: string): Promise<PropertyDTO[]>;

  getProperty(tenantId: string, propertyId: string): Promise<PropertyDTO | null>;

  updateProperty(tenantId: string, propertyId: string, input: {
    name?: string;
    address?: string;
    description?: string;
    status?: string;
  }): Promise<PropertyDTO | null>;

  createMaintenanceRequest(tenantId: string, input: {
    propertyId: string;
    title: string;
    description: string;
    category: MaintenanceCategory;
    priority: string;
    unitId?: string;
    tenancyId?: string;
  }): Promise<MaintenanceRequestDTO>;

  listMaintenanceRequests(tenantId: string): Promise<MaintenanceRequestDTO[]>;

  getMaintenanceRequest(tenantId: string, requestId: string): Promise<MaintenanceRequestDTO | null>;

  updateMaintenanceRequestStatus(tenantId: string, requestId: string, status: MaintenanceRequestStatus): Promise<MaintenanceRequestDTO | null>;
}

export class PrismaRentalRepository implements RentalRepository {
  async createProperty(tenantId: string, input: {
    name: string;
    address: string;
    ownerId: string;
    description?: string;
  }): Promise<PropertyDTO> {
    const property = await prisma.property.create({
      data: {
        teamId: tenantId,
        name: input.name,
        address: input.address,
        ownerId: input.ownerId,
        description: input.description,
        status: 'ACTIVE',
      }
    });
    return {
      id: property.id,
      teamId: property.teamId,
      name: property.name,
      address: property.address,
      status: property.status as PropertyDTO['status'],
      ownerId: property.ownerId,
      description: property.description,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    };
  }

  async listProperties(tenantId: string): Promise<PropertyDTO[]> {
    const properties = await prisma.property.findMany({
      where: { teamId: tenantId },
      orderBy: { createdAt: 'desc' }
    });
    return properties.map(p => ({
      id: p.id,
      teamId: p.teamId,
      name: p.name,
      address: p.address,
      status: p.status as PropertyDTO['status'],
      ownerId: p.ownerId,
      description: p.description,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  async getProperty(tenantId: string, propertyId: string): Promise<PropertyDTO | null> {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, teamId: tenantId }
    });
    if (!property) return null;
    return {
      id: property.id,
      teamId: property.teamId,
      name: property.name,
      address: property.address,
      status: property.status as PropertyDTO['status'],
      ownerId: property.ownerId,
      description: property.description,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    };
  }

  async updateProperty(tenantId: string, propertyId: string, input: {
    name?: string;
    address?: string;
    description?: string;
    status?: string;
  }): Promise<PropertyDTO | null> {
    const property = await prisma.property.update({
      // Scope the write to the caller's team — never update another tenant's row.
      where: { id: propertyId, teamId: tenantId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.address && { address: input.address }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.status && { status: input.status as PropertyStatus }),
        updatedAt: new Date(),
      }
    });
    return {
      id: property.id,
      teamId: property.teamId,
      name: property.name,
      address: property.address,
      status: property.status as PropertyDTO['status'],
      ownerId: property.ownerId,
      description: property.description,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    };
  }

  async createMaintenanceRequest(tenantId: string, input: {
    propertyId: string;
    title: string;
    description: string;
    category: MaintenanceCategory;
    priority: string;
    unitId?: string;
    tenancyId?: string;
  }): Promise<MaintenanceRequestDTO> {
    const request = await prisma.maintenanceRequest.create({
      data: {
        propertyId: input.propertyId,
        unitId: input.unitId ?? null,
        tenancyId: input.tenancyId ?? null,
        reportedByUserId: tenantId,
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority,
        status: 'OPEN',
      }
    });
    return {
      id: request.id,
      propertyId: request.propertyId,
      unitId: request.unitId,
      tenancyId: request.tenancyId,
      reportedByUserId: request.reportedByUserId,
      title: request.title,
      description: request.description,
      category: request.category as MaintenanceCategory,
      priority: request.priority,
      status: request.status as MaintenanceRequestStatus,
      aiProvider: request.aiProvider,
      aiModel: request.aiModel,
      aiRecommendation: request.aiRecommendation,
      confidence: request.confidence,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }

  async listMaintenanceRequests(tenantId: string): Promise<MaintenanceRequestDTO[]> {
    const requests = await prisma.maintenanceRequest.findMany({
      where: { reportedByUserId: tenantId },
      orderBy: { createdAt: 'desc' }
    });
    return requests.map(r => ({
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
    }));
  }

  async getMaintenanceRequest(tenantId: string, requestId: string): Promise<MaintenanceRequestDTO | null> {
    const request = await prisma.maintenanceRequest.findFirst({
      where: { id: requestId, reportedByUserId: tenantId }
    });
    if (!request) return null;
    return {
      id: request.id,
      propertyId: request.propertyId,
      unitId: request.unitId,
      tenancyId: request.tenancyId,
      reportedByUserId: request.reportedByUserId,
      title: request.title,
      description: request.description,
      category: request.category as MaintenanceCategory,
      priority: request.priority,
      status: request.status as MaintenanceRequestStatus,
      aiProvider: request.aiProvider,
      aiModel: request.aiModel,
      aiRecommendation: request.aiRecommendation,
      confidence: request.confidence,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }

  async updateMaintenanceRequestStatus(tenantId: string, requestId: string, status: MaintenanceRequestStatus): Promise<MaintenanceRequestDTO | null> {
    // Scope to the caller's team so a request id alone can't cross tenants.
    // MaintenanceRequest has no teamId of its own — ownership flows through
    // its property. `update` only accepts unique fields, so verify first.
    const owned = await prisma.maintenanceRequest.findFirst({
      where: { id: requestId, property: { teamId: tenantId } },
      select: { id: true },
    });
    if (!owned) return null;

    const request = await prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: { status }
    });
    return {
      id: request.id,
      propertyId: request.propertyId,
      unitId: request.unitId,
      tenancyId: request.tenancyId,
      reportedByUserId: request.reportedByUserId,
      title: request.title,
      description: request.description,
      category: request.category as MaintenanceCategory,
      priority: request.priority,
      status: request.status as MaintenanceRequestStatus,
      aiProvider: request.aiProvider,
      aiModel: request.aiModel,
      aiRecommendation: request.aiRecommendation,
      confidence: request.confidence,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }
}