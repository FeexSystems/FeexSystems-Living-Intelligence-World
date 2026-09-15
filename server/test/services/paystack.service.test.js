import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { paystackService } from '../../lib/services/paystack.service';

describe('PaystackService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPublicKey', () => {
    it('should return the configured Paystack public key or fallback', () => {
      const key = paystackService.getPublicKey();
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.startsWith('pk_')).toBe(true);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify signature correctly when valid HMAC SHA-512 matches', () => {
      const secret = 'sk_test_paystack_mock_secret_key';
      (paystackService ).secretKey = secret;
      const body = JSON.stringify({ event: 'charge.success', data: { reference: 'ref_123' } });
      const rawBody = Buffer.from(body);

      const validSignature = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

      const isValid = paystackService.verifyWebhookSignature(validSignature, rawBody);
      expect(isValid).toBe(true);
    });

    it('should reject when signature is invalid', () => {
      const rawBody = Buffer.from('test_data');
      const isValid = paystackService.verifyWebhookSignature('invalid_signature_hex', rawBody);
      expect(isValid).toBe(false);
    });

    it('should reject when signature is missing', () => {
      const rawBody = Buffer.from('test_data');
      const isValid = paystackService.verifyWebhookSignature('', rawBody);
      expect(isValid).toBe(false);
    });
  });

  describe('initializeTransaction (mocked)', () => {
    it('should format payload and return authorization url and reference', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          message: 'Authorization URL created',
          data: {
            authorization_url: 'https://checkout.paystack.com/auth_test_123',
            access_code: 'acc_test_123',
            reference: 'feex_test_ref_123',
          },
        }),
      });
      global.fetch = mockFetch;

      const result = await paystackService.initializeTransaction({
        email: 'billing@feexsystems.codes',
        amount: 2900,
        currency: 'USD',
      });

      expect(result.authorizationUrl).toBe('https://checkout.paystack.com/auth_test_123');
      expect(result.accessCode).toBe('acc_test_123');
      expect(result.reference).toBe('feex_test_ref_123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.paystack.co/transaction/initialize',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer '),
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('verifyTransaction (mocked)', () => {
    it('should verify transaction and return formatted status and metadata', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          message: 'Verification successful',
          data: {
            status: 'success',
            reference: 'feex_ref_456',
            amount: 4900,
            currency: 'USD',
            customer: {
              email: 'customer@feexsystems.codes',
              customer_code: 'CUS_123',
            },
            metadata: {
              planId: 'professional',
              billingCycle: 'monthly',
            },
            paid_at: new Date().toISOString(),
          },
        }),
      });
      global.fetch = mockFetch;

      const result = await paystackService.verifyTransaction('feex_ref_456');
      expect(result.status).toBe('success');
      expect(result.amount).toBe(4900);
      expect(result.currency).toBe('USD');
      expect(result.customer.email).toBe('customer@feexsystems.codes');
    });
  });

  describe('handleWebhookEvent', () => {
    it('should handle charge.success event', async () => {
      const result = await paystackService.handleWebhookEvent({
        event: 'charge.success',
        data: {
          reference: 'feex_charge_999',
          metadata: {
            userId: 'user_123',
            planId: 'engineer_pro_monthly',
          },
        },
      });

      expect(result.handled).toBe(true);
      expect(result.action).toBe('charge_processed');
    });
  });
});
