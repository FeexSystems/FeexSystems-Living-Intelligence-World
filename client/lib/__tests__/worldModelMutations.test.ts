import { describe, it, expect, vi, beforeEach } from 'vitest';

// SQL Connect is disabled under Vitest (see getDataConnectMode), and the
// Firebase app never authenticates in tests — so every canonical write must
// throw loudly via the shared precondition guard. These tests assert that no
// write is ever attempted (and never fabricated) in that state.
vi.mock('../dataconnect-client', () => ({
  isDataConnectEnabled: () => false,
  upsertProjectSql: vi.fn(),
  insertEvidenceSql: vi.fn(),
  recordTelemetryEventSql: vi.fn(),
}));

vi.mock('../firebase', () => ({
  firebaseAuth: null,
}));

import {
  upsertProjectSql,
  insertEvidenceSql,
  recordTelemetryEventSql,
} from '../dataconnect-client';
import {
  upsertWorldProject,
  insertWorldEvidence,
  recordWorldTelemetryEvent,
} from '../worldModelMutations';

const projectVars = {
  id: 'github:FeexSystems/core',
  name: 'FeexSystems Core',
  repository: 'FeexSystems/core',
  owner: 'FeexSystems',
  url: 'https://github.com/FeexSystems/core',
};

describe('worldModelMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upsertWorldProject throws when SQL Connect is disabled and performs no write', async () => {
    await expect(upsertWorldProject(projectVars)).rejects.toThrow(/SQL Connect is disabled/);
    expect(upsertProjectSql).not.toHaveBeenCalled();
  });

  it('insertWorldEvidence throws when SQL Connect is disabled and performs no write', async () => {
    await expect(
      insertWorldEvidence({ projectId: 'github:FeexSystems/core', commitSha: 'abc123', observationType: 'commit' })
    ).rejects.toThrow(/SQL Connect is disabled/);
    expect(insertEvidenceSql).not.toHaveBeenCalled();
  });

  it('recordWorldTelemetryEvent throws when SQL Connect is disabled and performs no write', async () => {
    await expect(
      recordWorldTelemetryEvent({ eventType: 'probe', source: 'test' })
    ).rejects.toThrow(/SQL Connect is disabled/);
    expect(recordTelemetryEventSql).not.toHaveBeenCalled();
  });
});
