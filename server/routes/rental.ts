/**
 * RentAll SmartOps routes (Mission 004).
 *
 * All routes require a verified Firebase ID token. Tenant isolation is
 * enforced via req.user.id — never from the request body.
 */

import express, { Request, Response } from 'express';
import { MaintenanceRequestStatus } from '@prisma/client';
import { authMiddleware, rateLimit } from '../lib/middleware/auth.middleware';
import { rentalService, RentalServiceError } from '../lib/services/rental.service';
import {
  createPropertySchema,
  createPropertyUnitSchema,
  createTenancySchema,
  createMaintenanceRequestSchema,
  updateMaintenanceRequestStatusSchema,
} from '../lib/validations/rental';

const router = express.Router();
router.use(authMiddleware);

const intakeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 60,
  scope: 'rental-intake',
  message: 'Too many requests. Please try again later.',
});

function sendError(res: Response, error: unknown, fallbackCode: string): Response {
  if (error instanceof RentalServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      error: { type: 'RENTAL_ERROR', message: error.message, code: error.code, timestamp: new Date().toISOString() },
    });
  }
  console.error(`[rental] ${fallbackCode}`, error);
  return res.status(500).json({
    success: false,
    error: { type: 'INTERNAL_SERVER_ERROR', message: 'Rental operation failed', code: fallbackCode, timestamp: new Date().toISOString() },
  });
}

router.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { service: 'rental', authMode: 'firebase' }, timestamp: new Date().toISOString() });
});

router.post('/properties', intakeLimiter, async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  const parsed = createPropertySchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ success: false, error: { type: 'VALIDATION_ERROR', message: 'Property validation failed', code: 'VALIDATION_FAILED', details: parsed.error.issues, timestamp: new Date().toISOString() } });
  try {
    const property = await rentalService.createProperty(tenantId, parsed.data);
    return res.status(201).json({ success: true, data: { property }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'PROPERTY_CREATE_FAILED'); }
});

router.get('/properties', async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  try {
    const properties = await rentalService.listProperties(tenantId);
    return res.json({ success: true, data: { properties }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'PROPERTY_LIST_FAILED'); }
});

router.post('/properties/:id/units', intakeLimiter, async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  const parsed = createPropertyUnitSchema.safeParse({ ...req.body, propertyId: req.params.id });
  if (!parsed.success) return res.status(400).json({ success: false, error: { type: 'VALIDATION_ERROR', message: 'Unit validation failed', code: 'VALIDATION_FAILED', details: parsed.error.issues, timestamp: new Date().toISOString() } });
  try {
    const unit = await rentalService.createPropertyUnit(tenantId, parsed.data);
    return res.status(201).json({ success: true, data: { unit }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'UNIT_CREATE_FAILED'); }
});

router.get('/units', async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  try {
    const units = await rentalService.listUnits(tenantId);
    return res.json({ success: true, data: { units }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'UNIT_LIST_FAILED'); }
});

router.post('/tenancies', intakeLimiter, async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  const parsed = createTenancySchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ success: false, error: { type: 'VALIDATION_ERROR', message: 'Tenancy validation failed', code: 'VALIDATION_FAILED', details: parsed.error.issues, timestamp: new Date().toISOString() } });
  try {
    const tenancy = await rentalService.createTenancy(tenantId, parsed.data);
    return res.status(201).json({ success: true, data: { tenancy }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'TENANCY_CREATE_FAILED'); }
});

router.get('/tenancies', async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  try {
    const tenancies = await rentalService.listTenancies(tenantId);
    return res.json({ success: true, data: { tenancies }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'TENANCY_LIST_FAILED'); }
});

router.post('/maintenance-requests', intakeLimiter, async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  const parsed = createMaintenanceRequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ success: false, error: { type: 'VALIDATION_ERROR', message: 'Maintenance request validation failed', code: 'VALIDATION_FAILED', details: parsed.error.issues, timestamp: new Date().toISOString() } });
  try {
    const request = await rentalService.createMaintenanceRequest(tenantId, parsed.data);
    return res.status(201).json({ success: true, data: { request }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'MAINTENANCE_REQUEST_CREATE_FAILED'); }
});

router.get('/maintenance-requests', async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  try {
    const requests = await rentalService.listMaintenanceRequests(tenantId);
    return res.json({ success: true, data: { requests }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'MAINTENANCE_REQUEST_LIST_FAILED'); }
});

router.get('/maintenance-requests/:id', async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  try {
    const request = await rentalService.getMaintenanceRequest(tenantId, req.params.id);
    return res.json({ success: true, data: { request }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'MAINTENANCE_REQUEST_FETCH_FAILED'); }
});

router.patch('/maintenance-requests/:id/status', async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  const parsed = updateMaintenanceRequestStatusSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ success: false, error: { type: 'VALIDATION_ERROR', message: 'Status validation failed', code: 'VALIDATION_FAILED', details: parsed.error.issues, timestamp: new Date().toISOString() } });
  try {
    const request = await rentalService.updateMaintenanceRequestStatus(tenantId, req.params.id, parsed.data.status as MaintenanceRequestStatus);
    return res.json({ success: true, data: { request }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'MAINTENANCE_REQUEST_STATUS_FAILED'); }
});

export default router;
