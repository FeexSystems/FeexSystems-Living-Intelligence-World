import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useFirebaseAuth } from '@/lib/firebase-auth';
import {
  upsertWorldProject,
  insertWorldEvidence,
} from '@/lib/worldModelMutations';
import { apiClient } from '@/lib/api-client';
import { ShieldCheck, ShieldAlert, GitCommit, Database, Loader2 } from 'lucide-react';


interface VerifiedCommit {
  repository: string;
  commitSha: string;
  message: string | null;
  author: string | null;
  committedAt: string | null;
  url: string;
  verified: boolean;
}

/**
 * Admin-only World Model write console.
 *
 * Consumes the guarded `worldModelMutations.ts` layer. The route is wrapped in
 * an admin gate (App.tsx) AND this component re-checks the role defensively —
 * `@auth USER` on the SQL Connect mutations proves a session, not an admin role.
 *
 * "Evidence, Not Claims": anchoring an Evidence Fabric record is a two-step
 * flow — the admin first VERIFIES the commit SHA against GitHub via the server
 * (`POST /world-model/evidence/verify`), and only a server-verified SHA can be
 * anchored. The client never invents a commit SHA.
 */
export default function AdminWorldModelPage() {
  const { user } = useFirebaseAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Project upsert form
  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [repository, setRepository] = useState('');
  const [owner, setOwner] = useState('FeexSystems');
  const [projectUrl, setProjectUrl] = useState('');
  const [projectBusy, setProjectBusy] = useState(false);

  // Evidence anchor form (verify-then-anchor)
  const [evProjectId, setEvProjectId] = useState('');
  const [evRepository, setEvRepository] = useState('');
  const [commitInput, setCommitInput] = useState('');
  const [filePath, setFilePath] = useState('');
  const [verified, setVerified] = useState<VerifiedCommit | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [anchorBusy, setAnchorBusy] = useState(false);

  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const handleUpsertProject = async () => {
    setStatus(null);
    setProjectBusy(true);
    try {
      const url = projectUrl || `https://github.com/${repository}`;
      await upsertWorldProject({ id: projectId, name: projectName, repository, owner, url });
      setStatus({ kind: 'ok', msg: `Project "${projectId}" upserted into the canonical World Model.` });
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Project upsert failed' });
    } finally {
      setProjectBusy(false);
    }
  };

  const handleVerifyCommit = async () => {
    setStatus(null);
    setVerified(null);
    setVerifyBusy(true);
    try {
      const res = await apiClient.post<{ success: boolean; data: VerifiedCommit }>(
        '/world-model/evidence/verify',
        { repository: evRepository, commitSha: commitInput }
      );
      if (res?.data?.verified) {
        setVerified(res.data);
        setStatus({ kind: 'ok', msg: `Commit ${res.data.commitSha.slice(0, 12)} verified against GitHub.` });
      } else {
        setStatus({ kind: 'err', msg: 'Commit could not be verified — refusing to anchor evidence.' });
      }
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Verification failed' });
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleAnchorEvidence = async () => {
    if (!verified) return;
    setStatus(null);
    setAnchorBusy(true);
    try {
      await insertWorldEvidence({
        projectId: evProjectId,
        commitSha: verified.commitSha,
        filePath: filePath || null,
        observationType: 'admin-manual-anchor',
      });
      setStatus({ kind: 'ok', msg: `Evidence anchored for project "${evProjectId}" at ${verified.commitSha.slice(0, 12)}.` });
      setVerified(null);
      setCommitInput('');
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Evidence anchor failed' });
    } finally {
      setAnchorBusy(false);
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Access Restricted</CardTitle>
            <CardDescription>World Model write operations require an ADMIN or SUPER_ADMIN role.</CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">World Model Writes</h1>
            <p className="text-sm text-muted-foreground">
              Canonical write console — upsert projects and anchor verified Evidence Fabric records.
            </p>
          </div>
          <Badge variant="outline" className="gap-1"><Database className="w-3 h-3" /> SQL Connect</Badge>
        </div>

        {status && (
          <div className={`rounded-md border px-4 py-3 text-sm ${status.kind === 'ok' ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/5' : 'border-destructive/40 text-destructive bg-destructive/5'}`}>
            {status.msg}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upsert Project</CardTitle>
              <CardDescription>Create or update a canonical World Model project node.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1"><Label htmlFor="pid">Project ID</Label><Input id="pid" placeholder="github:FeexSystems/core" value={projectId} onChange={(e) => setProjectId(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="pname">Name</Label><Input id="pname" placeholder="FeexSystems Core" value={projectName} onChange={(e) => setProjectName(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="prepo">Repository</Label><Input id="prepo" placeholder="FeexSystems/core" value={repository} onChange={(e) => setRepository(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="powner">Owner</Label><Input id="powner" value={owner} onChange={(e) => setOwner(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="purl">URL (optional)</Label><Input id="purl" placeholder="https://github.com/FeexSystems/core" value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} /></div>
              <Button className="w-full" disabled={projectBusy || !projectId || !projectName || !repository} onClick={handleUpsertProject}>
                {projectBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                Upsert Project
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GitCommit className="w-4 h-4" /> Anchor Evidence</CardTitle>
              <CardDescription>Verify a real commit SHA against GitHub, then anchor it. SHA is sourced server-side.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1"><Label htmlFor="evpid">Project ID</Label><Input id="evpid" placeholder="github:FeexSystems/core" value={evProjectId} onChange={(e) => setEvProjectId(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="evrepo">Repository</Label><Input id="evrepo" placeholder="FeexSystems/core" value={evRepository} onChange={(e) => setEvRepository(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="evsha">Commit SHA (or ref)</Label><Input id="evsha" placeholder="abc1234 or main" value={commitInput} onChange={(e) => setCommitInput(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="evpath">File Path (optional)</Label><Input id="evpath" placeholder="src/index.ts" value={filePath} onChange={(e) => setFilePath(e.target.value)} /></div>

              <Button variant="secondary" className="w-full" disabled={verifyBusy || !evRepository || !commitInput} onClick={handleVerifyCommit}>
                {verifyBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                1. Verify Commit (GitHub)
              </Button>

              {verified && (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-1 font-medium text-emerald-300"><ShieldCheck className="w-3 h-3" /> Verified</div>
                  <div className="font-mono break-all">{verified.commitSha}</div>
                  {verified.message && <div className="text-muted-foreground line-clamp-2">{verified.message}</div>}
                  <a href={verified.url} target="_blank" rel="noreferrer" className="text-emerald-400 underline break-all">{verified.url}</a>
                </div>
              )}

              <Button className="w-full" disabled={anchorBusy || !verified || !evProjectId} onClick={handleAnchorEvidence}>
                {anchorBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GitCommit className="w-4 h-4 mr-2" />}
                2. Anchor Evidence
              </Button>
              {!verified && <p className="text-xs text-muted-foreground">Verify a commit first — anchoring is disabled until a real SHA is confirmed.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

