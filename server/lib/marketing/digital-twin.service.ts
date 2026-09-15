import { prisma } from "../database";

export interface DigitalTwinNode {
  id: string;
  label: string;
  type: "campaign" | "asset" | "product";
  activityLevel: number;
  metadata?: Record<string, any>;
}

export interface DigitalTwinEdge {
  source: string;
  target: string;
  type: string;
}

export interface DigitalTwinSnapshot {
  nodes: DigitalTwinNode[];
  edges: DigitalTwinEdge[];
  timestamp: string;
}

export const digitalTwinService = {
  async getSnapshot(): Promise<DigitalTwinSnapshot> {
    const nodes: DigitalTwinNode[] = [];
    const edges: DigitalTwinEdge[] = [];

    // 1. Fetch active campaigns
    const campaigns = await prisma.marketingCampaign.findMany({
      include: {
        products: {
          include: {
            product: true
          }
        }
      },
      take: 20
    });

    for (const c of campaigns) {
      nodes.push({
        id: c.id,
        label: c.name,
        type: "campaign",
        activityLevel: Math.random() * 100, // Replace with real telemetry score
      });

      for (const cp of c.products) {
        nodes.push({
          id: cp.product.id,
          label: cp.product.name,
          type: "product",
          activityLevel: 50,
        });
        edges.push({
          source: c.id,
          target: cp.product.id,
          type: "promotes"
        });
      }
    }

    // 2. Fetch active assets
    const assets = await prisma.marketingContentAsset.findMany({
      where: {
        state: "PUBLISHED"
      },
      take: 20
    });

    for (const a of assets) {
      nodes.push({
        id: a.id,
        label: a.title,
        type: "asset",
        activityLevel: Math.random() * 80, // Replace with telemetry
      });
      
      // We can randomly link some assets to campaigns for visual topology
      if (campaigns.length > 0 && Math.random() > 0.5) {
        const randomCampaign = campaigns[Math.floor(Math.random() * campaigns.length)];
        edges.push({
          source: a.id,
          target: randomCampaign.id,
          type: "supports"
        });
      }
    }

    // Deduplicate nodes based on ID
    const uniqueNodes = Array.from(new Map(nodes.map(n => [n.id, n])).values());
    const uniqueEdges = Array.from(new Map(edges.map(e => [`${e.source}-${e.target}`, e])).values());

    return {
      nodes: uniqueNodes,
      edges: uniqueEdges,
      timestamp: new Date().toISOString()
    };
  }
};
