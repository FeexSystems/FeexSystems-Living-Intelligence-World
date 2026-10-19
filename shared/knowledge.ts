/**
 * Knowledge & Document AI — shared contracts (Mission 005).
 */

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
] as const;

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5 MB

export type KnowledgeDocumentStatus =
  | 'PROCESSING'
  | 'READY'
  | 'EXTRACTION_UNAVAILABLE'
  | 'FAILED';

export type KnowledgeExtractionMethod = 'NATIVE_TEXT' | 'UNAVAILABLE';

export interface KnowledgeDocumentDTO {
  id: string;
  teamId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  contentHash: string;
  status: KnowledgeDocumentStatus;
  extractionMethod: KnowledgeExtractionMethod;
  pageCount: number | null;
  error: string | null;
  chunkCount: number;
  createdAt: string;
}

/** A citation is valid only when `chunkId` was actually retrieved. */
export interface KnowledgeCitation {
  chunkId: string;
  documentId: string;
  page: number | null;
  section: string | null;
  snippet: string;
}

export interface KnowledgeAnswerDTO {
  question: string;
  answer: string;
  citations: KnowledgeCitation[];
  limitations: string[];
  provider: string;
  model: string | null;
  /** False when the system could not support an answer with retrieved evidence. */
  supported: boolean;
}
