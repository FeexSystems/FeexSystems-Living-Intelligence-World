import { useCallback, useEffect, useState } from 'react';
import { useFirebaseAuth } from '@/lib/firebase-auth';
import { apiClient, handleApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PropertyDTO, MaintenanceRequestDTO } from '@shared/rental';

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  RESOLVED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  CLOSED: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

interface PropertyForm {
  name: string;
  address: string;
  ownerId: string;
  description: string;
}

interface MaintenanceRequestForm {
  propertyId: string;
  unitId?: string;
  tenancyId?: string;
  title: string;
  description: string;
  category: string;
  priority: string;
}

const EMPTY_PROPERTY_FORM: PropertyForm = {
  name: '',
  address: '',
  ownerId: '',
  description: '',
};

const EMPTY_MAINTENANCE_FORM: MaintenanceRequestForm = {
  propertyId: '',
  unitId: '',
  tenancyId: '',
  title: '',
  description: '',
  category: 'OTHER',
  priority: 'MEDIUM',
};

const CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'HVAC', 'STRUCTURAL', 'PEST_CONTROL', 'OTHER'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function RentAll() {
  const { getIdToken, isAuthenticated } = useFirebaseAuth();
  const [properties, setProperties] = useState<PropertyDTO[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequestDTO[]>([]);
  const [propertyForm, setPropertyForm] = useState<PropertyForm>(EMPTY_PROPERTY_FORM);
  const [requestForm, setRequestForm] = useState<MaintenanceRequestForm>(EMPTY_MAINTENANCE_FORM);
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
      const [props, reqs] = await Promise.all([
        apiClient.get<{ data: { properties: PropertyDTO[] } }>('/rental/properties', { headers, requireAuth: false }),
        apiClient.get<{ data: { requests: MaintenanceRequestDTO[] } }>('/rental/maintenance-requests', { headers, requireAuth: false }),
      ]);
      setProperties(props?.data?.properties ?? []);
      setRequests(reqs?.data?.requests ?? []);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [authHeaders, isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submitProperty = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const headers = await authHeaders();
      await apiClient.post('/rental/properties', {
        name: propertyForm.name,
        address: propertyForm.address,
        ownerId: propertyForm.ownerId,
        description: propertyForm.description || undefined,
      }, { headers, requireAuth: false });
      setPropertyForm(EMPTY_PROPERTY_FORM);
      setNotice('Property created successfully.');
      await refresh();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const headers = await authHeaders();
      await apiClient.post('/rental/maintenance-requests', {
        propertyId: requestForm.propertyId,
        unitId: requestForm.unitId || undefined,
        tenancyId: requestForm.tenancyId || undefined,
        title: requestForm.title,
        description: requestForm.description,
        category: requestForm.category,
        priority: requestForm.priority,
        idempotencyKey: crypto.randomUUID(),
      }, { headers, requireAuth: false });
      setRequestForm(EMPTY_MAINTENANCE_FORM);
      setNotice('Maintenance request submitted.');
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
          <h1 className="text-2xl font-semibold">RentAll SmartOps</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Property and maintenance request management. All data is tenant-scoped.
          </p>
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

        <form onSubmit={submitProperty} className="mb-10 grid gap-3 rounded-lg border border-border p-5 md:grid-cols-2">
          <h2 className="md:col-span-2 text-lg font-semibold">Add Property</h2>

          <label className="grid gap-1 text-sm">
            <span>Property Name</span>
            <Input
              required
              value={propertyForm.name}
              onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
              placeholder="123 Main Street Apartments"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Address</span>
            <Input
              required
              value={propertyForm.address}
              onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
              placeholder="123 Main Street, City, State"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Owner ID</span>
            <Input
              required
              value={propertyForm.ownerId}
              onChange={(e) => setPropertyForm({ ...propertyForm, ownerId: e.target.value })}
              placeholder="user-abc123"
            />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span>Description</span>
            <Input
              value={propertyForm.description}
              onChange={(e) => setPropertyForm({ ...propertyForm, description: e.target.value })}
              placeholder="Optional description"
            />
          </label>

          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add Property'}
            </Button>
          </div>
        </form>

        <form onSubmit={submitRequest} className="mb-10 grid gap-3 rounded-lg border border-border p-5 md:grid-cols-2">
          <h2 className="md:col-span-2 text-lg font-semibold">Maintenance Request</h2>

          <label className="grid gap-1 text-sm">
            <span>Property ID</span>
            <Input
              required
              value={requestForm.propertyId}
              onChange={(e) => setRequestForm({ ...requestForm, propertyId: e.target.value })}
              placeholder="prop-abc123"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Unit ID (optional)</span>
            <Input
              value={requestForm.unitId}
              onChange={(e) => setRequestForm({ ...requestForm, unitId: e.target.value })}
              placeholder="unit-abc123"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Tenancy ID (optional)</span>
            <Input
              value={requestForm.tenancyId}
              onChange={(e) => setRequestForm({ ...requestForm, tenancyId: e.target.value })}
              placeholder="tenancy-abc123"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Title</span>
            <Input
              required
              value={requestForm.title}
              onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
              placeholder="Leaking faucet in unit 3B"
            />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span>Description</span>
            <textarea
              required
              minLength={10}
              maxLength={5000}
              rows={3}
              value={requestForm.description}
              onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
              placeholder="Describe the maintenance issue…"
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Category</span>
            <select
              value={requestForm.category}
              onChange={(e) => setRequestForm({ ...requestForm, category: e.target.value as string })}
              className="border border-border rounded-md bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Priority</span>
            <select
              value={requestForm.priority}
              onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value as string })}
              className="border border-border rounded-md bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </Button>
          </div>
        </form>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Maintenance Requests</h2>
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>

          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No maintenance requests yet.</p>
          ) : (
            <ul className="grid gap-3">
              {requests.map((r) => (
                <li key={r.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[r.status] ?? ''}`}>
                      {r.status}
                    </span>
                    <span className="text-sm font-medium">{r.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.category} · {r.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {r.description}
                  </p>
                  {r.aiRecommendation && (
                    <p className="mt-2 text-xs text-amber-300">
                      AI recommendation: {r.aiRecommendation}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Properties</h2>
          </div>
          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">No properties yet.</p>
          ) : (
            <ul className="grid gap-3">
              {properties.map((p) => (
                <li key={p.id} className="rounded-lg border border-border p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{p.name}</h3>
                      <p className="text-sm text-muted-foreground">{p.address}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[p.status] ?? ''}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Owner: {p.ownerId} · Created: {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
