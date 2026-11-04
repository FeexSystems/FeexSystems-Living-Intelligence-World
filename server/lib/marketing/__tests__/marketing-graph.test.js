import { describe, it, expect, vi, beforeEach } from "vitest";
import { MarketingGraphService } from "../marketing-graph.service";


const prismaMock = {
  marketingProduct: {
    findUnique: vi.fn(),
  },
  marketingCampaign: {
    findUnique: vi.fn(),
  },
  marketingAudience: {
    findUnique: vi.fn(),
  }
} ;

describe("MarketingGraphService", () => {
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MarketingGraphService(prismaMock);
  });

  it("fetches product neighborhood", async () => {
    vi.mocked(prismaMock.marketingProduct.findUnique).mockResolvedValue({
      id: "prod-1",
      name: "Product 1",
      features: [],
      claims: [],
      audiences: [],
      campaigns: [],
      events: []
    } );

    const product = await service.getProductNeighborhood("prod-1");
    expect(product.name).toBe("Product 1");
    expect(prismaMock.marketingProduct.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod-1" },
        include: expect.any(Object)
      })
    );
  });

  it("fetches campaign neighborhood", async () => {
    vi.mocked(prismaMock.marketingCampaign.findUnique).mockResolvedValue({
      id: "camp-1",
      name: "Campaign 1",
      products: [],
      events: []
    } );

    const campaign = await service.getCampaignNeighborhood("camp-1");
    expect(campaign.name).toBe("Campaign 1");
    expect(prismaMock.marketingCampaign.findUnique).toHaveBeenCalled();
  });

  it("fetches audience neighborhood", async () => {
    vi.mocked(prismaMock.marketingAudience.findUnique).mockResolvedValue({
      id: "aud-1",
      name: "Developers",
      product: {}
    } );

    const audience = await service.getAudienceNeighborhood("aud-1");
    expect(audience.name).toBe("Developers");
    expect(prismaMock.marketingAudience.findUnique).toHaveBeenCalled();
  });
});
