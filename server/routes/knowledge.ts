/**
 * Knowledge & Document AI routes (Mission 005).
 *
 * All routes require a verified Firebase ID token; the tenant is always
 * `req.user.id`. Uploads are size- and type-restricted.
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import { authMiddleware, rateLimit } from '../lib/middleware/auth.middleware';
import { knowledgeService, KnowledgeError } from '../lib/services/knowledge.service';
import { askKnowledgeQuestionSchema } from '../lib/validations/knowledge';
import { ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_BYTES } from '../../shared/knowledge';

const router = express.Router();
router.use(authMiddleware);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if ((ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported document type: ${file.mimetype}`));
    }
  },
});

const ingestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  scope: 'knowledge-ingest',
  message: 'Too many document uploads. Please try again later.',
});

function sendError(res: Response, error: unknown, fallbackCode: string): Response {
  if (error instanceof KnowledgeError) {
    return res.status(error.statusCode).json({
      success: false,
      error: { type: 'KNOWLEDGE_ERROR', message: error.message, code: error.code, timestamp: new Date().toISOString() },
    });
  }
  console.error(`[knowledge] ${fallbackCode}`, error);
  return res.status(500).json({
    success: false,
    error: { type: 'INTERNAL_SERVER_ERROR', message: 'Knowledge operation failed', code: fallbackCode, timestamp: new Date().toISOString() },
  });
}

router.get('/health', (_req: Request, res: Response) => {
  const extractionConfigured = false; // no OCR provider is configured in this environment
  res.json({
    success: true,
    data: { service: 'knowledge', authMode: 'firebase', extraction: extractionConfigured ? 'configured' : 'native-text-only' },
    timestamp: new Date().toISOString(),
  });
});

router.post('/documents', ingestLimiter, upload.single('file'), async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) {
    return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, error: { type: 'VALIDATION_ERROR', message: 'A file is required', code: 'FILE_REQUIRED', timestamp: new Date().toISOString() } });
  }

  try {
    const document = await knowledgeService.ingestDocument({
      teamId: tenantId,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
    });
    return res.status(201).json({ success: true, data: { document }, timestamp: new Date().toISOString() });
  } catch (error) {
    return sendError(res, error, 'DOCUMENT_INGEST_FAILED');
  }
});

router.get('/documents', async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) {
    return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  }
  try {
    const documents = await knowledgeService.listDocuments(tenantId);
    return res.json({ success: true, data: { documents }, timestamp: new Date().toISOString() });
  } catch (error) {
    return sendError(res, error, 'DOCUMENT_LIST_FAILED');
  }
});

router.get('/documents/:id', async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) {
    return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  }
  try {
    const document = await knowledgeService.getDocument(tenantId, req.params.id);
    return res.json({ success: true, data: { document }, timestamp: new Date().toISOString() });
  } catch (error) {
    return sendError(res, error, 'DOCUMENT_FETCH_FAILED');
  }
});

router.post('/ask', async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) {
    return res.status(401).json({ success: false, error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', timestamp: new Date().toISOString() } });
  }
  const parsed = askKnowledgeQuestionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { type: 'VALIDATION_ERROR', message: 'Question validation failed', code: 'VALIDATION_FAILED', details: parsed.error.issues, timestamp: new Date().toISOString() } });
  }
  try {
    const answer = await knowledgeService.ask({ teamId: tenantId, question: parsed.data.question, documentIds: parsed.data.documentIds });
    return res.json({ success: true, data: { answer }, timestamp: new Date().toISOString() });
  } catch (error) {
    return sendError(res, error, 'KNOWLEDGE_ASK_FAILED');
  }
});

export default router;
