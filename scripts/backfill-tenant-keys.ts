/**
 * Tenant key backfill (D-3, step 3).
 *
 * Rewrites `tenantId` / `teamId` on the four product root tables from a Firebase
 * uid to that user's `Team.id`, using `createdByUserId` as the anchor.
 *
 * ## Safety model
 *
 *   - **Dry run by default.** Nothing is written unless `--apply` is passed.
 *   - Only rows where `createdByUserId` resolves to exactly one active team are
 *     rewritten. Ambiguous (0 or 2+) matches are reported and skipped.
 *   - Every rewrite is recorded in `tenant_key_backfill_log` (a declared Prisma
 *     model) so it is reversible and auditable.
 *   - Rows whose tenant is already a `Team.id` are left untouched (idempotent).
 *
 * ## Usage
 *
 *   npx tsx scripts/backfill-tenant-keys.ts            # report only
 *   npx tsx scripts/backfill-tenant-keys.ts --apply    # perform the backfill
 *
 * See docs/TENANT-KEY-RECONCILIATION.md §8.6.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

/** Root tables that carry a tenant key. */
const TARGETS: { table: string; tenantCol: string }[] = [
  { table: 'operations_enquiries', tenantCol: 'tenant_id' },
  { table: 'properties', tenantCol: 'team_id' },
  { table: 'farms', tenantCol: 'team_id' },
  { table: 'knowledge_documents', tenantCol: 'team_id' },
];

interface Candidate {
  id: string;
  currentTenant: string;
  newTenant: string;
}

/** Resolve a uid to exactly one active Team id, or null if ambiguous/none. */
async function resolveTeamId(uid: string): Promise<{ teamId: string | null; reason: string }> {
  const owned = await prisma.team.findMany({
    where: { ownerId: uid, isActive: true },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (owned.length === 1) return { teamId: owned[0].id, reason: 'owner' };
  if (owned.length > 1) return { teamId: null, reason: `ambiguous:${owned.length}-owned-teams` };

  const memberships = await prisma.teamMember.findMany({
    where: { userId: uid, status: 'ACTIVE' },
    select: { teamId: true },
    orderBy: { joinedAt: 'asc' },
  });
  if (memberships.length === 1) return { teamId: memberships[0].teamId, reason: 'member' };
  if (memberships.length > 1) return { teamId: null, reason: `ambiguous:${memberships.length}-memberships` };

  return { teamId: null, reason: 'no-team' };
}

async function main() {
  console.log(`=== TENANT KEY BACKFILL (${APPLY ? 'APPLY' : 'DRY RUN'}) ===\n`);

  const teamIds = new Set(
    (await prisma.team.findMany({ select: { id: true } })).map((t) => t.id)
  );
  console.log(`Teams in database: ${teamIds.size}\n`);

  let totalRewrites = 0;
  let totalSkipped = 0;

  for (const { table, tenantCol } of TARGETS) {
    const rows = await prisma.$queryRawUnsafe<{ id: string; tenant: string; uid: string | null }[]>(
      `SELECT "id", "${tenantCol}" AS tenant, "created_by_user_id" AS uid FROM "${table}"`
    );

    const candidates: Candidate[] = [];
    const skipped: string[] = [];

    for (const row of rows) {
      // Already a Team id — nothing to do (idempotent re-run).
      if (teamIds.has(row.tenant)) continue;

      if (!row.uid) {
        skipped.push(`${row.id}: no createdByUserId anchor`);
        continue;
      }

      const { teamId, reason } = await resolveTeamId(row.uid);
      if (!teamId) {
        skipped.push(`${row.id}: ${reason}`);
        continue;
      }
      if (teamId === row.tenant) continue;

      candidates.push({ id: row.id, currentTenant: row.tenant, newTenant: teamId });
    }

    console.log(`${table}: ${rows.length} rows | ${candidates.length} to rewrite | ${skipped.length} skipped`);
    for (const s of skipped.slice(0, 5)) console.log(`   skip  ${s}`);
    if (skipped.length > 5) console.log(`   ... and ${skipped.length - 5} more`);

    if (APPLY) {
      for (const c of candidates) {
        await prisma.$executeRawUnsafe(
          `UPDATE "${table}" SET "${tenantCol}" = $1 WHERE "id" = $2`,
          c.newTenant,
          c.id
        );
        await prisma.tenantKeyBackfillLog.create({
          data: {
            id: `log_${table}_${c.id}`,
            tableName: table,
            rowId: c.id,
            oldTenant: c.currentTenant,
            newTenant: c.newTenant,
          },
        });
      }
      if (candidates.length) console.log(`   applied ${candidates.length} rewrites`);
    }

    totalRewrites += candidates.length;
    totalSkipped += skipped.length;
    console.log('');
  }

  console.log('--- SUMMARY ---');
  console.log(`Rewrite candidates : ${totalRewrites}`);
  console.log(`Skipped            : ${totalSkipped}`);
  console.log(APPLY ? 'Status: APPLIED' : 'Status: DRY RUN — pass --apply to write');
}

main()
  .catch((e) => { console.error('BACKFILL FAILED:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
