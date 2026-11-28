/** @vitest-environment node */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../../index';

vi.mock('../../lib/services/embedding.service', () => ({
  embedText: vi.fn(async (text: string) =>
    text === 'fail' ? null : { vector: [0.1, 0.2], model: 'test-embed' }
  ),
}));

vi.mock('../../lib/services/ai-gateway.service', () => ({
  aiGateway: {
    generateText: vi.fn(async () => ({ text: 'ok', provider: 'gemini', model: 'test' })),
  },
}));

const app = createServer();
const KEY = 'test-bq-key';

describe('POST /api/bq-remote', () => {
  beforeEach(() => {
    process.env.BQ_REMOTE_FUNCTION_KEY = KEY;
  });

  it('rejects missing key', async () => {
    await request(app).post('/api/bq-remote').send({ calls: [['registry']] }).expect(401);
  });

  it('accepts the key via path segment (BigQuery cannot send headers)', async () => {
    const res = await request(app)
      .post(`/api/bq-remote/${KEY}`)
      .send({ calls: [['registry']] })
      .expect(200);
    expect(res.body.replies[0]).toContain('embed');
  });

  it('fixes the function via /<fn>/<key> path (BQ 1:1 SQL function mapping)', async () => {
    const res = await request(app)
      .post(`/api/bq-remote/embed/${KEY}`)
      .send({ calls: [['hello'], ['fail']] })
      .expect(200);
    expect(res.body.replies[0]).toEqual([0.1, 0.2]);
    expect(res.body.replies[1]).toHaveProperty('error');
  });

  it('404s on unknown fn in path', async () => {
    await request(app)
      .post(`/api/bq-remote/nope/${KEY}`)
      .send({ calls: [['x']] })
      .expect(404);
  });

  it('rejects a wrong path key', async () => {
    await request(app)
      .post('/api/bq-remote/wrong-key')
      .send({ calls: [['registry']] })
      .expect(401);
  });

  it('fails closed when env key is unset', async () => {
    delete process.env.BQ_REMOTE_FUNCTION_KEY;
    await request(app)
      .post('/api/bq-remote')
      .set('x-bq-remote-key', KEY)
      .send({ calls: [['registry']] })
      .expect(503);
  });

  it('rejects non-batch bodies', async () => {
    await request(app)
      .post('/api/bq-remote')
      .set('x-bq-remote-key', KEY)
      .send({ nope: true })
      .expect(400);
  });

  it('returns positional replies incl. per-row errors', async () => {
    const res = await request(app)
      .post('/api/bq-remote')
      .set('x-bq-remote-key', KEY)
      .send({
        calls: [
          ['registry'],
          ['embed', 'hello'],
          ['embed', 'fail'],
          ['nope'],
          ['llm.text', 'sys', 'user'],
        ],
      })
      .expect(200);

    expect(res.body.replies).toHaveLength(5);
    expect(res.body.replies[0]).toContain('embed');
    expect(res.body.replies[1]).toEqual([0.1, 0.2]);
    expect(res.body.replies[2]).toHaveProperty('error');
    expect(res.body.replies[3]).toHaveProperty('error');
    expect(res.body.replies[4]).toBe('ok');
  });

  it('caps batch size', async () => {
    const calls = Array.from({ length: 501 }, () => ['registry']);
    await request(app)
      .post('/api/bq-remote')
      .set('x-bq-remote-key', KEY)
      .send({ calls })
      .expect(400);
  });
});
