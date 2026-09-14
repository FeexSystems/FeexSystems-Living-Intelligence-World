import { processMarketingSignalFromWebhook } from "./lib/marketing/github-marketing.service";
import { prisma } from "./lib/database";

async function main() {
  const projectId = "test_project_id_123";
  
  // Clean up any previous test data
  await prisma.marketingEvent.deleteMany({
    where: { worldModelProjectId: projectId }
  });

  const mockPayload = {
    action: "push",
    ref: "refs/heads/main",
    commits: [
      { message: "feat: implemented phase 7" },
      { message: "fix: webhook adapter bug" }
    ]
  };

  console.log("Processing mock webhook payload...");
  await processMarketingSignalFromWebhook(mockPayload, projectId);
  
  console.log("Checking database for MarketingEvent...");
  const events = await prisma.marketingEvent.findMany({
    where: { worldModelProjectId: projectId }
  });

  if (events.length === 0) {
    console.error("Test failed: No MarketingEvent found.");
    process.exit(1);
  }

  const evt = events[0]!;
  console.log("Found event:", JSON.stringify(evt, null, 2));

  if (evt.eventType !== 'github_push_signal') {
    console.error(`Test failed: Expected eventType 'github_push_signal', got '${evt.eventType}'`);
    process.exit(1);
  }

  console.log("Test passed!");
  process.exit(0);
}

main().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
