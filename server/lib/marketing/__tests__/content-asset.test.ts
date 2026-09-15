import { describe, it, expect, vi, beforeEach } from "vitest";
import { ContentAssetService } from "../content-asset.service";
import { PrismaClient } from "@prisma/client";

const prismaMock = {
  marketingContentAsset: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  }
} as unknown as PrismaClient;

describe("ContentAssetService", () => {
  let service: ContentAssetService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContentAssetService(prismaMock);
  });

  it("creates an asset in DRAFT state by default", async () => {
    vi.mocked(prismaMock.marketingContentAsset.create).mockResolvedValue({
      id: "asset-1",
      title: "New Post",
      state: "DRAFT",
    } as any);

    const asset = await service.createAsset({
      title: "New Post",
      type: "blog",
    });

    expect(asset.state).toBe("DRAFT");
    expect(prismaMock.marketingContentAsset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          state: "DRAFT",
          title: "New Post"
        })
      })
    );
  });

  it("updates asset state", async () => {
    vi.mocked(prismaMock.marketingContentAsset.findUnique).mockResolvedValue({
      id: "asset-1",
      state: "DRAFT"
    } as any);

    vi.mocked(prismaMock.marketingContentAsset.update).mockResolvedValue({
      id: "asset-1",
      state: "PUBLISHED"
    } as any);

    const asset = await service.updateAssetState("asset-1", "PUBLISHED");
    expect(asset.state).toBe("PUBLISHED");
    expect(prismaMock.marketingContentAsset.update).toHaveBeenCalledWith({
      where: { id: "asset-1" },
      data: { state: "PUBLISHED" }
    });
  });

  it("prevents transitioning out of ARCHIVED state", async () => {
    vi.mocked(prismaMock.marketingContentAsset.findUnique).mockResolvedValue({
      id: "asset-1",
      state: "ARCHIVED"
    } as any);

    await expect(service.updateAssetState("asset-1", "PUBLISHED")).rejects.toThrow(/Cannot transition out of ARCHIVED state/);
  });

  it("creates a derivative correctly", async () => {
    vi.mocked(prismaMock.marketingContentAsset.findUnique).mockResolvedValue({
      id: "asset-parent",
    } as any);

    vi.mocked(prismaMock.marketingContentAsset.create).mockResolvedValue({
      id: "asset-child",
      parentId: "asset-parent"
    } as any);

    await service.createDerivative("asset-parent", {
      title: "Derivative Post",
      type: "social",
    });

    expect(prismaMock.marketingContentAsset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parentId: "asset-parent",
          title: "Derivative Post"
        })
      })
    );
  });
});
