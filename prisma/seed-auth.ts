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

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting auth seeding (Firebase mode)...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@feexsystems.com';

  // Use fixed IDs for seed users (Firebase UIDs are provided at runtime for real users)
  const admin = await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      role: UserRole.ADMIN,
      emailVerified: true,
    },
    create: {
      id: 'seed-admin-user-001',
      email: adminEmail.toLowerCase(),
      passwordHash: 'FIREBASE_AUTH',
      firstName: 'Admin',
      lastName: 'FeexSystems',
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });

  console.log(`✅ Admin user seeded: ${admin.email} (Role: ${admin.role})`);

  const testEmail = process.env.TEST_EMAIL || 'engineer@feexsystems.com';

  const testUser = await prisma.user.upsert({
    where: { email: testEmail.toLowerCase() },
    update: {
      role: UserRole.USER,
      emailVerified: true,
    },
    create: {
      id: 'seed-test-user-001',
      email: testEmail.toLowerCase(),
      passwordHash: 'FIREBASE_AUTH',
      firstName: 'Test',
      lastName: 'Engineer',
      role: UserRole.USER,
      emailVerified: true,
    },
  });

  console.log(`✅ Test user seeded: ${testUser.email} (Role: ${testUser.role})`);
  console.log('🎉 Auth seeding completed successfully.');
  console.log('⚠️  NOTE: Create these users in Firebase Console or via Firebase CLI for authentication to work.');
}

main()
  .catch((e) => {
    console.error('❌ Auth seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });