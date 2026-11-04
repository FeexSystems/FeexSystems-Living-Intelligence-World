 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Knowledge & Document AI service (Mission 005).
 *
 * Ingestion validates type/size, stores through the existing private storage
 * adapter, and extracts native text where possible. PDF documents are passed
 * through the procedural PDF text extraction pipeline; when extraction
 * succeeds the document is chunked and indexed, otherwise it is marked
 * EXTRACTION_UNAVAILABLE. The service never claims extraction succeeded when
 * it did not run.
 */

import { createHash } from 'crypto';




import { prisma } from '../database';
import { gcsService } from './gcs.service';
import { aiGateway } from './ai-gateway.service';
import { extractPdfText } from './pdf-extraction';
import { modelKnowledgeAnswerSchema } from '../validations/knowledge';
import {
  buildKnowledgePrompt,
  chunkText,
  extractiveAnswer,
  KNOWLEDGE_SYSTEM_PROMPT,

  validateCitations,
} from './knowledge-retrieval';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,


  MAX_DOCUMENT_BYTES,
} from '../../../shared/knowledge';

export class KnowledgeError extends Error {
  constructor(
    message,
     code,
     statusCode
  ) {
    super(message);this.code = code;this.statusCode = statusCode;;
    this.name = 'KnowledgeError';
  }
}

const TEXT_MIME_TYPES = new Set(['text/plain', 'text/markdown']);















export class KnowledgeService {
  /** Validate, store, extract and chunk a document. */
  async ingestDocument(input






) {
    const { teamId, filename, mimeType, buffer } = input;

    if (!(ALLOWED_DOCUMENT_MIME_TYPES ).includes(mimeType)) {
      throw new KnowledgeError(
        `Unsupported document type: ${mimeType}`,
        'UNSUPPORTED_DOCUMENT_TYPE',
        415
      );
    }
    if (buffer.length === 0) {
      throw new KnowledgeError('Document is empty', 'EMPTY_DOCUMENT', 400);
    }
    if (buffer.length > MAX_DOCUMENT_BYTES) {
      throw new KnowledgeError('Document exceeds the 5 MB limit', 'DOCUMENT_TOO_LARGE', 413);
    }

    const contentHash = createHash('sha256').update(buffer).digest('hex');

    let storageKey = null;
    try {
      const stored = await gcsService.uploadArtifact(
        `knowledge/${teamId}/${contentHash}-${filename}`,
        buffer,
        { contentType: mimeType, isPublic: false }
      );
      storageKey = stored.success ? stored.url : null;
    } catch (e) {
      storageKey = null;
    }

    const isText = TEXT_MIME_TYPES.has(mimeType);
    const isPdf = mimeType === 'application/pdf';

    let extractedText = null;
    let extractedPageCount = null;

    if (isPdf) {
      const extraction = extractPdfText(buffer);
      if (extraction) {
        extractedText = extraction.text;
        extractedPageCount = extraction.pageCount;
      }
    }

    const status = isText || extractedText !== null
      ? 'READY'
      : 'EXTRACTION_UNAVAILABLE';
    const extractionMethod = isText || extractedText !== null
      ? 'NATIVE_TEXT'
      : 'UNAVAILABLE';

    const document = await prisma.knowledgeDocument.create({
      data: {
        teamId,
        createdByUserId: _nullishCoalesce(input.actorUserId, () => ( null)),
        filename,
        mimeType,
        sizeBytes: buffer.length,
        contentHash,
        storageKey,
        status,
        extractionMethod,
        error: (isText || extractedText !== null)
          ? null
          : 'No text could be extracted from this PDF. It cannot be used for Q&A until an OCR provider is configured.',
        pageCount: extractedPageCount,
      },
    });

    const textToChunk = isText
      ? buffer.toString('utf8')
      : _nullishCoalesce(extractedText, () => ( ''));

    if (textToChunk) {
      const drafts = chunkText(textToChunk);
      for (const draft of drafts) {
        await prisma.knowledgeDocumentChunk.create({
          data: {
            documentId: document.id,
            ordinal: draft.ordinal,
            page: draft.page,
            section: draft.section,
            content: draft.content,
            charCount: draft.charCount,
          },
        });
      }
      const pages = drafts.map((d) => _nullishCoalesce(d.page, () => ( 0)));
      await prisma.knowledgeDocument.update({
        where: { id: document.id },
        data: { pageCount: Math.max(1, ...pages) },
      });
    }

    return this.toDocumentDTO(document );
  }

