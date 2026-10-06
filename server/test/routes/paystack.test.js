import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import paystackRouter from '../../routes/paystack';
import { paystackService } from '../../lib/services/paystack.service';

const app = express();
app.use(express.json());
app.use('/api/paystack', paystackRouter);

describe('Paystack API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/paystack/config', () => {
    it('should return paystack public key and configuration data', async () => {
      const response = await request(app).get('/api/paystack/config');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.publicKey).toBeDefined();
      expect(response.body.data.plans).toHaveLength(4);
    });
  });

  describe('POST /api/paystack/initialize', () => {
    it('should return 400 when email is missing and not authenticated', async () => {
      const response = await request(app).post('/api/paystack/initialize').send({});
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_REQUIRED');
    });

    it('should successfully return free tier access for community plan', async () => {
      const response = await request(app)
        .post('/api/paystack/initialize')
        .send({ email: 'test@feexsystems.codes', planId: 'community' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessCode).toBe('FREE_TIER');
    });

    it('should initialize paid tier via paystack service', async () => {
      vi.spyOn(paystackService, 'initializeTransaction').mockResolvedValue({
        authorizationUrl: 'https://checkout.paystack.com/test_route',
        accessCode: 'acc_test_route',
        reference: 'ref_test_route',
      });

      const response = await request(app)
        .post('/api/paystack/initialize')
        .send({
          email: 'pro@feexsystems.codes',
          planId: 'engineer_pro_monthly',
          billingCycle: 'monthly',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authorizationUrl).toBe('https://checkout.paystack.com/test_route');
      expect(response.body.data.reference).toBe('ref_test_route');
    });
  });

  describe('GET /api/paystack/verify/:reference', () => {
    it('should verify reference and return verification details', async () => {
      vi.spyOn(paystackService, 'verifyTransaction').mockResolvedValue({
        status: 'success',
        reference: 'ref_verify_test',
        amount: 2900,
        currency: 'USD',
        paidAt: new Date().toISOString(),
        channel: 'card',
        customer: {
          id: 1,
          email: 'pro@feexsystems.codes',
        },
        metadata: {
          planId: 'engineer_pro_monthly',
        },
      });

      const response = await request(app).get('/api/paystack/verify/ref_verify_test');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('success');
      expect(response.body.data.reference).toBe('ref_verify_test');
    });
  });
});
