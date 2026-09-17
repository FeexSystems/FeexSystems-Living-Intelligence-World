/**
 * Auth Seeder — FeexSystems Living Intelligence (Firebase Edition)
 *
 * Seeds initial admin and test user accounts in Prisma.
 * NOTE: Firebase handles passwords — these users must also be created in Firebase.
 * The `id` field uses a fixed value since Firebase UIDs are provided at runtime.
 *
 * Usage:
 *   npx tsx prisma/seed-auth.ts
 */
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting auth seeding (Canonical Full-Access Credentials)...');

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@feexsystems.com').toLowerCase();
  const adminPasswordHash = await bcrypt.hash('FeexAdmin2026!', 10);

  // Use fixed IDs for seed users (Firebase UIDs are provided at runtime for real users)
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: UserRole.SUPER_ADMIN,
      emailVerified: true,
      passwordHash: adminPasswordHash,
      firstName: 'Super',
      lastName: 'Admin',
    },
    create: {
      id: 'seed-admin-user-001',
      email: adminEmail,
      passwordHash: adminPasswordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      emailVerified: true,
    },
  });

  console.log(`✅ Super Admin user seeded: ${admin.email} (Role: ${admin.role})`);

  // Ensure Enterprise Plan exists
  const enterprisePlan = await prisma.plan.upsert({
    where: { id: 'plan_enterprise' },
    update: {
      isActive: true,
    },
    create: {
      id: 'plan_enterprise',
      name: 'Enterprise',
      description: 'Full platform access with unlimited capabilities',
      price: 29900,
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      trialPeriodDays: 30,
      features: {
        aiRequestsPerMonth: -1,
        deploymentsPerMonth: -1,
        securityScansPerMonth: -1,
        storageGB: 1000,
        teamMembers: -1,
        support: 'dedicated',
        customDomains: true,
        advancedAnalytics: true,
        apiAccess: true,
        webhooks: true,
        sso: true,
        customIntegrations: true,
        onPremise: true,
      },
      isActive: true,
      sortOrder: 4,
    },
  });

  // Ensure active Enterprise subscription for Super Admin
  const sub = await prisma.subscription.upsert({
    where: { id: 'sub_admin_enterprise' },
    update: {
      status: 'ACTIVE',
      planId: enterprisePlan.id,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    create: {
      id: 'sub_admin_enterprise',
      userId: admin.id,
      planId: enterprisePlan.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`✅ Enterprise subscription active: ${sub.id} (Plan: ${enterprisePlan.name})`);

  const testEmail = (process.env.TEST_EMAIL || 'engineer@feexsystems.com').toLowerCase();
  const testPasswordHash = await bcrypt.hash('FeexAdmin2026!', 10);

  const testUser = await prisma.user.upsert({
    where: { email: testEmail },
    update: {
      role: UserRole.USER,
      emailVerified: true,
      passwordHash: testPasswordHash,
    },
    create: {
      id: 'seed-test-user-001',
      email: testEmail,
      passwordHash: testPasswordHash,
      firstName: 'Test',
      lastName: 'Engineer',
      role: UserRole.USER,
      emailVerified: true,
    },
  });

  console.log(`✅ Test user seeded: ${testUser.email} (Role: ${testUser.role})`);
  console.log('🎉 Auth seeding completed successfully.');
  console.log('🔑 Credentials: admin@feexsystems.com / FeexAdmin2026! (SUPER_ADMIN + ENTERPRISE)');
}

main()
  .catch((e) => {
    console.error('❌ Auth seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });