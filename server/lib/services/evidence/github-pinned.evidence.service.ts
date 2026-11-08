// Extracted from github-pinned.service.ts - Evidence layer
import { prisma } from "../../database";
import { verifyGitHubSignature, processWebhook as originalProcessWebhook } from "../github-pinned.service";
import { processMarketingSignalFromWebhook } from "../../marketing/github-marketing.service";
import { createHash } from "node:crypto";

function key(p: string, v: string) {
  return `${p}_${createHash("sha256").update(v).digest("hex").slice(0, 24)}`;
}

export async function processWebhookEvidence(payload: any) {
  // Process webhook and create evidence records
  if (!payload?.repository?.full_name) throw new Error("Webhook payload missing repository");
  
  const repo = await fetch(`/repos/${payload.repository.full_name}`).then(r => r.json());
  const changed = [...new Set<string>((payload.commits || []).flatMap((c: any) => [...(c.added || []), ...(c.modified || []), ...(c.removed || [])]))];
  
  const projectId = key("webhook", `${repo.full_name}:${payload.after || Date.now()}`);
  
  // Create evidence record
  await prisma.$executeRawUnsafe(
    `INSERT INTO world_model_events(id,project_id,event_type,commit_sha,changed_paths,payload) VALUES($1,$2,'github_webhook',$3,$4::jsonb,$5::jsonb)`,
    projectId,
    projectId,
    payload.after || null,
    JSON.stringify(changed),
    JSON.stringify({ action: payload.action, ref: payload.ref })
  );
  
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