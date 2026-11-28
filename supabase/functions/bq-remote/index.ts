/**
 * BigQuery Remote Functions endpoint — Supabase Edge Function (Deno).
 *
 * Standalone port of server/routes/bq-remote.ts for environments where the
 * GCP `api` Cloud Function cannot be deployed (e.g. billing disabled).
 * Implements the BigQuery batch I/O contract:
 *   POST { "calls": [[...args], ...] }  ->  { "replies": [...] }
 *
 * Routing (path is relative to /functions/v1/bq-remote):
 *   /                 — x-bq-remote-key header; first arg of each call = fn name
 *   /<key>            — key in path; same dispatch
 *   /<fn>/<key>       — fn fixed by path (1:1 BQ SQL function mapping)
 *
 * Auth: shared secret must equal BQ_REMOTE_FUNCTION_KEY (Supabase secret).
 * Fails closed (503) when unset. Per-row errors are returned as {error}
 * replies rather than failing the batch.
 */

import { serve } from "https://deno.land/std@0.223.0/http/server.ts";

const MAX_CALLS_PER_BATCH = 500;
const DEFAULT_DIM = Number(Deno.env.get("WORLD_MODEL_EMBEDDING_DIM") || 1536);
const OPENAI_EMBED_MODEL = Deno.env.get("OPENAI_EMBEDDING_MODEL") || "text-embedding-3-small";
const GEMINI_EMBED_MODEL = Deno.env.get("GEMINI_EMBEDDING_MODEL") || "text-embedding-004";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash";
const OPENAI_CHAT_MODEL = Deno.env.get("OPENAI_CHAT_MODEL") || "gpt-4o-mini";

type RemoteFn = (args: unknown[]) => Promise<unknown>;

function asString(v: unknown, name: string): string {
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return v;
}

async function embedText(text: string): Promise<{ vector: number[]; model: string } | null> {
  const input = text.slice(0, 8000).trim();
  if (!input) return null;

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: OPENAI_EMBED_MODEL, input }),
      });
      if (res.ok) {
        const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
        const vector = data?.data?.[0]?.embedding;
        if (vector?.length) return { vector, model: OPENAI_EMBED_MODEL };
      }
    } catch { /* fall through to Gemini */ }
  }

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: `models/${GEMINI_EMBED_MODEL}`,
            content: { parts: [{ text: input }] },
          }),
        }
      );
      if (res.ok) {
        const data = (await res.json()) as { embedding?: { values?: number[] } };
        const values = data?.embedding?.values;
        if (values?.length) {
          const vector = values.slice(0, DEFAULT_DIM);
          while (vector.length < DEFAULT_DIM) vector.push(0);
          return { vector, model: GEMINI_EMBED_MODEL };
        }
      }
    } catch { /* no provider available */ }
  }
  return null;
}

async function generateText(
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number }
): Promise<string | null> {
  const timeoutMs = 60_000;
  const preferred = (Deno.env.get("DEFAULT_AI_PROVIDER") || "gemini").toLowerCase();

  const gemini = async (): Promise<string | null> => {
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) return null;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }],
          generationConfig: {
            temperature: opts.temperature ?? 0.25,
            maxOutputTokens: opts.maxTokens ?? 1024,
          },
        }),
      }
    );
    if (!res.ok) throw new Error(`gemini HTTP ${res.status}`);
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  };

  const openai = async (): Promise<string | null> => {
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return null;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model: OPENAI_CHAT_MODEL,
        temperature: opts.temperature ?? 0.25,
        max_tokens: opts.maxTokens ?? 1024,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`openai HTTP ${res.status}`);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data?.choices?.[0]?.message?.content ?? null;
  };

  const order = preferred === "openai" ? [openai, gemini] : [gemini, openai];
  for (const fn of order) {
    try {
      const text = await fn();
      if (text) return text;
    } catch { /* try next provider */ }
  }
  return null;
}

const registry: Record<string, { description: string; fn: RemoteFn }> = {
  embed: {
    description: "Return the embedding vector for a text (OpenAI then Gemini per env).",
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
      const text = await generateText(system, user, {
        temperature: typeof opts.temperature === "number" ? opts.temperature : undefined,
        maxTokens: typeof opts.maxTokens === "number" ? opts.maxTokens : undefined,
      });
      if (!text) throw new Error("LLM provider unavailable");
      return text;
    },
  },
  registry: {
    description: "List registered remote functions (no provider calls).",
    fn: async () => Object.keys(registry),
  },
};

function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (req.method !== "POST") {
    return Response.json({ errorMessage: "method not allowed" }, { status: 405 });
  }

  // Path relative to /functions/v1/bq-remote — e.g. "/embed/<key>" or "/<key>" or "/".
  const url = new URL(req.url);
  const marker = "/bq-remote";
  const idx = url.pathname.indexOf(marker);
  const rel = idx >= 0 ? url.pathname.slice(idx + marker.length) : url.pathname;
  const segments = rel.split("/").filter(Boolean).map(decodeURIComponent);

  const expected = Deno.env.get("BQ_REMOTE_FUNCTION_KEY");
  if (!expected) {
    return Response.json({ errorMessage: "BQ_REMOTE_FUNCTION_KEY not configured" }, { status: 503 });
  }

  let fixedFn: string | undefined;
  let key: string | undefined;
  if (segments.length >= 2) {
    fixedFn = segments[0];
    key = segments[1];
    if (!registry[fixedFn]) {
      return Response.json({ errorMessage: `unknown remote function '${fixedFn}'` }, { status: 404 });
    }
  } else if (segments.length === 1) {
    key = segments[0];
  }

  const provided = req.headers.get("x-bq-remote-key") ?? key ?? "";
  if (!timingSafeEq(provided, expected)) {
    return Response.json({ errorMessage: "invalid remote-function key" }, { status: 401 });
  }

  let body: { calls?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ errorMessage: "Invalid batch format: JSON body required" }, { status: 400 });
  }

  const calls = body?.calls;
  if (!Array.isArray(calls)) {
    return Response.json({ errorMessage: "Invalid batch format: 'calls' array required" }, { status: 400 });
  }
  if (calls.length > MAX_CALLS_PER_BATCH) {
    return Response.json(
      { errorMessage: `Batch too large: max ${MAX_CALLS_PER_BATCH} calls` },
      { status: 400 }
    );
  }

  const replies: unknown[] = [];
  for (const call of calls) {
    if (!Array.isArray(call)) {
      replies.push({ error: "each call must be an args array" });
      continue;
    }
    const effective = fixedFn ? ([fixedFn, ...call] as [string, ...unknown[]]) : (call as [string, ...unknown[]]);
    if (effective.length === 0) {
      replies.push({ error: "each call must be a non-empty args array" });
      continue;
    }
    const [name, ...args] = effective;
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

  return Response.json({ replies });
});
