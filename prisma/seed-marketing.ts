/**
 * Marketing Phase 1 seed
 * Links products to existing World Model projects when present.
 * Creates sample claim only when World Model evidence exists (or marketing evidence).
 *
 * Run: npx tsx prisma/seed-marketing.ts
 */
import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding marketing Phase 1…");

  const channelTypes = [
    "LINKEDIN",
    "X",
    "YOUTUBE",
    "NEWSLETTER",
    "SITE",
    "DOCS",
    "FEEX_WORLD",
    "OTHER",
  ] as const;
  for (const type of channelTypes) {
    await prisma.marketingChannel.upsert({
      where: { type },
      create: { type, name: type.replace(/_/g, " ") },
      update: {},
    });
  }

  const topicLiving = await prisma.marketingTopic.upsert({
    where: { slug: "living-intelligence" },
    create: {
      slug: "living-intelligence",
      name: "Living Intelligence",
      description: "Evidence-grounded world models and continuous learning systems",
    },
    update: {},
  });

  const wmProject = await prisma.worldModelProject.findFirst({
    where: { isPinned: true },
    orderBy: { lastObservedAt: "desc" },
  });

  const product = await prisma.marketingProduct.upsert({
    where: { slug: "feexsystems-platform" },
    create: {
      slug: "feexsystems-platform",
      name: "FeexSystems Platform",
      description:
        "Living Intelligence World — evidence-first engineering and marketing intelligence",
      worldModelProjectId: wmProject?.id ?? null,
      metadata: { seeded: true, phase: 1 },
    },
    update: {
      worldModelProjectId: wmProject?.id ?? undefined,
    },
  });

  await prisma.marketingContentAsset.upsert({
    where: { slug: "why-evidence-first-marketing" },
    create: {
      slug: "why-evidence-first-marketing",
      title: "Why Evidence-First Marketing Matters",
      summary:
        "Canonical claims must link to repository evidence, not model invention.",
      lifecycle: "IDEA",
      productId: product.id,
      topicId: topicLiving.id,
      channelType: "SITE",
      objective: "Establish evidence-first narrative for FeexSystems",
      metadata: { seeded: true },
    },
    update: {},
  });

  await prisma.marketingAudience.upsert({
    where: { slug: "platform-engineers" },
    create: {
      slug: "platform-engineers",
      name: "Platform Engineers",
      description: "Builders of internal platforms and developer experience",
      interests: ["world-model", "evidence", "github-automation", "devops"],
    },
    update: {},
  });

  const existingClaim = await prisma.marketingClaim.findFirst({
    where: { statement: { contains: "World Model owns reality" } },
  });

  if (!existingClaim) {
    const wmEvidence = wmProject
      ? await prisma.worldModelEvidence.findFirst({
          where: { projectId: wmProject.id },
        })
      : null;

    if (wmEvidence) {
      const claim = await prisma.marketingClaim.create({
        data: {
          statement:
            "The World Model owns reality; the LLM interprets over grounded evidence.",
          productId: product.id,
          confidence: 0.9,
        },
      });
      await prisma.marketingClaimEvidence.create({
        data: {
          claimId: claim.id,
          worldModelEvidenceId: wmEvidence.id,
          role: "supports",
        },
      });
      console.log("  claim linked to WorldModelEvidence", wmEvidence.id);
    } else {
      const claim = await prisma.marketingClaim.create({
        data: {
          statement:
            "The World Model owns reality; the LLM interprets over grounded evidence.",
          productId: product.id,
          confidence: 0.7,
        },
      });
      const ev = await prisma.marketingEvidence.create({
        data: {
          sourceType: "architecture_doc",
          sourceUrl:
            "https://github.com/FeexSystems/FeexSystems-Living-Intelligence-World/blob/main/docs/FEEXSYSTEMS-ADVANCED-MARKETING-INTELLIGENCE-SYSTEM.md",
          sourceRef: "capability-06",
          confidence: 0.85,
        },
      });
      await prisma.marketingClaimEvidence.create({
        data: {
          claimId: claim.id,
          marketingEvidenceId: ev.id,
          role: "supports",
        },
      });
      console.log("  claim linked to MarketingEvidence (no WM evidence present)");
    }
  }

  console.log("Marketing seed complete.");
  console.log("  product:", product.slug, "wmProject:", wmProject?.repository ?? "(none)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
