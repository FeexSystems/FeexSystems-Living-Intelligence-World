

export class ContentAssetService {
  constructor( prisma) {;this.prisma = prisma;}

  async createAsset(params





) {
    return this.prisma.marketingContentAsset.create({
      data: {
        title: params.title,
        type: params.type,
        content: params.content,
        parentId: params.parentId,
        state: "DRAFT", // Default state
        topics: params.topicIds ? {
          create: params.topicIds.map(id => ({
            topic: { connect: { id } }
          }))
        } : undefined,
      },
      include: {
        topics: true,
        parent: true,
      }
    });
  }

  async updateAssetState(id, newState) {
    // Optional: Add state transition validation (e.g. DRAFT -> PUBLISHED, PUBLISHED -> ARCHIVED)
    const asset = await this.prisma.marketingContentAsset.findUnique({ where: { id } });
    if (!asset) {
      throw new Error(`Asset ${id} not found`);
    }

    if (asset.state === "ARCHIVED" && newState !== "ARCHIVED") {
      throw new Error(`Cannot transition out of ARCHIVED state`);
    }

    return this.prisma.marketingContentAsset.update({
      where: { id },
      data: { state: newState }
    });
  }

  async createDerivative(parentId, params



) {
    const parent = await this.prisma.marketingContentAsset.findUnique({ where: { id: parentId } });
    if (!parent) {
      throw new Error(`Parent asset ${parentId} not found`);
    }

    return this.createAsset({
      ...params,
      parentId,
    });
  }

  async getAssetLineage(id) {
    return this.prisma.marketingContentAsset.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      }
    });
  }
}
