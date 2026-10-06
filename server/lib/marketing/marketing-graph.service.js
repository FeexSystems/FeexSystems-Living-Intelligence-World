

export class MarketingGraphService {
  constructor( prisma) {;this.prisma = prisma;}

  // Get complete product ecosystem: Features, Claims, Audiences, Campaigns
  async getProductNeighborhood(productId) {
    const product = await this.prisma.marketingProduct.findUnique({
      where: { id: productId },
      include: {
        features: true,
        audiences: true,
        claims: {
          include: {
            evidence: true,
          }
        },
        campaigns: {
          include: {
            campaign: true
          }
        },
        events: {
          orderBy: { occurredAt: 'desc' },
          take: 5
        }
      }
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    return product;
  }

  // Get a Campaign's neighborhood: Products, Events
  async getCampaignNeighborhood(campaignId) {
    const campaign = await this.prisma.marketingCampaign.findUnique({
      where: { id: campaignId },
      include: {
        products: {
          include: {
            product: true
          }
        },
        events: {
          orderBy: { occurredAt: 'desc' },
          take: 10
        }
      }
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    return campaign;
  }

  // Audience to Product query
  async getAudienceNeighborhood(audienceId) {
    const audience = await this.prisma.marketingAudience.findUnique({
      where: { id: audienceId },
      include: {
        product: {
          include: {
            features: true
          }
        }
      }
    });

    if (!audience) {
      throw new Error(`Audience ${audienceId} not found`);
    }

    return audience;
  }
}
