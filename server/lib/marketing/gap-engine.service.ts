import { prisma } from "../database";

export interface GapResult {
  productId: string;
  productName: string;
  projectId: string | null;
  featuresCount: number;
  gapScore: number;
}

/**
 * The Content Gap Engine identifies high-value entities (Products, Technologies)
 * in the World Model that lack sufficient marketing collateral/assets.
 */
export async function detectContentGaps(): Promise<GapResult[]> {
  // Find products and check their associated events to see if any point to a MarketingContentAsset
  const products = await prisma.marketingProduct.findMany({
    include: {
      features: true,
      events: {
        where: {
          assetId: { not: null }
        }
      }
    }
  });

  const gaps: GapResult[] = [];

  for (const product of products) {
    const assetCount = product.events.length;
    const featureCount = product.features.length;

    // A gap exists if there are features but few or no assets
    if (assetCount === 0) {
      // Basic gap score formula: more features without assets = higher gap score
      // We cap the score at 1.0 (e.g. 5 features without assets = 1.0)
      const maxFeaturesForScore = 5;
      const score = Math.min(featureCount / maxFeaturesForScore, 1.0);

      // Only flag as a gap if there is at least some score (e.g., has features)
      if (score > 0) {
        gaps.push({
          productId: product.id,
          productName: product.name,
          projectId: product.worldModelProjectId,
          featuresCount: featureCount,
          gapScore: Number(score.toFixed(2))
        });
      }
    }
  }

  // Sort by highest gap score first
  return gaps.sort((a, b) => b.gapScore - a.gapScore);
}
