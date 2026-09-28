import { describe, expect, it } from 'vitest';
import { createInitialRunState } from '@/game/state/reduceRunState';
import { clearFailedRun, FAILED_RUN_TTL_MS, readFailedRun, writeFailedRun, type FailedRunRecord } from './failedRunStore';

function createStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); },
    removeItem(key: string) { values.delete(key); },
  };
}

function createRecord(userOid = 'user-01', runId = 'run-01'): FailedRunRecord {
  return {
    schemaVersion: 1,
    userOid,
    runId,
    savedAtMs: 1000,
    expiresAtMs: 1000 + FAILED_RUN_TTL_MS,
    terminalStatus: 'failed',
    claimedSnapshot: { ...createInitialRunState({ runId, userOid, beatmapId: 'office-day-01' }), status: 'failed' },
    inputEvents: [{ eventId: 'event-1', clientSequence: 0, type: 'keydown', songPositionMs: 10, inputOffsetMs: 0, receivedAt: new Date(1000).toISOString() }],
    failure: { httpStatus: 422, code: 'invalid_sequence' },
  };
}

describe('failedRunStore', () => {
  it('stores only the latest run per user and expires it after exactly 24 hours', () => {
    const storage = createStorage();
    writeFailedRun(storage, createRecord());
    writeFailedRun(storage, createRecord('user-01', 'run-02'));

    expect(readFailedRun(storage, 'user-01', 1000)?.runId).toBe('run-02');
    expect(readFailedRun(storage, 'user-02', 1000)).toBeNull();
    expect(readFailedRun(storage, 'user-01', 1000 + FAILED_RUN_TTL_MS)).toBeNull();
    expect(storage.values.size).toBe(0);
  });

  it('removes malformed, unknown-schema, and mismatched-user records', () => {
    const storage = createStorage();
    writeFailedRun(storage, createRecord());
    expect(readFailedRun(storage, 'another-user', 1000)).toBeNull();
    expect(storage.values.size).toBe(1);

    storage.setItem('office-rhythm:failed-run:v1:user-01', '{broken');
    expect(readFailedRun(storage, 'user-01', 1000)).toBeNull();
    expect(storage.values.size).toBe(0);

    writeFailedRun(storage, { ...createRecord(), schemaVersion: 1 });
    const key = [...storage.values.keys()][0];
    storage.setItem(key, JSON.stringify({ ...createRecord(), schemaVersion: 2 }));
    expect(readFailedRun(storage, 'user-01', 1000)).toBeNull();
  });

  it('clears only the matching user and run and serializes no arbitrary failure text', () => {
    const storage = createStorage();
    writeFailedRun({ setItem: (key, value) => storage.setItem(key, value) }, {
      ...createRecord(),
      failure: { httpStatus: 422, code: 'invalid_sequence', message: 'secret server detail' } as FailedRunRecord['failure'],
    });
    const raw = [...storage.values.values()][0];
    expect(raw).not.toContain('secret server detail');
    clearFailedRun(storage, 'other-user', 'run-01');
    expect(storage.values.size).toBe(1);
    clearFailedRun(storage, 'user-01', 'different-run');
    expect(storage.values.size).toBe(1);
    clearFailedRun(storage, 'user-01', 'run-01');
    expect(storage.values.size).toBe(0);
  });
});
