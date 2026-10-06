 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * World Model embedding service
 *
 * Stores pgvector embeddings for projects, technologies, and artifacts.
 * Provider: OpenAI text-embedding-3-small (1536-d) or Gemini text-embedding-004.
 * Graceful no-op when DB extension / API keys are unavailable.
 */

import { createHash } from "crypto";
import { prisma } from "../database";

 

const DEFAULT_DIM = Number(process.env.WORLD_MODEL_EMBEDDING_DIM || 1536);
const OPENAI_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const GEMINI_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";

let tablesReady = false;

export async function ensureEmbeddingTables() {
  if (tablesReady) return true;
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS world_model_embeddings (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        content TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        embedding vector(${DEFAULT_DIM}),
        model TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(entity_type, entity_id)
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS world_model_embeddings_entity_idx ON world_model_embeddings(entity_type, entity_id)`
    );
    // ivfflat requires data; create if possible, ignore failures on empty tables
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS world_model_embeddings_vector_idx
        ON world_model_embeddings
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `);
    } catch (e2) {
      /* index may fail until enough rows exist */
    }
    tablesReady = true;
    return true;
  } catch (err) {
    console.warn(
      "[embeddings] ensure tables failed (pgvector may be unavailable):",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

function contentHash(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

function embeddingId(entityType, entityId) {
  return createHash("sha256").update(`${entityType}:${entityId}`).digest("hex").slice(0, 32);
}

/** Format float array as pgvector literal */
function toVectorLiteral(values) {
  return `[${values.map((v) => (Number.isFinite(v) ? v : 0)).join(",")}]`;
}

export async function embedText(text) {
  const input = text.slice(0, 8000).trim();
  if (!input) return null;

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: OPENAI_MODEL, input }),
      });
      if (res.ok) {
        const data = await res.json();
        const vector = _optionalChain([data, 'optionalAccess', _ => _.data, 'optionalAccess', _2 => _2[0], 'optionalAccess', _3 => _3.embedding]) ;
        if (_optionalChain([vector, 'optionalAccess', _4 => _4.length])) return { vector, model: OPENAI_MODEL };
      }
    } catch (e) {
      console.warn("[embeddings] OpenAI embed failed:", e);
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:embedContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${GEMINI_MODEL}`,
          content: { parts: [{ text: input }] },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const values = _optionalChain([data, 'optionalAccess', _5 => _5.embedding, 'optionalAccess', _6 => _6.values]) ;
        if (_optionalChain([values, 'optionalAccess', _7 => _7.length])) {
          // Pad/truncate to DEFAULT_DIM for schema stability
          const vector = values.slice(0, DEFAULT_DIM);
          while (vector.length < DEFAULT_DIM) vector.push(0);
          return { vector, model: GEMINI_MODEL };
        }
      }
    } catch (e) {
      console.warn("[embeddings] Gemini embed failed:", e);
    }
  }

  return null;
}

export async function upsertEmbedding(args




) {
  const ok = await ensureEmbeddingTables();
  if (!ok) return false;

  const hash = contentHash(args.content);
  try {
    const existing = await prisma.$queryRawUnsafe(
      `SELECT content_hash FROM world_model_embeddings WHERE entity_type=$1 AND entity_id=$2 LIMIT 1`,
      args.entityType,
      args.entityId
    );
    if (_optionalChain([existing, 'access', _8 => _8[0], 'optionalAccess', _9 => _9.content_hash]) === hash) return true; // unchanged
  } catch (e3) {
    /* continue */
  }

  const embedded = await embedText(args.content);
  if (!embedded) return false;

  const id = embeddingId(args.entityType, args.entityId);
  const vec = toVectorLiteral(embedded.vector);
  const meta = JSON.stringify(args.metadata || {});

  try {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO world_model_embeddings (id, entity_type, entity_id, content, content_hash, embedding, model, metadata, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6::vector, $7, $8::jsonb, NOW())
      ON CONFLICT (entity_type, entity_id) DO UPDATE SET
        content = EXCLUDED.content,
        content_hash = EXCLUDED.content_hash,
        embedding = EXCLUDED.embedding,
        model = EXCLUDED.model,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      `,
      id,
      args.entityType,
      args.entityId,
      args.content.slice(0, 4000),
      hash,
      vec,
      embedded.model,
      meta
    );
    return true;
  } catch (err) {
    console.warn(
      "[embeddings] upsert failed:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}









export async function similaritySearch(
  query,
  opts = {}
) {
  const limit = _nullishCoalesce(opts.limit, () => ( 12));
  const ok = await ensureEmbeddingTables();
  if (!ok) return [];

  const embedded = await embedText(query);
  if (!embedded) return [];

  const vec = toVectorLiteral(embedded.vector);
  const types = opts.entityTypes;

  try {
    let rows;
    if (_optionalChain([types, 'optionalAccess', _10 => _10.length])) {
      rows = await prisma.$queryRawUnsafe(
        `
        SELECT entity_type AS "entityType", entity_id AS "entityId", content, metadata,
          1 - (embedding <=> $1::vector) AS score
        FROM world_model_embeddings
        WHERE entity_type = ANY($2::text[])
        ORDER BY embedding <=> $1::vector
        LIMIT $3
        `,
        vec,
        types,
        limit
      );
    } else {
      rows = await prisma.$queryRawUnsafe(
        `
        SELECT entity_type AS "entityType", entity_id AS "entityId", content, metadata,
          1 - (embedding <=> $1::vector) AS score
        FROM world_model_embeddings
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        `,
        vec,
        limit
      );
    }

    return (rows || []).map((r) => ({
      entityType: r.entityType ,
      entityId: r.entityId,
      content: r.content,
      score: Number(r.score) || 0,
      metadata: r.metadata || {},
    }));
  } catch (err) {
    console.warn(
      "[embeddings] similarity search failed:",
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

/** Index all current World Model projects + technologies */
export async function reindexWorldModelEmbeddings()




 {
  const ok = await ensureEmbeddingTables();
  if (!ok) {
    return { projects: 0, technologies: 0, skipped: true, reason: "pgvector unavailable" };
  }

  if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    return { projects: 0, technologies: 0, skipped: true, reason: "no embedding API key" };
  }

  let projects = 0;
  let technologies = 0;

  try {
    const projRows = await prisma.$queryRawUnsafe(
      `SELECT id, name, repository, description, metadata FROM world_model_projects ORDER BY last_observed_at DESC LIMIT 200`
    );
    for (const p of projRows) {
      const content = [
        p.name,
        p.repository,
        p.description || "",
        typeof p.metadata === "object" ? JSON.stringify(p.metadata) : "",
      ].join(" \n ");
      if (await upsertEmbedding({ entityType: "project", entityId: p.id, content, metadata: { name: p.name } })) {
        projects++;
      }
    }

    const techRows = await prisma.$queryRawUnsafe(
      `SELECT id, name, category, metadata FROM world_model_technologies ORDER BY name ASC LIMIT 200`
    );
    for (const t of techRows) {
      const content = [t.name, t.category || "", typeof t.metadata === "object" ? JSON.stringify(t.metadata) : ""].join(
        " \n "
      );
      if (
        await upsertEmbedding({
          entityType: "technology",
          entityId: t.id,
          content,
          metadata: { name: t.name },
        })
      ) {
        technologies++;
      }
    }
  } catch (err) {
    return {
      projects,
      technologies,
      skipped: true,
      reason: err instanceof Error ? err.message : "reindex failed",
    };
  }

  return { projects, technologies, skipped: false };
}

/** Best-effort index for a single project after sync */
export async function indexProjectEmbedding(project





) {
  const content = [
    project.name,
    project.repository,
    project.description || "",
    typeof project.metadata === "object" && project.metadata ? JSON.stringify(project.metadata) : "",
  ].join(" \n ");
  await upsertEmbedding({
    entityType: "project",
    entityId: project.id,
    content,
    metadata: { name: project.name },
  });
}
