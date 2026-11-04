 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
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






















/**
 * Record a rent payment and calculate any late fees.
 */
export async function recordRentPayment(
  input
) {
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

  const monthlyRentCents = Number(_nullishCoalesce(_optionalChain([tenancy, 'access', _ => _.monthlyRent, 'optionalAccess', _2 => _2.toNumber, 'optionalCall', _3 => _3()]), () => ( 0))) || input.amountCents;
  const dueDate = input.dueDate;
  const paidDate = _nullishCoalesce(input.paidDate, () => ( new Date()));

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
      provider: _nullishCoalesce(input.paymentMethod, () => ( 'unknown')),
      model: _nullishCoalesce(input.transactionReference, () => ( null)),
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
  tenancyId
)





 {
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
    const meta = event.metadata ;
    if (_optionalChain([meta, 'optionalAccess', _4 => _4.amountCents])) totalPaidCents += meta.amountCents;
    if (_optionalChain([meta, 'optionalAccess', _5 => _5.lateFeeCents])) totalLateFeesCents += meta.lateFeeCents;
  }

  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    select: { monthlyRent: true },
  });

  const monthlyRentCents = Number(_nullishCoalesce(_optionalChain([tenancy, 'optionalAccess', _6 => _6.monthlyRent, 'optionalAccess', _7 => _7.toNumber, 'optionalCall', _8 => _8()]), () => ( 0)));
  const outstandingBalanceCents = Math.max(0, monthlyRentCents - totalPaidCents);

  return {
    tenancyId,
    monthlyRentCents,
    totalPaidCents,
    totalLateFeesCents,
    outstandingBalanceCents,
  };
}