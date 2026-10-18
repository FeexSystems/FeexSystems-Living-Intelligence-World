import { useCallback, useEffect, useState } from 'react';
import { useFirebaseAuth } from '@/lib/firebase-auth';
import { apiClient, handleApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  OperationsEnquiryDTO,
  OperationsEnquiryListResponse,
} from '@shared/operations';

/**
 * Feex AI Operations — Mission 001 vertical slice.
 *
 * Authenticated intake → classification + draft → human approval.
 * The approval step records a decision only; no email/booking/payment is sent.
 */

const STATUS_STYLES: Record<string, string> = {
  RECEIVED: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  PENDING_APPROVAL: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  APPROVED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  REJECTED: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  FAILED: 'bg-red-500/15 text-red-300 border-red-500/30',
};

interface EnquiryForm {
  contactName: string;
  contactEmail: string;
  company: string;
  subject: string;
  message: string;
}

const EMPTY_FORM: EnquiryForm = {
  contactName: '',
  contactEmail: '',
  company: '',
  subject: '',
  message: '',
};

export default function Operations() {
  const { getIdToken, isAuthenticated } = useFirebaseAuth();
  const [form, setForm] = useState<EnquiryForm>(EMPTY_FORM);
  const [enquiries, setEnquiries] = useState<OperationsEnquiryDTO[]>([]);
  const [aiMode, setAiMode] = useState<string>('unknown');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
        apiClient.get<{ data: { ai: string } }>('/operations/health', { headers, requireAuth: false }),
        apiClient.get<{ data: OperationsEnquiryListResponse }>('/operations/enquiries?limit=25', {
          headers,
          requireAuth: false,
        }),
      ]);
      setAiMode(health?.data?.ai ?? 'unknown');
      setEnquiries(list?.data?.enquiries ?? []);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [authHeaders, isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const headers = await authHeaders();
      const res = await apiClient.post<{ data: { enquiry: OperationsEnquiryDTO; idempotentReplay: boolean } }>(
        '/operations/enquiries',
        {
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          company: form.company || undefined,
          subject: form.subject,
          message: form.message,
          source: 'web',
          // Client-generated key: a retry of the same submission is idempotent.
          idempotencyKey: crypto.randomUUID(),
        },
        { headers, requireAuth: false }
      );
      setNotice(
        res?.data?.idempotentReplay
          ? 'This enquiry was already processed; showing the existing record.'
          : 'Enquiry received, classified, and queued for human approval.'
      );
      setForm(EMPTY_FORM);
      await refresh();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const review = async (id: string, decision: 'approve' | 'reject') => {
    setError(null);
    setNotice(null);
    try {
      const headers = await authHeaders();
      await apiClient.post(
        `/operations/enquiries/${id}/${decision}`,
        { note: `Reviewed from the Operations console (${decision}).` },
        { headers, requireAuth: false }
      );
      setNotice(
        decision === 'approve'
          ? 'Approved. No external action was performed.'
          : 'Rejected. No external action was performed.'
      );
      await refresh();
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">Feex AI Operations</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Inbound enquiry → classification and draft → human approval. Approval
            records a decision only; nothing is emailed, booked or charged
            automatically.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
            <span className="text-muted-foreground">AI mode</span>
            <span className="font-medium">{aiMode}</span>
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {notice}
          </div>
        )}

        <form onSubmit={submit} className="mb-10 grid gap-3 rounded-lg border border-border p-5 md:grid-cols-2">
          <h2 className="md:col-span-2 text-lg font-medium">New enquiry</h2>

          <label className="grid gap-1 text-sm">
            <span>Contact name</span>
            <Input
              required
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              placeholder="Ada Lovelace"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Contact email</span>
            <Input
              required
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              placeholder="ada@example.com"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Company (optional)</span>
            <Input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Analytical Engines Ltd"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Subject</span>
            <Input
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Question about billing"
            />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span>Message</span>
            <textarea
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Describe the enquiry…"
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>

          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit enquiry'}
            </Button>
          </div>
        </form>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">Enquiries</h2>
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>

          {enquiries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enquiries yet.</p>
          ) : (
            <ul className="grid gap-3">
              {enquiries.map((enquiry) => (
                <li key={enquiry.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[enquiry.status] ?? ''}`}>
                      {enquiry.status}
                    </span>
                    <span className="text-sm font-medium">{enquiry.subject}</span>
                    <span className="text-xs text-muted-foreground">
                      {enquiry.category ?? 'unclassified'} · {enquiry.priority}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {enquiry.aiProvider === 'deterministic'
                        ? 'deterministic fallback'
                        : `${enquiry.aiProvider ?? 'unknown'}${enquiry.aiModel ? ` · ${enquiry.aiModel}` : ''}`}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {enquiry.contactName} &lt;{enquiry.contactEmail}&gt;
                    {enquiry.company ? ` · ${enquiry.company}` : ''}
                  </p>

                  {enquiry.error && (
                    <p className="mt-2 text-xs text-amber-300">Note: {enquiry.error}</p>
                  )}

                  {enquiry.draftResponse && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-primary">Draft response</summary>
                      <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs">
                        {enquiry.draftResponse}
                      </pre>
                    </details>
                  )}

                  {enquiry.status === 'PENDING_APPROVAL' && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => void review(enquiry.id, 'approve')}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void review(enquiry.id, 'reject')}>
                        Reject
                      </Button>
                    </div>
                  )}

                  {enquiry.status === 'APPROVED' && (
                    <p className="mt-2 text-xs text-emerald-300">
                      Approved{' '}
                      {enquiry.approvedAt ? new Date(enquiry.approvedAt).toLocaleString() : ''} — no external
                      action performed.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

