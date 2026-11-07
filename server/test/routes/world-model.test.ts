import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { NextFunction, Request, Response } from 'express';
import worldModelRoutes from '../../routes/world-model.js';
import {
  retrieveWorld,
  processWebhook,
  verifyGitHubSignature,
  syncPinnedProjects,
} from '../../lib/services/github-pinned.service.js';
import { retrieveWorldHybrid } from '../../lib/services/hybrid-retrieval.service.js';
import { geminiService } from '../../lib/services/gemini.service.js';
import { generateGroundedAnswer, getLlmProviderStatus } from '../../lib/services/llm-grounded.service.js';
import { reindexWorldModelEmbeddings } from '../../lib/services/embedding.service.js';
import { authMiddleware } from '../../lib/middleware/auth.middleware.js';
import { hardQueryRateLimiter } from '../../lib/middleware/production-security.js';

// Mock all external services — the routes are pure orchestration
vi.mock('../../lib/services/github-pinned.service.js', () => ({
  getPinnedWorldModelProjects: vi.fn(),
  getWorldModelGraph: vi.fn(),
  getAllProjectsEvidenceSummary: vi.fn(),
  getArtifactContent: vi.fn(),
  getProjectEvidence: vi.fn(),
  retrieveWorld: vi.fn(),
  processWebhook: vi.fn(),
  verifyGitHubSignature: vi.fn(),
  syncPinnedProjects: vi.fn(),
  verifyRepositoryCommit: vi.fn(),
}));
vi.mock('../../lib/services/hybrid-retrieval.service.js', () => ({
  retrieveWorldHybrid: vi.fn(),
}));
vi.mock('../../lib/services/embedding.service.js', () => ({
  reindexWorldModelEmbeddings: vi.fn(),
  ensureEmbeddingTables: vi.fn(),
}));
vi.mock('../../lib/services/temporal-reconstruction.service.js', () => ({
  reconstructProjectState: vi.fn(),
  listProjectEvents: vi.fn(),
}));
vi.mock('../../lib/services/webhook-provisioning.service.js', () => ({
  provisionWebhooksForWorldModel: vi.fn(),
  createOrUpdateWorldModelWebhook: vi.fn(),
  listRepoWebhooks: vi.fn(),
  getConfiguredWebhookUrl: vi.fn(),
}));
vi.mock('../../lib/services/world-model-maintenance.service.js', () => ({
  runWorldModelMaintenance: vi.fn(),
  getLastMaintenanceReport: vi.fn(),
  isMaintenanceRunning: vi.fn(),
}));
vi.mock('../../lib/services/gemini.service.js', () => ({
  geminiService: { generateInteractiveResponse: vi.fn() },
}));
vi.mock('../../lib/services/llm-grounded.service.js', () => ({
  generateGroundedAnswer: vi.fn(),
  getLlmProviderStatus: vi.fn(),
}));
vi.mock('../../lib/middleware/production-security.js', () => ({
  hardQueryRateLimiter: (req: Request, res: Response, next: NextFunction) => next(),
}));

