// Extracted from github-pinned.service.ts - Webhook layer
import { prisma } from "../../database";
import { processWebhook as originalProcessWebhook, verifyGitHubSignature, key } from "../sync/github-pinned.sync.service";
import { processMarketingSignalFromWebhook } from "../../marketing/github-marketing.service";

export async function handleWebhook(payload: any) {
  // Process GitHub webhook payload
  if (!payload?.repository?.full_name) throw new Error("Webhook payload missing repository");
  
  const repo = await fetch(`https://api.github.com/repos/${payload.repository.full_name}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
    }
  }).then(r => r.json());
  
  const changed = [...new Set<string>((payload.commits || []).flatMap((c: any) => [...(c.added || []), ...(c.modified || []), ...(c.removed || [])]))];
  const result = await originalProcessWebhook(payload);
  
  // Additional webhook processing can happen here
  return {
    ...result,
    repository: repo,
    changedPaths: changed
  };
}

export async function validateWebhook(payload: any, signature: string): Promise<boolean> {
  const rawBody = JSON.stringify(payload);
  return verifyGitHubSignature(rawBody, signature);
}

export function getWebhookSecret(): string | undefined {
  return process.env.GITHUB_WEBHOOK_SECRET;
}