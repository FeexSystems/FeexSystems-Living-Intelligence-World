/**
 * AI Observability page — grounded evidence metrics & hallucination verification.
 * Task 4.4, Phase 4 of .claude/specs/feex-next-gen-architecture/tasks.md
 *
 * Verifies the page renders the derived verification metrics (grounded ratio,
 * hallucination risk, evidence anchors) and the per-interaction grounding badge.
 * The network layer is mocked; no DB required.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AIObservabilityPage from '@/pages/dashboard/ai-observability';

// The page is wrapped in DashboardLayout in production; stub it to keep the test
// focused on the observability content.
vi.mock('@/components/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const dashboardPayload = {
  success: true,
  data: {
    totalInteractions: 12,
    avgConfidence: 0.82,
    avgQualityScore: 0.91,
    avgLatencyMs: 640,
    verification: {
      groundedInteractions: 9,
      groundedRatio: 0.75,
      hallucinationRisk: 0.17,
      avgEvidenceAnchors: 2.5,
    },
    recentInteractions: [
      {
        id: 'int-1',
        agentId: 'feex-navigator',
        agentName: 'Navigator',
        prompt: 'Which services use PostgreSQL?',
        confidence: 0.9,
        qualityScore: 0.88,
        latencyMs: 512,
        provider: 'gemini',
        evidenceCount: 3,
        createdAt: '2026-10-07T10:00:00.000Z',
      },
      {
        id: 'int-2',
        agentId: 'feex-navigator',
        agentName: 'Navigator',
        prompt: 'Summarize the marketing claims',
        confidence: 0.3,
        qualityScore: 0.4,
        latencyMs: 720,
        provider: 'gemini',
        evidenceCount: 0,
        createdAt: '2026-10-07T09:00:00.000Z',
      },
    ],
  },
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AIObservabilityPage />
    </QueryClientProvider>,
  );
}

describe('AIObservabilityPage — verification metrics', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => dashboardPayload,
      })) as unknown as typeof fetch,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the grounded-responses ratio and evidence summary', async () => {
    renderPage();

    // Wait for the resolved value, not just the static label.
    expect(await screen.findByText('75%')).toBeInTheDocument();
    expect(screen.getByText(/grounded responses/i)).toBeInTheDocument();
    expect(screen.getByText(/9 with evidence · 2\.5 avg anchors/i)).toBeInTheDocument();
  });

  it('renders the derived hallucination-risk metric', async () => {
    renderPage();

    expect(await screen.findByText('17%')).toBeInTheDocument();
    expect(screen.getByText(/hallucination risk/i)).toBeInTheDocument();
    expect(screen.getByText(/ungrounded & low-confidence/i)).toBeInTheDocument();
  });

  it('shows an evidence-anchor badge for a grounded interaction', async () => {
    renderPage();

    expect(await screen.findByText(/3 evidence anchors/i)).toBeInTheDocument();
  });

  it('flags an ungrounded interaction', async () => {
    renderPage();

    expect(await screen.findByText(/^ungrounded$/i)).toBeInTheDocument();
  });

  it('degrades gracefully when verification metrics are absent', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        success: true,
        data: { ...dashboardPayload.data, verification: undefined },
      }),
    });

    renderPage();

    expect(await screen.findByText(/grounded responses/i)).toBeInTheDocument();
    // Uses the em-dash placeholder, not a fabricated number.
    await waitFor(() => {
      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });
  });
});
