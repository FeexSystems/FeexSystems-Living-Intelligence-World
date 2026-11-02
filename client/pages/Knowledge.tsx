import { useCallback, useEffect, useRef, useState } from 'react';
import { useFirebaseAuth } from '@/lib/firebase-auth';
import { apiClient, handleApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_BYTES,
  type KnowledgeAnswerDTO,
  type KnowledgeDocumentDTO,
} from '@shared/knowledge';

/**
 * Feex Knowledge & Document AI — Mission 005 user surface.
 *
 * Ingest a document → retrieve → evidence-linked Q&A.
 *
 * Governing rules surfaced in the UI (not just the server):
 *   - every answer is backed by validated citations, or explicitly unsupported;
 *   - dropped/fabricated citations are reported in `limitations`;
 *   - PDF extraction is unavailable, and the UI says so instead of pretending.
 */

const STATUS_STYLES: Record<string, string> = {
  READY: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  PROCESSING: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  EXTRACTION_UNAVAILABLE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  FAILED: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const ACCEPT = ALLOWED_DOCUMENT_MIME_TYPES.join(',');

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Knowledge() {
  const { getIdToken, isAuthenticated } = useFirebaseAuth();
  const fileInput = useRef<HTMLInputElement | null>(null);

  const [documents, setDocuments] = useState<KnowledgeDocumentDTO[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<KnowledgeAnswerDTO | null>(null);
  const [extractionMode, setExtractionMode] = useState<string>('unknown');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getIdToken]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const [health, list] = await Promise.all([
        apiClient.get<{ data: { extraction: string } }>('/knowledge/health', {
          headers,
          requireAuth: false,
        }),
        apiClient.get<{ data: { documents: KnowledgeDocumentDTO[] } }>('/knowledge/documents', {
          headers,
          requireAuth: false,
        }),
      ]);
      setExtractionMode(health?.data?.extraction ?? 'unknown');
      setDocuments(list?.data?.documents ?? []);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [authHeaders, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refresh();
  }, [refresh, isAuthenticated]);

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Client-side pre-check mirrors the server limits so the user gets a clear
    // message instead of a 413/415 round trip.
    if (!(ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError(`Unsupported file type "${file.type || 'unknown'}". Allowed: plain text, markdown, PDF.`);
      event.target.value = '';
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setError(`File is ${formatBytes(file.size)}; the limit is ${formatBytes(MAX_DOCUMENT_BYTES)}.`);
      event.target.value = '';
      return;
    }

    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      // `requireAuth: true` lets the API client resolve the Firebase ID token
      // itself; `upload()` deliberately does not accept manual headers because
      // the browser must set the multipart boundary.
      const res = await apiClient.upload<{ data: { document: KnowledgeDocumentDTO } }>(
        '/knowledge/documents',
        file,
        'file',
        { requireAuth: true }
      );
      const doc = res?.data?.document;
      setNotice(
        doc?.status === 'EXTRACTION_UNAVAILABLE'
          ? `"${doc.filename}" was stored, but text extraction is unavailable (no OCR configured). It cannot be used for Q&A yet.`
          : `"${doc?.filename ?? 'Document'}" ingested — ${doc?.chunkCount ?? 0} chunks indexed.`
      );
      await refresh();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const askQuestion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (question.trim().length < 3) {
      setError('Please enter a question of at least 3 characters.');
      return;
    }

    setAsking(true);
    setError(null);
    setAnswer(null);
    try {
      const headers = await authHeaders();
      const res = await apiClient.post<{ data: { answer: KnowledgeAnswerDTO } }>(
        '/knowledge/ask',
        {
          question: question.trim(),
          ...(selectedIds.length ? { documentIds: selectedIds } : {}),
        },
        { headers, requireAuth: false }
      );
      setAnswer(res?.data?.answer ?? null);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setAsking(false);
    }
  };

  const toggleDocument = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  };

  const readyDocuments = documents.filter((d) => d.status === 'READY');

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Knowledge &amp; Document AI</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Upload documents and ask questions. Every answer is grounded in retrieved excerpts and
          cites the exact chunk it came from — unsupported answers are labelled as such rather than
          guessed.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Extraction: <span className="font-medium">{extractionMode}</span>
          {extractionMode === 'native-text-only' && (
            <span className="ml-2 text-amber-300">
              — PDF extraction is unavailable (no OCR configured); text and markdown only.
            </span>
          )}
          {loading && <span className="ml-2">Loading…</span>}
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {notice}
        </div>
      )}

      {/* ── Ingest ─────────────────────────────────────────────────────────── */}
      <section className="mb-10 rounded-lg border border-border p-5">
        <h2 className="mb-2 text-lg font-semibold">Upload a document</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Accepted: plain text, markdown, PDF · max {formatBytes(MAX_DOCUMENT_BYTES)}. Stored privately;
          content is hashed (SHA-256) for integrity and duplicate detection.
        </p>

        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          onChange={upload}
          disabled={uploading}
          className="hidden"
          aria-label="Choose a document to upload"
        />
        <Button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : 'Choose file'}
        </Button>
      </section>

      {/* ── Documents ──────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Documents</h2>
          <span className="text-xs text-muted-foreground">
            {readyDocuments.length} ready for Q&amp;A of {documents.length}
          </span>
        </div>

        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents yet.</p>
        ) : (
          <ul className="grid gap-3">
            {documents.map((doc) => {
              const selectable = doc.status === 'READY';
              const selected = selectedIds.includes(doc.id);
              return (
                <li
                  key={doc.id}
                  className={`rounded-lg border p-4 ${selected ? 'border-primary/50' : 'border-border'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{doc.filename}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatBytes(doc.sizeBytes)} · {doc.mimeType} · {doc.chunkCount} chunks
                        {doc.pageCount ? ` · ${doc.pageCount} pages` : ''} ·{' '}
                        {new Date(doc.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground" title={doc.contentHash}>
                        sha256: {doc.contentHash.slice(0, 16)}…
                      </p>
                      {doc.error && <p className="mt-1 text-xs text-amber-300">{doc.error}</p>}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span
                        className={`rounded border px-2 py-0.5 text-xs ${STATUS_STYLES[doc.status] ?? 'border-border'}`}
                      >
                        {doc.status}
                      </span>
                      {selectable && (
                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleDocument(doc.id)}
                          />
                          scope
                        </label>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Ask ────────────────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-border p-5">
        <h2 className="mb-2 text-lg font-semibold">Ask a question</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {selectedIds.length > 0
            ? `Searching ${selectedIds.length} selected document${selectedIds.length === 1 ? '' : 's'}.`
            : 'Searching all ready documents.'}
        </p>

        <form onSubmit={askQuestion} className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What does the policy say about refunds?"
            aria-label="Question about your documents"
            disabled={asking}
          />
          <Button type="submit" disabled={asking || readyDocuments.length === 0}>
            {asking ? 'Asking…' : 'Ask'}
          </Button>
        </form>

        {readyDocuments.length === 0 && documents.length > 0 && (
          <p className="mt-3 text-xs text-amber-300">
            No documents are ready for Q&amp;A. PDFs cannot be extracted until an OCR provider is configured.
          </p>
        )}

        {answer && (
          <div className="mt-6 rounded-lg border border-border bg-muted/20 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded border border-border px-2 py-0.5">{answer.provider}</span>
              {answer.model && <span className="rounded border border-border px-2 py-0.5">{answer.model}</span>}
              <span
                className={
                  answer.supported
                    ? 'rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-300'
                    : 'rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-300'
                }
              >
                {answer.supported ? 'evidence-backed' : 'unsupported / refused'}
              </span>
            </div>

            <p className="whitespace-pre-wrap text-sm">{answer.answer}</p>

            {answer.citations.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Citations
                </h3>
                <ul className="grid gap-2">
                  {answer.citations.map((c) => (
                    <li key={c.chunkId} className="rounded border border-border p-2 text-xs">
                      <p className="mb-1 text-muted-foreground">
                        chunk {c.chunkId}
                        {c.page != null ? ` · page ${c.page}` : ''}
                        {c.section ? ` · ${c.section}` : ''}
                      </p>
                      <p className="line-clamp-3">{c.snippet}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {answer.limitations.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
                  Limitations
                </h3>
                <ul className="list-inside list-disc text-xs text-amber-300/90">
                  {answer.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
