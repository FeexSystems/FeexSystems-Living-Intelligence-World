#!/usr/bin/env node
/**
 * Environment preflight — verifies local dev infrastructure before you debug
 * the app itself.
 *
 *   npm run env:check
 *
 * Checks, in order:
 *   1. Prisma can reach PostgreSQL through DATABASE_URL   (runtime / pooled)
 *   2. Prisma can reach PostgreSQL through DIRECT_URL     (migrations)
 *   3. Redis answers PING on REDIS_URL                    (OPTIONAL by default)
 *
 * Redis is reported as a warning, not a failure: the app degrades to
 * in-process caching locally and readiness gating is handled by /health/ready.
 * Pass --require-redis to make a missing Redis exit non-zero.
 *
 * Exit codes: 0 = usable, 1 = database problem (or Redis when --require-redis).
 *
 * SECURITY: connection strings are NEVER printed — only host:port/database.
 */
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

dotenv.config();

/** Render a connection string safely: scheme://host:port/db only. */
function describeUrl(raw) {
  if (!raw) return '<unset>';
  try {
    const u = new URL(raw);
    const db = u.pathname && u.pathname !== '/' ? u.pathname : '';
    return `${u.protocol}//${u.hostname}:${u.port || '(default)'}${db}`;
  } catch {
    return '<invalid URL>';
  }
}

const results = [];

/**
 * Run a real query through a Prisma client bound to a specific env var.
 * Prisma's datasource `url` reads process.env.DATABASE_URL, so for DIRECT_URL
 * we instantiate a client with an explicit datasource override.
 */
async function probeDatabase(label, envKey) {
  const raw = process.env[envKey];
  if (!raw) {
    results.push({ label, ok: false, detail: `${envKey} is not set` });
    return;
  }

  const client = new PrismaClient(
    envKey === 'DATABASE_URL'
      ? { log: ['error'] }
      : { log: ['error'], datasources: { db: { url: raw } } },
  );

  const started = Date.now();
  try {
    await client.$queryRawUnsafe('SELECT 1 as ok');
    results.push({ label, ok: true, detail: `${describeUrl(raw)} (${Date.now() - started}ms)` });
  } catch (error) {
    const message = String(error?.message ?? error).split('\n').filter(Boolean).pop() ?? 'unknown';
    results.push({ label, ok: false, detail: `${describeUrl(raw)} — ${message.slice(0, 200)}` });
  } finally {
    await client.$disconnect().catch(() => {});
  }
}

async function probeRedis(required) {
  const raw = process.env.REDIS_URL;
  if (!raw) {
    results.push({ label: 'Redis', ok: !required, warn: true, detail: 'REDIS_URL is not set' });
    return;
  }

  const client = new Redis(raw, {
    lazyConnect: true,
    connectTimeout: 3000,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null,
    enableReadyCheck: false,
  });
  // ioredis re-emits connection errors; without a listener Node would warn.
  client.on('error', () => {});

  try {
    await client.connect();
    const pong = await client.ping();
    results.push({ label: 'Redis', ok: true, detail: `${describeUrl(raw)} (PONG: ${pong})` });
  } catch (error) {
    const code = error?.code || error?.message || 'unreachable';
    results.push({
      label: 'Redis',
      ok: !required,
      warn: true,
      detail: `${describeUrl(raw)} — ${code}${required ? '' : ' — optional locally, app degrades gracefully'}`,
    });
  } finally {
    client.disconnect();
  }
}

const requireRedis = process.argv.includes('--require-redis');

await probeDatabase('Database (DATABASE_URL)', 'DATABASE_URL');
await probeDatabase('Database (DIRECT_URL)', 'DIRECT_URL');
await probeRedis(requireRedis);

console.log('\n  FeexSystems environment preflight\n  ' + '-'.repeat(52));
for (const r of results) {
  const mark = (r.ok ? (r.warn ? 'WARN' : 'PASS') : 'FAIL').padEnd(4);
  console.log(`  [${mark}] ${r.label.padEnd(26)} ${r.detail}`);
}
console.log('  ' + '-'.repeat(52) + '\n');

const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  console.error(`  ${failed.length} check(s) failed.\n`);
  process.exit(1);
}

console.log('  All required checks passed.\n');
process.exit(0);
