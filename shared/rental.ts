/**
 * RentAll SmartOps — domain contracts (Mission 004).
 *
 * Shared between client and server. These types mirror the Prisma models
 * without importing generated Prisma code into the browser bundle.
 */

export const PROPERTY_STATUSES = ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'VACANT'];
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const PROPERTY_UNIT_STATUSES = ['VACANT', 'OCCUPIED', 'MAINTENANCE'];
export type PropertyUnitStatus = (typeof PROPERTY_UNIT_STATUSES)[number];

export const TENANCY_STATUSES = ['PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED'];
export type TenancyStatus = (typeof TENANCY_STATUSES)[number];

export const MAINTENANCE_CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'HVAC', 'STRUCTURAL', 'PEST_CONTROL', 'OTHER'];
export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];

export const MAINTENANCE_REQUEST_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
export type MaintenanceRequestStatus = (typeof MAINTENANCE_REQUEST_STATUSES)[number];

export interface PropertyDTO {
  id: string;
  teamId: string;
  name: string;
  address: string;
  status: PropertyStatus;
  ownerId: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyUnitDTO {
  id: string;
  propertyId: string;
  unitNumber: string;
  status: PropertyUnitStatus;
  bedrooms: number | null;
  bathrooms: number | null;
  rentAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenancyDTO {
  id: string;
  propertyId: string;
  unitId: string;
  tenantUserId: string;
  startDate: string;
  endDate: string;
  status: TenancyStatus;
  monthlyRent: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceRequestDTO {
  id: string;
  propertyId: string;
  unitId: string | null;
  tenancyId: string | null;
  reportedByUserId: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: string;
  status: MaintenanceRequestStatus;
  aiProvider: string | null;
  aiModel: string | null;
  aiRecommendation: string | null;
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePropertyInput {
  name: string;
  address: string;
  ownerId: string;
  description?: string;
}

export interface CreatePropertyUnitInput {
  propertyId: string;
  unitNumber: string;
  bedrooms?: number;
  bathrooms?: number;
  rentAmount?: number;
}

export interface CreateTenancyInput {
  propertyId: string;
  unitId: string;
  tenantUserId: string;
  startDate: string;
  endDate: string;
  monthlyRent?: number;
}

export interface CreateMaintenanceRequestInput {
  propertyId: string;
  unitId?: string;
  tenancyId?: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority?: string;
  idempotencyKey: string;
}

export interface MaintenanceRequestListResponse {
  requests: MaintenanceRequestDTO[];
  total: number;
}

export interface PropertyListResponse {
  properties: PropertyDTO[];
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// FarmPlug AI — domain contracts
// ─────────────────────────────────────────────────────────────────────────────

export const FARM_STATUSES = ['ACTIVE', 'INACTIVE'];
export type FarmStatus = (typeof FARM_STATUSES)[number];

export const CROP_PLOT_STATUSES = ['PLANTED', 'GROWING', 'HARVESTED', 'FALLOW'];
export type CropPlotStatus = (typeof CROP_PLOT_STATUSES)[number];

export const OBSERVATION_TYPES = ['PEST', 'DISEASE', 'WEATHER', 'GROWTH', 'SOIL', 'OTHER'];
export type ObservationType = (typeof OBSERVATION_TYPES)[number];

export const OBSERVATION_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export type ObservationSeverity = (typeof OBSERVATION_SEVERITIES)[number];

export const ADVISORY_REQUEST_STATUSES = ['PENDING', 'REVIEWED', 'APPLIED', 'REJECTED'];
export type AdvisoryRequestStatus = (typeof ADVISORY_REQUEST_STATUSES)[number];

export interface FarmDTO {
  id: string;
  teamId: string;
  name: string;
  location: string | null;
  size: string | null;
  primaryCrop: string | null;
  status: FarmStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CropPlotDTO {
  id: string;
  farmId: string;
  name: string;
  cropType: string | null;
  plantedAt: string | null;
  area: string | null;
  status: CropPlotStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FarmObservationDTO {
  id: string;
  plotId: string;
  reportedByUserId: string;
  observationType: ObservationType;
  description: string;
  severity: ObservationSeverity;
  observedAt: string;
  createdAt: string;
}

export interface AdvisoryRequestDTO {
  id: string;
  plotId: string;
  reportedByUserId: string;
  question: string;
  observations: string | null;
  advisoryText: string | null;
  aiProvider: string | null;
  aiModel: string | null;
  confidence: number | null;
  status: AdvisoryRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFarmInput {
  name: string;
  location?: string;
  size?: string;
  primaryCrop?: string;
}

export interface CreateCropPlotInput {
  farmId: string;
  name: string;
  cropType?: string;
  plantedAt?: string;
  area?: string;
}

export interface CreateFarmObservationInput {
  plotId: string;
  observationType: ObservationType;
  description: string;
  severity?: ObservationSeverity;
}

export interface CreateAdvisoryRequestInput {
  plotId: string;
  question: string;
  observations?: string;
  idempotencyKey: string;
}

export interface AdvisoryRequestListResponse {
  requests: AdvisoryRequestDTO[];
  total: number;
}

export interface FarmObservationListResponse {
  observations: FarmObservationDTO[];
  total: number;
}

export interface FarmListResponse {
  farms: FarmDTO[];
  total: number;
}

export interface CropPlotListResponse {
  plots: CropPlotDTO[];
  total: number;
}