  async listDocuments(teamId) {
    const documents = await prisma.knowledgeDocument.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(documents.map((doc) => this.withChunkCount(doc )));
  }

  async getDocument(teamId, id) {
    const document = await prisma.knowledgeDocument.findFirst({ where: { id, teamId } });
    if (!document) throw new KnowledgeError('Document not found', 'DOCUMENT_NOT_FOUND', 404);
    return this.withChunkCount(document );
  }

  /**
   * Evidence-linked question answering. Citations must reference retrieved
   * chunks; fabricated ids are dropped and reported as a limitation.
   */
  async ask(input



) {
    const chunks = (await prisma.knowledgeDocumentChunk.findMany({
      where: {
        document: {
          teamId: input.teamId,
          ...(_optionalChain([input, 'access', _ => _.documentIds, 'optionalAccess', _2 => _2.length]) ? { id: { in: input.documentIds } } : {}),
        },
      },
      take: 8,
      orderBy: { createdAt: 'asc' },
    })) ;

    if (chunks.length === 0) {
      return {
        question: input.question,
        answer:
          'No processed document content is available for this question. Nothing is answered rather than inventing a source.',
        citations: [],
        limitations: ['No retrievable document chunks were found for this tenant.'],
        provider: 'none',
        model: null,
        supported: false,
      };
    }

    try {
      const ai = await aiGateway.generateObject(
        KNOWLEDGE_SYSTEM_PROMPT,
        buildKnowledgePrompt(chunks, input.question),
        { temperature: 0.1, maxTokens: 1200 }
      );

      if (_optionalChain([ai, 'optionalAccess', _3 => _3.object])) {
        const parsed = modelKnowledgeAnswerSchema.safeParse(ai.object);
        if (parsed.success) {
          const { citations, droppedCount } = validateCitations(parsed.data.citations, chunks);
          const limitations = [...parsed.data.limitations];
          if (droppedCount > 0) {
            limitations.push(
              `${droppedCount} citation(s) referenced sources that were not retrieved and were removed.`
            );
          }
          return {
            question: input.question,
            answer: parsed.data.answer,
            citations,
            limitations,
            provider: ai.provider,
            model: _nullishCoalesce(ai.model, () => ( null)),
            supported: citations.length > 0,
          };
        }
      }
    } catch (error) {
      console.warn('[knowledge] provider error; using extractive answer', error);
    }

    const fallback = extractiveAnswer(chunks, input.question);
    return {
      question: input.question,
      answer: fallback.answer,
      citations: fallback.citations,
      limitations: [
        'No AI provider is configured or the model response was unusable; this is an extractive answer from stored text.',
      ],
      provider: 'deterministic',
      model: null,
      supported: fallback.supported,
    };
  }

   async withChunkCount(document) {
    const chunkCount = await prisma.knowledgeDocumentChunk.count({
      where: { documentId: document.id },
    });
    return { ...this.toDocumentDTO(document), chunkCount };
  }

   toDocumentDTO(document) {
    return {
      id: document.id,
      teamId: document.teamId,
      filename: document.filename,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      contentHash: document.contentHash,
      status: document.status ,
      extractionMethod: document.extractionMethod ,
      pageCount: document.pageCount,
      error: document.error,
      chunkCount: 0,
      createdAt: document.createdAt.toISOString(),
    };
  }
}

export const knowledgeService = new KnowledgeService();
