import { describe, it, expect } from 'vitest';
import {
  createOperationsEnquirySchema,
  listOperationsEnquiriesQuerySchema,
  reviewOperationsEnquirySchema,
} from '../operations';

const validEnquiry = {
  contactName: 'Ada Lovelace',
  contactEmail: 'Ada@Example.COM',
  company: 'Analytical Engines',
  subject: 'Billing question',
  message: 'We were charged twice and need help resolving this.',
  idempotencyKey: 'idem-key-12345678',
};

describe('createOperationsEnquirySchema', () => {
  it('accepts a valid enquiry and normalises the email', () => {
    const parsed = createOperationsEnquirySchema.parse(validEnquiry);
    expect(parsed.contactEmail).toBe('ada@example.com');
  });

  it('rejects a short message', () => {
    const result = createOperationsEnquirySchema.safeParse({ ...validEnquiry, message: 'too short' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = createOperationsEnquirySchema.safeParse({ ...validEnquiry, contactEmail: 'nope' });
    expect(result.success).toBe(false);
  });

  it('rejects a short idempotency key', () => {
    const result = createOperationsEnquirySchema.safeParse({ ...validEnquiry, idempotencyKey: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects an over-long message', () => {
    const result = createOperationsEnquirySchema.safeParse({
      ...validEnquiry,
      message: 'x'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

describe('listOperationsEnquiriesQuerySchema', () => {
  it('defaults the limit to 25', () => {
    expect(listOperationsEnquiriesQuerySchema.parse({}).limit).toBe(25);
  });

  it('coerces a string limit', () => {
    expect(listOperationsEnquiriesQuerySchema.parse({ limit: '10' }).limit).toBe(10);
  });

  it('rejects an out-of-range limit', () => {
    expect(listOperationsEnquiriesQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(listOperationsEnquiriesQuerySchema.safeParse({ status: 'DONE' }).success).toBe(false);
  });
});

describe('reviewOperationsEnquirySchema', () => {
  it('allows an empty body', () => {
    expect(reviewOperationsEnquirySchema.safeParse({}).success).toBe(true);
  });

  it('rejects an over-long note', () => {
    expect(reviewOperationsEnquirySchema.safeParse({ note: 'x'.repeat(1001) }).success).toBe(false);
  });
});
