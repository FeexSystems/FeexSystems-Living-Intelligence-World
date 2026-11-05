/**
 * Feex AI Operations routes (Mission 001).
 *
 * All routes require a verified Firebase ID token. The tenant is always the
 * authenticated user id taken from `req.user` â€” never from the request body.
 */

import express, { } from 'express';
import { authMiddleware, } from '../lib/middleware/auth.middleware';
import { resolveTenantKey, } from '../lib/middleware/tenant-key.middleware';










const router = express.Router();

// Authenticate every operations route.
router.use(authMiddleware);
// Resolve the tenant key (Team-scoped once migrated; legacy uid until then).
router.use(resolveTenantKey);
router.get('/health', (_req, res) => {
  const aiConfigured = Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
  res.json({
    success: true,
    data: {
      authMode: 'firebase',
      ai: aiConfigured ? 'configured' : 'deterministic-fallback',
    },
    timestamp: new Date().toISOString(),
  });
});
export default router;