// Auth middleware mock: rejects unless signedInUser is set on app locals
vi.mock('../../lib/middleware/auth.middleware.js', () => ({
  authMiddleware: vi.fn((req: any, _res: any, next: any) => {
    if (req.headers['x-test-user']) {
      req.user = {
        id: 'admin-1',
        email: 'admin@example.com',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'ADMIN',
        emailVerified: true,
        profileImageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };
    }
    next();
  }),
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

function baseRetrievalResult() {
  return {
    query: 'feex',
    explanation: 'base explanation',
    projects: [{ name: 'FeexSystems', description: 'd', repository: 'feex/repo' }],
    technologies: [{ name: 'React', projectCount: 2 }],
    artifacts: [],
    groundedEvidenceCount: 3,
  };
}

const app = express();
app.use(express.json());
app.use('/api/world-model', worldModelRoutes);

describe('World Model Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLlmProviderStatus).mockResolvedValue({ providers: [] } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('auth gating on writes', () => {
    it('rejects unauthenticated sync with 401', async () => {
      vi.mocked(authMiddleware).mockImplementationOnce(((_req: any, res: any) => {
        res.status(401).json({ success: false, error: 'Authentication required' });
      }) as any);

      const res = await request(app).post('/api/world-model/sync/github-pinned');
      expect([401, 403]).toContain(res.status);
      expect(vi.mocked(syncPinnedProjects)).not.toHaveBeenCalled();
    });

    it('allows admin sync when authenticated', async () => {
      vi.mocked(syncPinnedProjects).mockResolvedValue([] as any);
      vi.mocked(reindexWorldModelEmbeddings).mockResolvedValue({ indexed: 0 } as any);

      const res = await request(app)
        .post('/api/world-model/sync/github-pinned')
        .set('x-test-user', 'admin-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(vi.mocked(syncPinnedProjects)).toHaveBeenCalled();
    });
  });

  describe('webhook signature rejection', () => {
    it('returns 401 when the GitHub signature is invalid', async () => {
      vi.mocked(verifyGitHubSignature).mockReturnValue(false);

      const res = await request(app)
        .post('/api/world-model/webhook')
        .set('x-hub-signature-256', 'sha256=bad')
        .send({ zen: 'ping' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('signature');
      expect(vi.mocked(processWebhook)).not.toHaveBeenCalled();
    });

    it('processes the webhook when the signature is valid', async () => {
      vi.mocked(verifyGitHubSignature).mockReturnValue(true);
      vi.mocked(processWebhook).mockResolvedValue({ handled: true } as any);

      const res = await request(app)
        .post('/api/world-model/webhook')
        .set('x-hub-signature-256', 'sha256=good')
        .send({ repository: { default_branch: 'main' }, ref: 'refs/heads/main' });

      expect(res.status).toBe(202);
      expect(vi.mocked(processWebhook)).toHaveBeenCalled();
    });
  });

  describe('navigator fallback behavior', () => {
    it('returns 400 when the query is missing', async () => {
      const res = await request(app).get('/api/world-model/navigator');
      expect(res.status).toBe(400);
    });

    it('returns grounded data when both AI layers succeed', async () => {
      vi.mocked(retrieveWorldHybrid).mockResolvedValue(baseRetrievalResult() as any);
      vi.mocked(geminiService.generateInteractiveResponse).mockResolvedValue({
        explanation: 'ai explanation',
        suggestions: ['s1'],
        confidence: 0.9,
        groundedEvidenceCount: 3,
        mode: 'interactions-api',
        model: 'gemini-3.7-flash',
      } as any);
      vi.mocked(generateGroundedAnswer).mockResolvedValue({
        text: 'grounded text',
        provider: 'gemini',
        model: 'gemini-3.7-flash',
        usedFallback: false,
        suggestions: ['s2'],
      });

      const res = await request(app).get('/api/world-model/navigator?q=feex');
      expect(res.status).toBe(200);
      expect(res.body.data.explanation).toBe('grounded text');
      expect(res.body.data.llm.provider).toBe('gemini');
      expect(res.body.data.aiModel).toBe('gemini-3.7-flash');
    });

    it('falls back to raw retrieval when both AI layers throw', async () => {
      vi.mocked(retrieveWorldHybrid).mockResolvedValue(baseRetrievalResult() as any);
      vi.mocked(geminiService.generateInteractiveResponse).mockRejectedValue(new Error('gemini down'));
      vi.mocked(generateGroundedAnswer).mockRejectedValue(new Error('llm down'));

      const res = await request(app).get('/api/world-model/navigator?q=feex');
      expect(res.status).toBe(200);
      expect(res.body.data.explanation).toBe('base explanation');
      expect(res.body.data.llm).toEqual({ provider: 'none', usedFallback: true, suggestions: [] });
    });

    it('POST navigator falls back the same way', async () => {
      vi.mocked(retrieveWorldHybrid).mockResolvedValue(baseRetrievalResult() as any);
      vi.mocked(geminiService.generateInteractiveResponse).mockRejectedValue(new Error('down'));
      vi.mocked(generateGroundedAnswer).mockRejectedValue(new Error('down'));

      const res = await request(app)
        .post('/api/world-model/navigator')
        .send({ query: 'feex' });

      expect(res.status).toBe(200);
      expect(res.body.data.llm.usedFallback).toBe(true);
    });
  });

  describe('navigator keyword-only mode', () => {
    it('uses retrieveWorld when hybrid=false', async () => {
      vi.mocked(retrieveWorld).mockResolvedValue(baseRetrievalResult() as any);
      vi.mocked(geminiService.generateInteractiveResponse).mockRejectedValue(new Error('down'));
      vi.mocked(generateGroundedAnswer).mockRejectedValue(new Error('down'));

      await request(app).get('/api/world-model/navigator?q=feex&hybrid=false');
      expect(vi.mocked(retrieveWorld)).toHaveBeenCalled();
      expect(vi.mocked(retrieveWorldHybrid)).not.toHaveBeenCalled();
    });
  });
});
