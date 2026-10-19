import { useCallback, useEffect, useState } from 'react';
import { useFirebaseAuth } from '@/lib/firebase-auth';
import { apiClient, handleApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FarmDTO, CropPlotDTO, FarmObservationDTO, AdvisoryRequestDTO } from '@shared/rental';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  INACTIVE: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  PLANTED: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  GROWING: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  HARVESTED: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  FALLOW: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  LOW: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  MEDIUM: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  HIGH: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  CRITICAL: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  PENDING: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  REVIEWED: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  APPLIED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  REJECTED: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

interface FarmForm {
  name: string;
  location: string;
  size: string;
  primaryCrop: string;
}

interface ObservationForm {
  plotId: string;
  observationType: string;
  description: string;
  severity: string;
}

interface AdvisoryForm {
  plotId: string;
  question: string;
  observations: string;
}

const EMPTY_FARM_FORM: FarmForm = {
  name: '',
  location: '',
  size: '',
  primaryCrop: '',
};

const EMPTY_OBSERVATION_FORM: ObservationForm = {
  plotId: '',
  observationType: 'OTHER',
  description: '',
  severity: 'MEDIUM',
};

const EMPTY_ADVISORY_FORM: AdvisoryForm = {
  plotId: '',
  question: '',
  observations: '',
};

