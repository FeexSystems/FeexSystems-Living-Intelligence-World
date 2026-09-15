import { prisma } from "../database";

export interface DecayResult {
  assetId: string;
  title: string;
  daysSinceLastEvent: number;
  decayScore: number; // 0 to 1, higher is more decayed
}

/**
 * The Content Decay Engine identifies marketing assets whose evidence or associated
 * telemetry events are becoming stale.
 */
export async function detectContentDecay(thresholdDays: number = 30): Promise<DecayResult[]> {
  const assets = await prisma.marketingContentAsset.findMany({
    include: {
      events: {
        orderBy: { occurredAt: 'desc' },
        take: 1
      }
    }
  });

  const now = Date.now();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const decayedAssets: DecayResult[] = [];

  for (const asset of assets) {
    let daysSince = 0;
    
    if (asset.events && asset.events.length > 0) {
      daysSince = (now - asset.events[0].occurredAt.getTime()) / MS_PER_DAY;
    } else {
      // If no events are associated, it's considered fully decayed (max score)
      daysSince = thresholdDays * 2;
    }

    if (daysSince >= thresholdDays) {
      // Normalize decay score between 0 and 1
      const score = Math.min((daysSince - thresholdDays) / thresholdDays, 1.0);
      
      decayedAssets.push({
        assetId: asset.id,
        title: asset.title,
        daysSinceLastEvent: Math.round(daysSince),
        decayScore: Number(score.toFixed(2))
      });
    }
  }

  // Sort by highest decay score first
  return decayedAssets.sort((a, b) => b.decayScore - a.decayScore);
}
