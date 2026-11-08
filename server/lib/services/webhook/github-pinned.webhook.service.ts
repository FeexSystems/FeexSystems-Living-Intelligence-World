// Extracted from github-pinned.service.ts - Webhook layer
import { createHmac, timingSafeEqual } from "node:crypto";

type PinnedRepository = { name: string; fullName: string; url: string; description: string | null; source: "github-profile-pinned" | "environment" };

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
  
  // Process webhook logic here
  const result = {
    success: true,
    repository: repo,
    changedPaths: changed
  };
  
  return result;
}

export async function validateWebhook(payload: any, signature: string): Promise<boolean> {
  const rawBody = JSON.stringify(payload);
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return false;
  
  const hmac = createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(rawBody).digest("hex");
  
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function getWebhookSecret(): string | undefined {
  return process.env.GITHUB_WEBHOOK_SECRET;
}

export function verifyGitHubSignature(payload: string, signature: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return false;
  
  const hmac = createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}