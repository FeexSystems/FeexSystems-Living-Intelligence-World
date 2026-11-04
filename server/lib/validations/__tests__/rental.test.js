import { describe, it, expect } from 'vitest';
import {
  createAdvisoryRequestSchema,
  createFarmObservationSchema,
  createMaintenanceRequestSchema,
  createPropertySchema,
  updateMaintenanceRequestStatusSchema,
} from '../rental';

describe('RentAll validation', () => {
  it('accepts a valid property', () => {
    const result = createPropertySchema.safeParse({
      name: 'Sunrise Apartments',
      address: '12 Main St',
      ownerId: 'user-1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty property name', () => {
    const result = createPropertySchema.safeParse({ name: '', address: '12 Main St', ownerId: 'user-1' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid maintenance request and defaults priority to MEDIUM', () => {
    const result = createMaintenanceRequestSchema.safeParse({
      propertyId: 'prop-1',
      title: 'Leaking tap',
      description: 'The kitchen tap has been leaking for two days.',
      category: 'PLUMBING',
      idempotencyKey: 'idem-key-12345678',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.priority).toBe('MEDIUM');
  });

  it('rejects an invalid maintenance category', () => {
    const result = createMaintenanceRequestSchema.safeParse({
      propertyId: 'prop-1',
      title: 'Leaking tap',
      description: 'The kitchen tap has been leaking for two days.',
      category: 'ROOFING',
      idempotencyKey: 'idem-key-12345678',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a short maintenance description', () => {
    const result = createMaintenanceRequestSchema.safeParse({
      propertyId: 'prop-1',
      title: 'Leak',
      description: 'short',
      category: 'PLUMBING',
      idempotencyKey: 'idem-key-12345678',
    });
    expect(result.success).toBe(false);
  });

  it('accepts only known maintenance status transitions', () => {
    expect(updateMaintenanceRequestStatusSchema.safeParse({ status: 'RESOLVED' }).success).toBe(true);
    expect(updateMaintenanceRequestStatusSchema.safeParse({ status: 'DONE' }).success).toBe(false);
  });
});

describe('FarmPlug validation', () => {
  it('accepts a valid observation and defaults severity', () => {
    const result = createFarmObservationSchema.safeParse({
      plotId: 'plot-1',
      observationType: 'PEST',
      description: 'Aphids observed on the lower leaves.',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.severity).toBe('MEDIUM');
  });

  it('rejects an unknown observation type', () => {
    const result = createFarmObservationSchema.safeParse({
      plotId: 'plot-1',
      observationType: 'ALIENS',
      description: 'Aphids observed on the lower leaves.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown severity', () => {
    const result = createFarmObservationSchema.safeParse({
      plotId: 'plot-1',
      observationType: 'PEST',
      description: 'Aphids observed on the lower leaves.',
      severity: 'EXTREME',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a short advisory question', () => {
    const result = createAdvisoryRequestSchema.safeParse({
      plotId: 'plot-1',
      question: 'help',
      idempotencyKey: 'idem-key-12345678',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid advisory request', () => {
    const result = createAdvisoryRequestSchema.safeParse({
      plotId: 'plot-1',
      question: 'My tomato leaves are turning yellow, what should I check?',
      idempotencyKey: 'idem-key-12345678',
    });
    expect(result.success).toBe(true);
  });
});
