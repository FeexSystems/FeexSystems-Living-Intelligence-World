import { prisma } from "../database";

export class CampaignService {
  /**
   * Create a new marketing campaign and attach it to relevant products/audiences
   */
  async createCampaign(name, description, productIds) {
    return prisma.marketingCampaign.create({
      data: {
        name,
        description,
        products: {
          create: productIds.map(productId => ({
            productId
          }))
        }
      },
      include: {
        products: true,
        experiments: true
      }
    });
  }

  /**
   * Fetch an existing campaign with its products and active experiments
   */
  async getCampaign(campaignId) {
    return prisma.marketingCampaign.findUnique({
      where: { id: campaignId },
      include: {
        products: {
          include: {
            product: true
          }
        },
        experiments: {
          include: {
            variants: true
          }
        }
      }
    });
  }
}

export const campaignService = new CampaignService();
