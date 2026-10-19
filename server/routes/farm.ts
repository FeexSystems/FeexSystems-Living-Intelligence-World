/**
 * FarmPlug AI routes (Mission 004).
 *
 * All routes require a verified Firebase ID token. Tenant isolation is
 * enforced via req.user.id — never from the request body.
 */

import express, { Request, Response } from 'express';
import { authMiddleware, rateLimit } from '../lib/middleware/auth.middleware';
import { farmPlugService } from '../lib/services/farm-plug.service';
import {
  createFarmSchema,
  createCropPlotSchema,
  createFarmObservationSchema,
  createAdvisoryRequestSchema,
} from '../lib/validations/rental';

const router = express.Router();
router.use(authMiddleware);

const intakeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 60,
  scope: 'farm-intake',
  message: 'Too many requests. Please try again later.',
});

function sendError(res: Response, error: unknown, fallbackCode: string): Response {
  console.error(`[farm] ${fallbackCode}`, error);
  return res.status(500).json({
    success: false,
    error: { type: 'INTERNAL_SERVER_ERROR', message: 'Farm operation failed', code: fallbackCode, timestamp: new Date().toISOString() },
  });
}

router.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { service: 'farm', authMode: 'firebase' }, timestamp: new Date().toISOString() });
});

router.post('/farms', intakeLimiter, async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  const parsed = createFarmSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ success: false, error: { type: 'VALIDATION_ERROR', message: 'Farm validation failed', code: 'VALIDATION_FAILED', details: parsed.error.issues, timestamp: new Date().toISOString() } });
  try {
    const farm = await farmPlugService.createFarm(tenantId, parsed.data);
    return res.status(201).json({ success: true, data: { farm }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'FARM_CREATE_FAILED'); }
});

router.get('/farms', async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  try {
    const farms = await farmPlugService.listFarms(tenantId);
    return res.json({ success: true, data: { farms }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'FARM_LIST_FAILED'); }
});

router.get('/farms/:id', async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  try {
    const farm = await farmPlugService.getFarm(tenantId, req.params.id);
    return res.json({ success: true, data: { farm }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'FARM_FETCH_FAILED'); }
});

router.post('/farms/:id/plots', intakeLimiter, async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  const parsed = createCropPlotSchema.safeParse({ ...req.body, farmId: req.params.id });
  if (!parsed.success) return res.status(400).json({ success: false, error: { type: 'VALIDATION_ERROR', message: 'Plot validation failed', code: 'VALIDATION_FAILED', details: parsed.error.issues, timestamp: new Date().toISOString() } });
  try {
    const plot = await farmPlugService.createCropPlot(tenantId, parsed.data);
    return res.status(201).json({ success: true, data: { plot }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'PLOT_CREATE_FAILED'); }
});

router.get('/plots', async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  try {
    const plots = await farmPlugService.listPlots(tenantId);
    return res.json({ success: true, data: { plots }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'PLOT_LIST_FAILED'); }
});

router.post('/plots/:id/observations', intakeLimiter, async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  const parsed = createFarmObservationSchema.safeParse({ ...req.body, plotId: req.params.id });
  if (!parsed.success) return res.status(400).json({ success: false, error: { type: 'VALIDATION_ERROR', message: 'Observation validation failed', code: 'VALIDATION_FAILED', details: parsed.error.issues, timestamp: new Date().toISOString() } });
  try {
    const observation = await farmPlugService.createObservation(tenantId, parsed.data);
    return res.status(201).json({ success: true, data: { observation }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'OBSERVATION_CREATE_FAILED'); }
});

router.get('/observations', async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  try {
    const observations = await farmPlugService.listObservations(tenantId);
    return res.json({ success: true, data: { observations }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'OBSERVATION_LIST_FAILED'); }
});

router.post('/advisory-requests', intakeLimiter, async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  const parsed = createAdvisoryRequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ success: false, error: { type: 'VALIDATION_ERROR', message: 'Advisory request validation failed', code: 'VALIDATION_FAILED', details: parsed.error.issues, timestamp: new Date().toISOString() } });
  try {
    const request = await farmPlugService.createAdvisoryRequest(tenantId, parsed.data);
    return res.status(201).json({ success: true, data: { request }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'ADVISORY_REQUEST_CREATE_FAILED'); }
});

router.get('/advisory-requests', async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  try {
    const requests = await farmPlugService.listAdvisoryRequests(tenantId);
    return res.json({ success: true, data: { requests }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'ADVISORY_REQUEST_LIST_FAILED'); }
});

router.get('/advisory-requests/:id', async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  try {
    const request = await farmPlugService.getAdvisoryRequest(tenantId, req.params.id);
    return res.json({ success: true, data: { request }, timestamp: new Date().toISOString() });
  } catch (error) { return sendError(res, error, 'ADVISORY_REQUEST_FETCH_FAILED'); }
});

export default router;
