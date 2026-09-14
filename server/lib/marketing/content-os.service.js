import { db } from "../database";


/**
 * Content Lifecycle States:
 * IDEA -> RESEARCH -> BRIEF -> DRAFT -> REVIEW -> APPROVED -> SCHEDULED -> PUBLISHED -> ARCHIVED
 */
 



const VALID_TRANSITIONS = {
  IDEA: ["RESEARCH", "ARCHIVED"],
  RESEARCH: ["BRIEF", "IDEA", "ARCHIVED"],
  BRIEF: ["DRAFT", "RESEARCH", "ARCHIVED"],
  DRAFT: ["REVIEW", "BRIEF", "ARCHIVED"],
  REVIEW: ["APPROVED", "DRAFT", "ARCHIVED"],
  APPROVED: ["SCHEDULED", "PUBLISHED", "REVIEW", "ARCHIVED"],
  SCHEDULED: ["PUBLISHED", "APPROVED", "ARCHIVED"],
  PUBLISHED: ["ARCHIVED"],
  ARCHIVED: ["IDEA"]
};

export class ContentOSService {
  /**
   * Transition an asset to a new state if valid
   */
  async transitionState(assetId, newState, context) {
    const asset = await db.marketingContentAsset.findUnique({
      where: { id: assetId }
    });

    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }

    const currentState = asset.state;
    const allowedTransitions = VALID_TRANSITIONS[currentState] || [];

    if (!allowedTransitions.includes(newState)) {
      throw new Error(`Invalid transition from ${currentState} to ${newState}`);
    }

    // Pre-transition logic hooks
    if (newState === "DRAFT" && currentState === "BRIEF") {
      await this.generateDraftFromBrief(asset.id);
    }

    const updatedAsset = await db.marketingContentAsset.update({
      where: { id: assetId },
      data: {
        state: newState ,
      },
    });

    // Record Event
    await db.marketingEvent.create({
      data: {
        eventType: `content_transitioned_to_${newState.toLowerCase()}`,
        assetId: assetId,
        metadata: {
          previousState: currentState,
          newState,
          context
        }
      }
    });

    return updatedAsset;
  }

  /**
   * Generates a draft automatically using the AI Service based on the brief.
   * This ties the reasoning model to the canonical World Model data.
   */
   async generateDraftFromBrief(assetId) {
    const asset = await db.marketingContentAsset.findUnique({
      where: { id: assetId }
    });

    if (!asset) return;

    try {
      // Mocking claims and campaign since they are not currently in the schema relations
      const claimsText = "- Highly optimized spatial UI\n- Data-driven AI architecture";
      const campaignName = "None";
      const prompt = `
        You are the FeexSystems Advanced Marketing Intelligence System.
        Generate a draft for a content asset.
        
        Title: ${asset.title}
        Type: ${asset.type}
        Campaign: ${campaignName}
        
        Verified Claims to Include:
        ${claimsText}
        
        Please provide the full draft content.
      `;

      // using simulated response for now since aiService might be missing generateText configuration in this branch
      // TODO: replace with real AI inference
      const draftContent = `[AI GENERATED DRAFT FOR ${asset.title}]\n\nBased on verified claims:\n${claimsText}\n\nDraft content goes here.`;

      await db.marketingContentAsset.update({
        where: { id: assetId },
        data: {
          content: draftContent
        }
      });
      
    } catch (e) {
      console.error("Failed to generate draft from brief", e);
    }
  }

  async getAssetStatus(assetId) {
    return db.marketingContentAsset.findUnique({
      where: { id: assetId }
    });
  }
}

export const contentOSService = new ContentOSService();
