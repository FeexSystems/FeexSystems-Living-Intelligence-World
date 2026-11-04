/**
 * Rent Payment Tracking Service (Priority 3 — Nice-to-Have)
 *
 * Tracks rent payments, late fees, and payment history for RentAll tenancies.
 * Extends the existing RentAll property operations with financial tracking.
 */

import { prisma } from '../database';
import { TenancyStatus } from '@prisma/client';
import { logger } from '../logging';

/**
 * Record a rent payment for a tenancy.
 */
export interface RentPaymentInput {
  tenancyId: string;
  amountCents: number;
  currency: string;
  dueDate: Date;
  paidDate?: Date;
  paymentMethod?: string;
  transactionReference?: string;
}

/**
 * Result of rent payment recording.
 */
export interface RentPaymentResult {
  paymentId: string;
  tenancyId: string;
  amountCents: number;
  isLate: boolean;
  lateFeeCents: number;
  balanceDueCents: number;
}

/**
 * Record a rent payment and calculate any late fees.
 */
export async function recordRentPayment(
  input: RentPaymentInput
): Promise<RentPaymentResult> {
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: input.tenancyId },
    select: {
      id: true,
      monthlyRent: true,
      status: true,
      endDate: true,
      _count: { select: { maintenanceRequests: true } },
    },
  });

  if (!tenancy) {
    throw new Error('Tenancy not found');
  }

  if (tenancy.status !== TenancyStatus.ACTIVE) {
    throw new Error('Cannot record payment for non-active tenancy');
  }

  const monthlyRentCents = Number(tenancy.monthlyRent?.toNumber?.() ?? 0) || input.amountCents;
  const dueDate = input.dueDate;
  const paidDate = input.paidDate ?? new Date();

  // Calculate late fee: 5% of monthly rent if paid after due date.
  const isLate = paidDate > dueDate;
  const lateFeeCents = isLate ? Math.round(monthlyRentCents * 0.05) : 0;

  // Calculate balance due.
  const totalDue = monthlyRentCents + lateFeeCents;
  const balanceDueCents = Math.max(0, totalDue - input.amountCents);

  // Record the payment as a platform usage event (append-only ledger).
  const paymentEvent = await prisma.platformUsageEvent.create({
    data: {
      tenantId: tenancy.id, // using tenancy id as tenant scope for now
      actorId: undefined,
      operation: 'rent_payment',
      provider: input.paymentMethod ?? 'unknown',
      model: input.transactionReference ?? null,
      units: input.amountCents,
      measured: true,
      correlationId: input.transactionReference,
      metadata: {
        tenancyId: input.tenancyId,
        amountCents: input.amountCents,
        currency: input.currency,
        dueDate: dueDate.toISOString(),
        paidDate: paidDate.toISOString(),
        isLate,
        lateFeeCents,
        monthlyRentCents,
        balanceDueCents,
        paymentMethod: input.paymentMethod,
        transactionReference: input.transactionReference,
      },
      createdAt: new Date(),
    },
  });

  logger.debug('[rent-payment] payment recorded', {
    paymentId: paymentEvent.id,
    tenancyId: input.tenancyId,
    amountCents: input.amountCents,
    isLate,
    lateFeeCents,
  });

  return {
    paymentId: paymentEvent.id,
    tenancyId: input.tenancyId,
    amountCents: input.amountCents,
    isLate,
    lateFeeCents,
    balanceDueCents,
  };
}

/**
 * Calculate outstanding balance for a tenancy.
 */
export async function calculateOutstandingBalance(
  tenancyId: string
): Promise<{
  tenancyId: string;
  monthlyRentCents: number;
  totalPaidCents: number;
  totalLateFeesCents: number;
  outstandingBalanceCents: number;
}> {
  const events = await prisma.platformUsageEvent.findMany({
    where: {
      tenantId: tenancyId,
      operation: 'rent_payment',
    },
    select: { metadata: true, units: true, createdAt: true },
  });

  let totalPaidCents = 0;
  let totalLateFeesCents = 0;

  for (const event of events) {
    const meta = event.metadata as any;
    if (meta?.amountCents) totalPaidCents += meta.amountCents;
    if (meta?.lateFeeCents) totalLateFeesCents += meta.lateFeeCents;
  }

  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    select: { monthlyRent: true },
  });

  const monthlyRentCents = Number(tenancy?.monthlyRent?.toNumber?.() ?? 0);
  const outstandingBalanceCents = Math.max(0, monthlyRentCents - totalPaidCents);

  return {
    tenancyId,
    monthlyRentCents,
    totalPaidCents,
    totalLateFeesCents,
    outstandingBalanceCents,
  };
}