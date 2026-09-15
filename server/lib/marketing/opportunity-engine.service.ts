import { prisma } from "../database";

export interface OpportunityResult {
  projectId: string;
  eventName: string;
  reason: string;
  priorityScore: number; // 0 to 1
}

/**
 * The Opportunity Engine correlates fresh GitHub signals (from Phase 7)
 * with the current state of marketing assets to propose immediate actions.
 */
export async function detectOpportunities(): Promise<OpportunityResult[]> {
  // Find recent GitHub events (e.g., within the last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const recentEvents = await prisma.worldModelEvent.findMany({
    where: {
      occurredAt: { gte: sevenDaysAgo },
      eventType: { in: ['release', 'push'] }
    },
    include: {
      project: {
        include: {
          marketingProducts: {
            include: {
              events: {
                where: { assetId: { not: null } }
              }
            }
          }
        }
      }
    }
  });

  const opportunities: OpportunityResult[] = [];

  for (const event of recentEvents) {
    if (!event.project) continue;

    const products = event.project.marketingProducts;
    
    // Check if the project has products with gaps (no recent assets)
    for (const product of products) {
      if (product.events.length === 0) {
        let priority = event.eventType === 'release' ? 0.9 : 0.6;
        opportunities.push({
          projectId: event.projectId!,
          eventName: event.eventType,
          reason: `Recent ${event.eventType} on project ${event.project.url} but product '${product.name}' has no marketing assets.`,
          priorityScore: priority
        });
      }
    }
  }

  return opportunities.sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Creates a draft stub for a new MarketingContentAsset, preserving the lineage
 * of a parent asset that has decayed or performed well.
 */
export async function createRecyclingStub(parentAssetId: string): Promise<string> {
  const parentAsset = await prisma.marketingContentAsset.findUnique({
    where: { id: parentAssetId }
  });

  if (!parentAsset) {
    throw new Error(`Parent asset ${parentAssetId} not found`);
  }

  // Create a new draft asset as a child
  const stub = await prisma.marketingContentAsset.create({
    data: {
      title: `[Recycled Draft] ${parentAsset.title}`,
      type: parentAsset.type,
      state: 'DRAFT',
      parentId: parentAsset.id, // Preserves lineage
      content: `This is a recycled stub originating from: ${parentAsset.id}`
    }
  });

  return stub.id;
}
