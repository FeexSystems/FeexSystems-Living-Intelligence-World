import { prisma } from "../database";

import { SocialConnectorFactory, } from "./social-connectors";
import { logger as log } from "../logging";







export class SyndicationService {
  /**
   * Generates a platform-specific draft using the AI service.
   */
  async generateDraft(assetId, platform) {
    const asset = await prisma.marketingContentAsset.findUnique({
      where: { id: assetId }
    });

    if (!asset || !asset.content) {
      throw new Error(`Asset not found or empty: ${assetId}`);
    }

    const prompt = `Rewrite the following content for ${platform}. 
If Twitter, format as a concise tweet or thread. 
If LinkedIn, use a professional but engaging tone.
If Email, format as a newsletter excerpt.

Content to adapt:
${asset.content}
`;

    // In a full implementation, we'd queue an AI request:
    // await aiService.submitRequest({ userId: 'system', serviceId: 'marketing-draft', input: { prompt, platform } });
    
    // For this prototype, we simulate a quick AI response
    const aiResponse = {
      text: `[${platform.toUpperCase()} Optimized Draft]\n${asset.content.substring(0, 100)}...`
    };

    return {
      content: aiResponse.text
    };
  }

  /**
   * Schedules or immediately publishes a syndication task.
   */
  async syndicateAsset(task) {
    log.info(`[SyndicationService] Preparing to syndicate asset ${task.assetId} to ${task.platform}`);

    if (task.scheduledFor && task.scheduledFor > new Date()) {
      // In a real system, we'd add this to BullMQ or similar.
      log.info(`[SyndicationService] Task scheduled for ${task.scheduledFor}`);
      return { status: "SCHEDULED" };
    }

    // Immediate syndication
    const draft = await this.generateDraft(task.assetId, task.platform);
    
    const connector = SocialConnectorFactory.getConnector(task.platform);
    const result = await connector.publishPost(draft);

    log.info(`[SyndicationService] Successfully syndicated asset ${task.assetId} to ${task.platform}. URL: ${result.url}`);

    // Track the syndication as a marketing event in the World Model
    await prisma.marketingEvent.create({
      data: {
        assetId: task.assetId,
        eventType: "content.syndicated",
        metadata: {
          platform: task.platform,
          syndicationId: result.id,
          url: result.url
        }
      }
    });

    return {
      status: "PUBLISHED",
      url: result.url
    };
  }
}

export const syndicationService = new SyndicationService();
