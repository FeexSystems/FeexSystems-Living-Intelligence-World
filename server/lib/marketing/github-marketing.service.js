import { prisma } from "../database";

/**
 * Process a verified GitHub webhook payload to extract marketing signals.
 * This runs asynchronously (fire-and-forget) to avoid blocking the webhook response.
 */
export async function processMarketingSignalFromWebhook(payload, projectId) {
  try {
    const action = payload.action || (payload.commits ? 'push' : 'unknown');
    const eventType = payload.release ? 'release' : 'github_push_signal';
    
    const metadata = {
      action,
      ref: payload.ref,
    };

    if (payload.commits && payload.commits.length > 0) {
      metadata.commitMessages = payload.commits.map((c) => c.message);
      metadata.commitCount = payload.commits.length;
    }
    
    // Create the MarketingEvent in the database to link GitHub activity to the marketing graph
    await prisma.marketingEvent.create({
      data: {
        worldModelProjectId: projectId,
        eventType,
        metadata,
      }
    });
    
    console.log(`[Marketing Intelligence] Ingested GitHub webhook signal for project ${projectId} (event: ${eventType})`);
  } catch (error) {
    // Swallow errors because this is a non-blocking background task (Invariant #3)
    console.error(`[Marketing Intelligence] Failed to process webhook signal for project ${projectId}:`, error);
  }
}
