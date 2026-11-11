 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Feex World Intelligence â€” interpretation routes (Mission 003).
 *
 * Canonical World Model reads remain on /api/world-model. These routes expose
 * AI interpretations that are stored separately from canonical records.
 */

import express, { } from 'express';
import { authMiddleware } from '../lib/middleware/auth.middleware';
import { hardQueryRateLimiter } from '../lib/middleware/production-security';
import {
  worldIntelligenceService,
  WorldIntelligenceError,
} from '../lib/services/world-intelligence.service';
import { interpretWorldRequestSchema } from '../lib/validations/world-intelligence';

import { param } from '../lib/utils/route-params';

const router = express.Router();
router.use(authMiddleware);

function sendError(res, error, fallbackCode) {
  if (error instanceof WorldIntelligenceError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        type: 'WORLD_INTELLIGENCE_ERROR',
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      },
    });
  }
  console.error(`[world-intelligence] ${fallbackCode}`, error);
  return res.status(500).json({
    success: false,
    error: {
      type: 'INTERNAL_SERVER_ERROR',
      message: 'The interpretation request could not be completed.',
      code: fallbackCode,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * POST /api/world-model/intelligence
 * Produce a citation-validated interpretation of a canonical project.
 */
router.post('/', hardQueryRateLimiter, async (req, res) => {
  const parsed = interpretWorldRequestSchema.safeParse(_nullishCoalesce(req.body, () => ( {})));
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Interpretation request validation failed',
        code: 'VALIDATION_FAILED',
        details: parsed.error.issues,
        timestamp: new Date().toISOString(),
      },
    });
  }

  try {
    const interpretation = await worldIntelligenceService.interpret({
      projectId: parsed.data.projectId,
      question: parsed.data.question,
      actorId: _optionalChain([req, 'access', _ => _.user, 'optionalAccess', _2 => _2.id]),
    });

    return res.json({
      success: true,
      message: 'Interpretation generated. Canonical records were not modified.',
      data: { interpretation },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return sendError(res, error, 'INTERPRETATION_FAILED');
  }
});

/**
 * GET /api/world-model/intelligence/:projectId
 * List previously generated interpretations for a project.
 */
router.get('/:projectId', async (req, res) => {
  try {
    const limit = Number.parseInt(String(_nullishCoalesce(req.query.limit, () => ( '20'))), 10);
    const interpretations = await worldIntelligenceService.listInterpretations(
      param(req, 'projectId'),
      Number.isFinite(limit) ? limit : 20
    );

    return res.json({
      success: true,
      data: { interpretations, total: interpretations.length },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return sendError(res, error, 'INTERPRETATION_LIST_FAILED');
  }
});

export default router;
