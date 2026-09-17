import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPassword = await bcrypt.hash('FeexAdmin2026!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@feexsystems.com' },
    update: {
      role: UserRole.SUPER_ADMIN,
      passwordHash: adminPassword,
      emailVerified: true,
    },
    create: {
      id: 'seed-admin-user-001',
      email: 'admin@feexsystems.com',
      passwordHash: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      emailVerified: true,
    },
  });

  console.log('✅ Created admin user:', admin.email, '(Role: SUPER_ADMIN)');

  // Create test user
  const testPassword = await bcrypt.hash('test123', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'test@feexsystems.com' },
    update: {},
    create: {
      email: 'test@feexsystems.com',
      passwordHash: testPassword,
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.USER,
      emailVerified: true,
    },
  });

  console.log('✅ Created test user:', testUser.email);

  // Create sample team
  const team = await prisma.team.upsert({
    where: { id: 'sample-team-id' },
    update: {},
    create: {
      id: 'sample-team-id',
      name: 'Sample Team',
      description: 'A sample team for testing collaboration features',
    },
  });

  console.log('✅ Created sample team:', team.name);

  // Add users to team
  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: admin.id
      }
    },
    update: {},
    create: {
      teamId: team.id,
      userId: admin.id,
      role: 'OWNER',
    },
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: testUser.id
      }
    },
    update: {},
    create: {
      teamId: team.id,
      userId: testUser.id,
      role: 'MEMBER',
    },
  });

  console.log('✅ Added users to sample team');

  // Create sample workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: 'sample-workspace-id' },
    update: {},
    create: {
      id: 'sample-workspace-id',
      teamId: team.id,
      name: 'Development Workspace',
      description: 'Main development workspace for the team',
      settings: {
        theme: 'dark',
        notifications: true,
        autoSave: true,
      },
    },
  });

  console.log('✅ Created sample workspace:', workspace.name);

  // Create sample usage metrics
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

  await prisma.usageMetrics.upsert({
    where: {
      userId_period: {
        userId: testUser.id,
        period: currentMonth
      }
    },
    update: {},
    create: {
      userId: testUser.id,
      period: currentMonth,
      aiRequestsCount: 25,
      deploymentCount: 5,
      securityScansCount: 3,
      storageUsed: BigInt(1024 * 1024 * 100), // 100MB
      bandwidthUsed: BigInt(1024 * 1024 * 500), // 500MB
    },
  });

  console.log('✅ Created sample usage metrics');

  // Create subscription plans
  const freePlan = await prisma.plan.upsert({
    where: { id: 'plan_free' },
    update: {},
    create: {
      id: 'plan_free',
      name: 'Free',
      description: 'Perfect for getting started with basic features',
      price: 0,
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      trialPeriodDays: null,
      features: {
        aiRequestsPerMonth: 10,
        deploymentsPerMonth: 2,
        securityScansPerMonth: 1,
        storageGB: 1,
        teamMembers: 1,
        support: 'community',
        customDomains: false,
        advancedAnalytics: false,
      },
      isActive: true,
      sortOrder: 1,
    },
  });

  const starterPlan = await prisma.plan.upsert({
    where: { id: 'plan_starter' },
    update: {},
    create: {
      id: 'plan_starter',
      name: 'Starter',
      description: 'Great for small teams and growing projects',
      price: 2900, // $29.00
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      trialPeriodDays: 14,
      features: {
        aiRequestsPerMonth: 100,
        deploymentsPerMonth: 10,
        securityScansPerMonth: 5,
        storageGB: 10,
        teamMembers: 5,
        support: 'email',
        customDomains: true,
        advancedAnalytics: false,
      },
      isActive: true,
      sortOrder: 2,
    },
  });

  const professionalPlan = await prisma.plan.upsert({
    where: { id: 'plan_professional' },
    update: {},
    create: {
      id: 'plan_professional',
      name: 'Professional',
      description: 'Perfect for professional teams and advanced workflows',
      price: 9900, // $99.00
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      trialPeriodDays: 14,
      features: {
        aiRequestsPerMonth: 500,
        deploymentsPerMonth: 50,
        securityScansPerMonth: 25,
        storageGB: 100,
        teamMembers: 25,
        support: 'priority',
        customDomains: true,
        advancedAnalytics: true,
        apiAccess: true,
        webhooks: true,
      },
      isActive: true,
      sortOrder: 3,
    },
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { id: 'plan_enterprise' },
    update: {},
    create: {
      id: 'plan_enterprise',
      name: 'Enterprise',
      description: 'For large organizations with custom requirements',
      price: 29900, // $299.00
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      trialPeriodDays: 30,
      features: {
        aiRequestsPerMonth: -1, // Unlimited
        deploymentsPerMonth: -1, // Unlimited
        securityScansPerMonth: -1, // Unlimited
        storageGB: 1000,
        teamMembers: -1, // Unlimited
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

  console.log('✅ Created subscription plans:', {
    free: freePlan.name,
    starter: starterPlan.name,
    professional: professionalPlan.name,
    enterprise: enterprisePlan.name,
  });

  // Assign Enterprise subscription to Super Admin
  const adminSub = await prisma.subscription.upsert({
    where: { id: 'sub_admin_enterprise' },
    update: {
      status: 'ACTIVE',
      planId: enterprisePlan.id,
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

  console.log('✅ Assigned Enterprise subscription to Super Admin:', adminSub.id);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Database seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });