import { z } from 'zod';
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_REQUEST_STATUSES,
  OBSERVATION_SEVERITIES,
  OBSERVATION_TYPES,
} from '../../../shared/rental';

/**
 * RentAll SmartOps + FarmPlug AI validation (Mission 004).
 *
 * Reuses the project's established Zod approach. Enum-like fields use an
 * explicit `refine` against the shared constant so an invalid value is rejected
 * with a clear message and no `as const` tuple gymnastics are required.
 */
const enumSet = (values: readonly string[], label: string) =>
  z.string().trim().refine((value) => values.includes(value), {
    message: `Invalid ${label}`,
  });

// ── RentAll SmartOps ────────────────────────────────────────────────────────

export const createPropertySchema = z.object({
  name: z.string().trim().min(1, 'Property name is required').max(200),
  address: z.string().trim().min(1, 'Address is required').max(300),
  ownerId: z.string().trim().min(1, 'Owner ID is required').max(100),
  description: z.string().trim().max(1000).optional(),
});

export const createPropertyUnitSchema = z.object({
  propertyId: z.string().trim().min(1, 'Property ID is required'),
  unitNumber: z.string().trim().min(1, 'Unit number is required').max(50),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  bathrooms: z.coerce.number().int().min(0).max(50).optional(),
  rentAmount: z.coerce.number().min(0).max(10_000_000).optional(),
});

export const createTenancySchema = z.object({
  propertyId: z.string().trim().min(1, 'Property ID is required'),
  unitId: z.string().trim().min(1, 'Unit ID is required'),
  tenantUserId: z.string().trim().min(1, 'Tenant user ID is required'),
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date'),
  monthlyRent: z.coerce.number().min(0).max(10_000_000).optional(),
});

export const createMaintenanceRequestSchema = z.object({
  propertyId: z.string().trim().min(1, 'Property ID is required'),
  unitId: z.string().trim().min(1, 'Unit ID is required').optional(),
  tenancyId: z.string().trim().min(1, 'Tenancy ID is required').optional(),
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  category: enumSet(MAINTENANCE_CATEGORIES, 'maintenance category'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  idempotencyKey: z.string().trim().min(8, 'idempotencyKey must be at least 8 characters').max(128),
});

export const updateMaintenanceRequestStatusSchema = z.object({
  status: enumSet(MAINTENANCE_REQUEST_STATUSES, 'maintenance status'),
});

export interface CreatePropertyInput extends z.infer<typeof createPropertySchema> {}
export interface CreatePropertyUnitInput extends z.infer<typeof createPropertyUnitSchema> {}
export interface CreateTenancyInput extends z.infer<typeof createTenancySchema> {}
export interface CreateMaintenanceRequestInput extends z.infer<typeof createMaintenanceRequestSchema> {}
export interface UpdateMaintenanceRequestStatusInput extends z.infer<typeof updateMaintenanceRequestStatusSchema> {}

// ── FarmPlug AI ────────────────────────────────────────────────────────────

export const createFarmSchema = z.object({
  name: z.string().trim().min(1, 'Farm name is required').max(200),
  location: z.string().trim().max(300).optional(),
  size: z.string().trim().max(100).optional(),
  primaryCrop: z.string().trim().max(100).optional(),
});

export const createCropPlotSchema = z.object({
  farmId: z.string().trim().min(1, 'Farm ID is required'),
  name: z.string().trim().min(1, 'Plot name is required').max(200),
  cropType: z.string().trim().max(100).optional(),
  plantedAt: z.string().datetime('Invalid planted date').optional(),
  area: z.string().trim().max(100).optional(),
});

export const createFarmObservationSchema = z.object({
  plotId: z.string().trim().min(1, 'Plot ID is required'),
  observationType: enumSet(OBSERVATION_TYPES, 'observation type'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  severity: enumSet(OBSERVATION_SEVERITIES, 'severity').default('MEDIUM'),
});

export const createAdvisoryRequestSchema = z.object({
  plotId: z.string().trim().min(1, 'Plot ID is required'),
  question: z.string().trim().min(10, 'Question must be at least 10 characters').max(2000),
  observations: z.string().trim().max(5000).optional(),
  idempotencyKey: z.string().trim().min(8, 'idempotencyKey must be at least 8 characters').max(128),
});

export interface CreateFarmInput extends z.infer<typeof createFarmSchema> {}
export interface CreateCropPlotInput extends z.infer<typeof createCropPlotSchema> {}
export interface CreateFarmObservationInput extends z.infer<typeof createFarmObservationSchema> {}
export interface CreateAdvisoryRequestInput extends z.infer<typeof createAdvisoryRequestSchema> {}
