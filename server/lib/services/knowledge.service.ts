/**
 * Knowledge & Document AI service (Mission 005).
 *
 * Ingestion validates type/size, stores through the existing private storage
 * adapter, and extracts native text where possible. PDF (and any other binary)
 * is marked EXTRACTION_UNAVAILABLE when no OCR pipeline is configured — the
 * service never claims extraction succeeded when it did not run.
 */

import { createHash } from 'crypto';
import {
  KnowledgeDocumentStatus,
  KnowledgeExtractionMethod,
} from '@prisma/client';
import { prisma } from '../database';
import { gcsService } from './gcs.service';
import { aiGateway } from './ai-gateway.service';
import { modelKnowledgeAnswerSchema } from '../validations/knowledge';
import {
  buildKnowledgePrompt,
  chunkText,
  extractiveAnswer,
  KNOWLEDGE_SYSTEM_PROMPT,
  RetrievedChunk,
  validateCitations,
} from './knowledge-retrieval';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  KnowledgeAnswerDTO,
  KnowledgeDocumentDTO,
  MAX_DOCUMENT_BYTES,
} from '../../../shared/knowledge';

export class KnowledgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'KnowledgeError';
  }
}

const TEXT_MIME_TYPES = new Set(['text/plain', 'text/markdown']);

type DocumentRow = {
  id: string;
  teamId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  contentHash: string;
  status: string;
  extractionMethod: string;
  pageCount: number | null;
  error: string | null;
  createdAt: Date;
};

export class KnowledgeService {
  /** Validate, store, extract and chunk a document. */
  async ingestDocument(input: {
    teamId: string;
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<KnowledgeDocumentDTO> {
    const { teamId, filename, mimeType, buffer } = input;

    if (!(ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType)) {
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

    let storageKey: string | null = null;
    try {
      const stored = await gcsService.uploadArtifact(
        `knowledge/${teamId}/${contentHash}-${filename}`,
        buffer,
        { contentType: mimeType, isPublic: false }
      );
      storageKey = stored.success ? stored.url : null;
    } catch {
      storageKey = null;
    }

    const isText = TEXT_MIME_TYPES.has(mimeType);
    const status: KnowledgeDocumentStatus = isText ? 'READY' : 'EXTRACTION_UNAVAILABLE';
    const extractionMethod: KnowledgeExtractionMethod = isText ? 'NATIVE_TEXT' : 'UNAVAILABLE';

    const document = await prisma.knowledgeDocument.create({
      data: {
        teamId,
        filename,
        mimeType,
        sizeBytes: buffer.length,
        contentHash,
        storageKey,
        status,
        extractionMethod,
        error: isText ? null : 'No OCR/extraction provider is configured for this file type.',
      },
    });

    if (isText) {
      const drafts = chunkText(buffer.toString('utf8'));
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
      const pages = drafts.map((d) => d.page ?? 0);
      await prisma.knowledgeDocument.update({
        where: { id: document.id },
        data: { pageCount: Math.max(1, ...pages) },
      });
    }

    return this.toDocumentDTO(document as DocumentRow);
  }

  async listDocuments(teamId: string): Promise<KnowledgeDocumentDTO[]> {
    const documents = await prisma.knowledgeDocument.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(documents.map((doc) => this.withChunkCount(doc as DocumentRow)));
  }

  async getDocument(teamId: string, id: string): Promise<KnowledgeDocumentDTO> {
    const document = await prisma.knowledgeDocument.findFirst({ where: { id, teamId } });
    if (!document) throw new KnowledgeError('Document not found', 'DOCUMENT_NOT_FOUND', 404);
    return this.withChunkCount(document as DocumentRow);
  }

  /**
   * Evidence-linked question answering. Citations must reference retrieved
   * chunks; fabricated ids are dropped and reported as a limitation.
   */
  async ask(input: {
    teamId: string;
    question: string;
    documentIds?: string[];
  }): Promise<KnowledgeAnswerDTO> {
    const chunks = (await prisma.knowledgeDocumentChunk.findMany({
      where: {
        document: {
          teamId: input.teamId,
          ...(input.documentIds?.length ? { id: { in: input.documentIds } } : {}),
        },
      },
      take: 8,
      orderBy: { createdAt: 'asc' },
    })) as unknown as RetrievedChunk[];

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
      const ai = await aiGateway.generateObject<unknown>(
        KNOWLEDGE_SYSTEM_PROMPT,
        buildKnowledgePrompt(chunks, input.question),
        { temperature: 0.1, maxTokens: 1200 }
      );

      if (ai?.object) {
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
            model: ai.model ?? null,
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

  private async withChunkCount(document: DocumentRow): Promise<KnowledgeDocumentDTO> {
    const chunkCount = await prisma.knowledgeDocumentChunk.count({
      where: { documentId: document.id },
    });
    return { ...this.toDocumentDTO(document), chunkCount };
  }

  private toDocumentDTO(document: DocumentRow): KnowledgeDocumentDTO {
    return {
      id: document.id,
      teamId: document.teamId,
      filename: document.filename,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      contentHash: document.contentHash,
      status: document.status as KnowledgeDocumentDTO['status'],
      extractionMethod: document.extractionMethod as KnowledgeDocumentDTO['extractionMethod'],
      pageCount: document.pageCount,
      error: document.error,
      chunkCount: 0,
      createdAt: document.createdAt.toISOString(),
    };
  }
}

export const knowledgeService = new KnowledgeService();
