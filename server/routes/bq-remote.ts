/**
 * BigQuery Remote Functions endpoint.
 *
 * Implements the BigQuery batch I/O contract:
 *   POST { "calls": [[fn, ...args], ...] }  ->  { "replies": [...] }
 *
 * Each call's first argument is the function name; remaining args are passed
 * to the registered handler. Replies are positional — one entry per call.
 * A failed call returns { "error": "..." } as its reply rather than failing
 * the whole batch (BigQuery treats per-row errors as data, not HTTP errors).
 *
 * Auth: shared secret must equal BQ_REMOTE_FUNCTION_KEY. Accepted via the
 * `x-bq-remote-key` header OR the `/:key` path segment — BigQuery Remote
 * Functions cannot send custom headers, so the DDL endpoint URL carries the
 * key (e.g. OPTIONS (endpoint = 'https://<host>/api/bq-remote/<key>')).
 * Fails closed when the env var is unset — this endpoint executes provider
 * calls (embeddings, LLM) and must never be publicly reachable.
 */

import { Router, Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";
import { embedText } from "../lib/services/embedding.service";
import { aiGateway } from "../lib/services/ai-gateway.service";

const router = Router();

const MAX_CALLS_PER_BATCH = 500;

type RemoteFn = (args: unknown[]) => Promise<unknown>;

function asString(v: unknown, name: string): string {
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return v;
}

const registry: Record<string, { description: string; fn: RemoteFn }> = {
  embed: {
    description: "Return the embedding vector for a text (provider: OpenAI/Gemini per env).",
    fn: async (args) => {
      const embedded = await embedText(asString(args[0], "text"));
      if (!embedded) throw new Error("embedding provider unavailable");
      return embedded.vector;
    },
  },
  "llm.text": {
    description: "Generate text. Args: system prompt, user prompt, optional {temperature, maxTokens}.",
    fn: async (args) => {
      const system = asString(args[0], "system");
      const user = asString(args[1], "user");
      const opts = (args[2] ?? {}) as { temperature?: number; maxTokens?: number };
      const out = await aiGateway.generateText(system, user, {
        temperature: typeof opts.temperature === "number" ? opts.temperature : undefined,
        maxTokens: typeof opts.maxTokens === "number" ? opts.maxTokens : undefined,
        timeoutMs: 60_000,
      });
      if (!out?.text) throw new Error("LLM provider unavailable");
      return out.text;
    },
  },
  registry: {
    description: "List registered remote functions (no provider calls).",
    fn: async () => Object.keys(registry),
  },
};

function requireRemoteKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.BQ_REMOTE_FUNCTION_KEY;
  if (!expected) {
    res.status(503).json({ errorMessage: "BQ_REMOTE_FUNCTION_KEY not configured" });
    return;
  }
  const provided = req.header("x-bq-remote-key") ?? (req.params.key as string | undefined) ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ errorMessage: "invalid remote-function key" });
    return;
  }
  next();
}

router.post(["/", "/:key"], requireRemoteKey, async (req: Request, res: Response) => {
  const calls = (req.body as { calls?: unknown })?.calls;
  if (!Array.isArray(calls)) {
    res.status(400).json({ errorMessage: "Invalid batch format: 'calls' array required" });
    return;
  }
  if (calls.length > MAX_CALLS_PER_BATCH) {
    res.status(400).json({ errorMessage: `Batch too large: max ${MAX_CALLS_PER_BATCH} calls` });
    return;
  }

  const replies: unknown[] = [];
  for (const call of calls) {
    if (!Array.isArray(call) || call.length === 0) {
      replies.push({ error: "each call must be a non-empty args array" });
      continue;
    }
    const [name, ...args] = call as [string, ...unknown[]];
    const entry = registry[name];
    if (!entry) {
      replies.push({ error: `unknown function '${String(name)}'` });
      continue;
    }
    try {
      replies.push(await entry.fn(args));
    } catch (err) {
      replies.push({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  res.status(200).json({ replies });
});

export default router;