const OBSERVATION_TYPES = ['PEST', 'DISEASE', 'WEATHER', 'GROWTH', 'SOIL', 'OTHER'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function FarmPlug() {
  const { getIdToken, isAuthenticated } = useFirebaseAuth();
  const [farms, setFarms] = useState<FarmDTO[]>([]);
  const [plots, setPlots] = useState<CropPlotDTO[]>([]);
  const [observations, setObservations] = useState<FarmObservationDTO[]>([]);
  const [requests, setRequests] = useState<AdvisoryRequestDTO[]>([]);
  const [farmForm, setFarmForm] = useState<FarmForm>(EMPTY_FARM_FORM);
  const [observationForm, setObservationForm] = useState<ObservationForm>(EMPTY_OBSERVATION_FORM);
  const [advisoryForm, setAdvisoryForm] = useState<AdvisoryForm>(EMPTY_ADVISORY_FORM);
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
      const [f, p, o, a] = await Promise.all([
        apiClient.get<{ data: { farms: FarmDTO[] } }>('/farm/farms', { headers, requireAuth: false }),
        apiClient.get<{ data: { plots: CropPlotDTO[] } }>('/farm/plots', { headers, requireAuth: false }),
        apiClient.get<{ data: { observations: FarmObservationDTO[] } }>('/farm/observations', { headers, requireAuth: false }),
        apiClient.get<{ data: { requests: AdvisoryRequestDTO[] } }>('/farm/advisory-requests', { headers, requireAuth: false }),
      ]);
      setFarms(f?.data?.farms ?? []);
      setPlots(p?.data?.plots ?? []);
      setObservations(o?.data?.observations ?? []);
      setRequests(a?.data?.requests ?? []);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [authHeaders, isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submitFarm = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const headers = await authHeaders();
      await apiClient.post('/farm/farms', {
        name: farmForm.name,
        location: farmForm.location,
        size: farmForm.size,
        primaryCrop: farmForm.primaryCrop,
      }, { headers, requireAuth: false });
      setFarmForm(EMPTY_FARM_FORM);
      setNotice('Farm created successfully.');
      await refresh();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submitObservation = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const headers = await authHeaders();
      await apiClient.post('/plots/' + observationForm.plotId + '/observations', {
        observationType: observationForm.observationType,
        description: observationForm.description,
        severity: observationForm.severity,
      }, { headers, requireAuth: false });
      setObservationForm(EMPTY_OBSERVATION_FORM);
      setNotice('Observation recorded.');
      await refresh();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submitAdvisory = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const headers = await authHeaders();
      await apiClient.post('/advisory-requests', {
        plotId: advisoryForm.plotId,
        question: advisoryForm.question,
        observations: advisoryForm.observations,
        idempotencyKey: crypto.randomUUID(),
      }, { headers, requireAuth: false });
      setAdvisoryForm(EMPTY_ADVISORY_FORM);
      setNotice('Advisory request submitted.');
      await refresh();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">FarmPlug AI</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Farm advisory and observation management. AI provides recommendations only — human review required.
          </p>
          {loading && <p className="mt-2 text-xs text-muted-foreground">Loading farms…</p>}
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

        <form onSubmit={submitFarm} className="mb-10 grid gap-3 rounded-lg border border-border p-5 md:grid-cols-2">
          <h2 className="md:col-span-2 text-lg font-semibold">Add Farm</h2>

          <label className="grid gap-1 text-sm">
            <span>Farm Name</span>
            <Input
              required
              value={farmForm.name}
              onChange={(e) => setFarmForm({ ...farmForm, name: e.target.value })}
              placeholder="Sunny Acres Farm"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Location</span>
            <Input
              value={farmForm.location}
              onChange={(e) => setFarmForm({ ...farmForm, location: e.target.value })}
              placeholder="123 County Road"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Size (acres)</span>
            <Input
              value={farmForm.size}
              onChange={(e) => setFarmForm({ ...farmForm, size: e.target.value })}
              placeholder="50 acres"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Primary Crop</span>
            <Input
              value={farmForm.primaryCrop}
              onChange={(e) => setFarmForm({ ...farmForm, primaryCrop: e.target.value })}
              placeholder="Corn"
            />
          </label>

          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add Farm'}
            </Button>
          </div>
        </form>

        <form onSubmit={submitObservation} className="mb-10 grid gap-3 rounded-lg border border-border p-5 md:grid-cols-2">
          <h2 className="md:col-span-2 text-lg font-semibold">Record Observation</h2>

          <label className="grid gap-1 text-sm">
            <span>Plot ID</span>
            <Input
              required
              value={observationForm.plotId}
              onChange={(e) => setObservationForm({ ...observationForm, plotId: e.target.value })}
              placeholder="plot-abc123"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Observation Type</span>
            <select
              value={observationForm.observationType}
              onChange={(e) => setObservationForm({ ...observationForm, observationType: e.target.value as string })}
              className="border border-border rounded-md bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {OBSERVATION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Severity</span>
            <select
              value={observationForm.severity}
              onChange={(e) => setObservationForm({ ...observationForm, severity: e.target.value as string })}
              className="border border-border rounded-md bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span>Description</span>
            <textarea
              required
              minLength={10}
              maxLength={5000}
              rows={3}
              value={observationForm.description}
              onChange={(e) => setObservationForm({ ...observationForm, description: e.target.value })}
              placeholder="Describe the observation…"
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>

          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Recording…' : 'Record Observation'}
            </Button>
          </div>
        </form>

        <form onSubmit={submitAdvisory} className="mb-10 grid gap-3 rounded-lg border border-border p-5 md:grid-cols-2">
          <h2 className="md:col-span-2 text-lg font-semibold">Request Advisory</h2>

          <label className="grid gap-1 text-sm">
            <span>Plot ID</span>
            <Input
              required
              value={advisoryForm.plotId}
              onChange={(e) => setAdvisoryForm({ ...advisoryForm, plotId: e.target.value })}
              placeholder="plot-abc123"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Question</span>
            <Input
              required
              value={advisoryForm.question}
              onChange={(e) => setAdvisoryForm({ ...advisoryForm, question: e.target.value })}
              placeholder="My tomatoes have yellow leaves. What could be wrong?"
            />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span>Observations</span>
            <textarea
              value={advisoryForm.observations}
              rows={3}
              onChange={(e) => setAdvisoryForm({ ...advisoryForm, observations: e.target.value })}
              placeholder="Any additional observations (e.g., recent weather, treatments applied)…"
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>

          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Requesting…' : 'Request Advisory'}
            </Button>
          </div>
        </form>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Farms</h2>
          </div>
          {farms.length === 0 ? (
            <p className="text-sm text-muted-foreground">No farms yet.</p>
          ) : (
            <ul className="grid gap-3">
              {farms.map((f) => (
                <li key={f.id} className="rounded-lg border border-border p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{f.name}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[f.status] ?? ''}`}>
                      {f.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{f.location}</p>
                  <p className="text-sm text-muted-foreground">{f.primaryCrop ?? 'No primary crop set'} · {f.size ?? 'No size set'}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Crop Plots</h2>
          </div>
          {plots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No plots yet.</p>
          ) : (
            <ul className="grid gap-3">
              {plots.map((p) => (
                <li key={p.id} className="rounded-lg border border-border p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{p.name}</h3>
                      <p className="text-sm text-muted-foreground">{p.cropType ?? 'No crop type'}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[p.status] ?? ''}`}>
                      {p.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Observations</h2>
          </div>
          {observations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No observations yet.</p>
          ) : (
            <ul className="grid gap-3">
              {observations.map((o) => (
                <li key={o.id} className="rounded-lg border border-border p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{o.observationType}</h3>
                    <p className="text-sm text-muted-foreground">{o.severity}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{o.description}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Advisory Requests</h2>
          </div>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No advisory requests yet.</p>
          ) : (
            <ul className="grid gap-3">
              {requests.map((r) => (
                <li key={r.id} className="rounded-lg border border-border p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{r.question}</h3>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[r.status] ?? ''}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{r.observations}</p>
                    {r.advisoryText && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm text-primary">Advisory Response</summary>
                        <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs">
                          {r.advisoryText}
                        </pre>
                      </details>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      AI Provider: {r.aiProvider ?? 'none'} · Confidence: {r.confidence ?? 'N/A'}
                    </p>
                  </div>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
