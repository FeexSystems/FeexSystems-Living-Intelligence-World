/**
 * Tenancy Date Overlap Prevention Service (Priority 2 — Important)
 *
 * Prevents overlapping tenancy date ranges for the same property unit.
 * Before creating or updating a tenancy, checks that no existing active
 * tenancy overlaps the proposed date range.
 */

import { prisma } from '../database';
import { TenancyStatus } from '@prisma/client';

/**
 * Result of overlap check.
 */
export interface TenancyOverlapResult {
  hasOverlap: boolean;
  overlappingTenancyId?: string;
  message?: string;
}

/**
 * Check whether a proposed tenancy date range overlaps any existing
 * active tenancy for the same unit.
 */
export async function checkTenancyOverlap(
  unitId: string,
  startDate: Date,
  endDate: Date,
  excludeTenancyId?: string
): Promise<TenancyOverlapResult> {
  const existing = await prisma.tenancy.findFirst({
    where: {
      unitId,
      status: {
        in: [TenancyStatus.PENDING, TenancyStatus.ACTIVE],
      },
      id: excludeTenancyId ? { not: excludeTenancyId } : undefined,
      // Overlap condition: proposed start < existing end AND proposed end > existing start
      startDate: { lt: endDate },
      endDate: { gt: startDate },
    },
    select: { id: true, startDate: true, endDate: true, status: true },
  });

  if (existing) {
    return {
      hasOverlap: true,
      overlappingTenancyId: existing.id,
      message: `Unit already has an active tenancy from ${existing.startDate.toISOString().slice(0, 10)} to ${existing.endDate.toISOString().slice(0, 10)}`,
    };
  }

  return { hasOverlap: false };
}

/**
 * Validate tenancy creation/update input for date overlap.
 * Throws if overlap detected.
 */
export async function validateTenancyDates(
  unitId: string,
  startDate: Date,
  endDate: Date,
  excludeTenancyId?: string
): Promise<void> {
  if (endDate <= startDate) {
    throw new Error('endDate must be after startDate');
  }

  const overlap = await checkTenancyOverlap(
    unitId,
    startDate,
    endDate,
    excludeTenancyId
  );

  if (overlap.hasOverlap) {
    throw new Error(overlap.message ?? 'Tenancy date range overlaps an existing tenancy');
  }
}