// Extracted from github-pinned.service.ts - Evidence layer
import { prisma } from "../../database";
import { verifyGitHubSignature, processWebhook as originalProcessWebhook, key } from "../sync/github-pinned.sync.service";
import { processMarketingSignalFromWebhook } from "../../marketing/github-marketing.service";

export async function processWebhookEvidence(payload: any) {
  // Process webhook and create evidence records
  if (!payload?.repository?.full_name) throw new Error("Webhook payload missing repository");
  
  const repo = await fetch(`/repos/${payload.repository.full_name}`).then(r => r.json());
  const changed = [...new Set<string>((payload.commits || []).flatMap((c: any) => [...(c.added || []), ...(c.modified || []), ...(c.removed || [])]))];
  
  const projectId = key("webhook", `${repo.full_name}:${payload.after || Date.now()}`);
  
  // Create evidence record
  await prisma.world_model_events.create({
    data: {
      id: projectId,
      project_id: projectId,
      event_type: "github_webhook",
      commit_sha: payload.after || null,
      changed_paths: JSON.stringify(changed),
      payload: JSON.stringify({ action: payload.action, ref: payload.ref }),
      source_url: `https://github.com/${repo.full_name}`,
      source_ref: payload.ref
    }
  });
  
  // Process marketing signal
  await processMarketingSignalFromWebhook(payload, projectId);
  
  return { projectId, repo, changed };
}

export async function verifyWebhookSignature(raw: string, signature: string | undefined): Promise<boolean> {
  return verifyGitHubSignature(raw, signature);
}

export async function getWebhookEventKey(repoFullName: string, commitSha: string | null): Promise<string> {
  return key("webhook", `${repoFullName}:${commitSha || Date.now()}`);
}