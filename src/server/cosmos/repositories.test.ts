import type { Container } from '@azure/cosmos';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialRunState } from '@/game/state/reduceRunState';
import { ActiveSessionConflictError, CosmosPreconditionFailedError } from './errors';
import { getDailyLeaderboardKey, RAW_EVENT_RETENTION_SECONDS, type GameResultDocument, type GameSessionDocument } from './models';
import { ResultRepository } from './resultRepository';
import { SessionRepository } from './sessionRepository';

const userOid = 'user-01';
const tenantId = 'tenant-01';
const now = '2026-09-22T08:00:00.000Z';

function makeSession(overrides: Partial<GameSessionDocument> = {}): GameSessionDocument {
  const snapshot = createInitialRunState({ runId: 'run-01', userOid, beatmapId: 'office-day-01' });
  return {
    id: snapshot.runId,
    type: 'gameSession',
    userOid,
    tenantId,
    beatmapId: 'office-day-01',
    status: 'active',
    snapshot,
    inputEvents: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeResult(overrides: Partial<GameResultDocument> = {}): GameResultDocument {
  return {
    id: 'result-01',
    type: 'gameResult',
    userOid,
    displayName: 'Player',
    beatmapId: 'office-day-01',
    leaderboardKey: 'all-time',
    status: 'completed',
    score: 1000,
    perfectCount: 10,
    goodCount: 2,
    missCount: 1,
    maxCombo: 10,
    durationMs: 120000,
    playedAt: now,
    schemaVersion: 1,
    ...overrides,
  };
}

describe('SessionRepository', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('creates session and active-user lock in one partition transaction', async () => {
    const session = makeSession();
    const batch = vi.fn().mockResolvedValue({
      result: [
        { statusCode: 201, eTag: 'lock-etag' },
        { statusCode: 201, eTag: 'session-etag', resourceBody: session },
      ],
    });
    const repository = new SessionRepository({ items: { batch } } as unknown as Container);

    const created = await repository.create(session);

    expect(batch).toHaveBeenCalledWith(
      [
        expect.objectContaining({ operationType: 'Create', resourceBody: expect.objectContaining({ id: '__active__', runId: session.id }) }),
        expect.objectContaining({ operationType: 'Create', resourceBody: session }),
      ],
      userOid,
    );
    expect(created._etag).toBe('session-etag');
  });

  it('surfaces the active-session uniqueness conflict instead of hiding it', async () => {
    const batch = vi.fn().mockResolvedValue({ result: [{ statusCode: 409 }, { statusCode: 424 }] });
    const repository = new SessionRepository({ items: { batch } } as unknown as Container);

    await expect(repository.create(makeSession())).rejects.toBeInstanceOf(ActiveSessionConflictError);
  });

  it('reads the active session through the lock and checks the tenant boundary', async () => {
    const session = makeSession();
    const item = vi.fn((id: string) => ({
      read: vi.fn().mockResolvedValue(id === '__active__'
        ? { resource: { id, type: 'activeSessionLock', userOid, tenantId, runId: session.id }, etag: 'lock-etag' }
        : { resource: session, etag: 'session-etag' }),
    }));
    const repository = new SessionRepository({ item } as unknown as Container);

    await expect(repository.getActiveByUser(userOid, tenantId)).resolves.toMatchObject({ id: session.id, _etag: 'session-etag' });
    await expect(repository.getActiveByUser(userOid, 'other-tenant')).resolves.toBeUndefined();
  });

  it('uses If-Match for snapshot writes and preserves a 412 conflict as recoverable', async () => {
    const session = makeSession();
    const replace = vi.fn().mockRejectedValue({ statusCode: 412 });
    const item = vi.fn(() => ({ read: vi.fn().mockResolvedValue({ resource: session, etag: 'etag-v1' }), replace }));
    const repository = new SessionRepository({ item } as unknown as Container);

    await expect(repository.replaceSnapshot(userOid, session.id, session.snapshot, 'etag-v1')).rejects.toBeInstanceOf(CosmosPreconditionFailedError);
    expect(replace).toHaveBeenCalledWith(expect.objectContaining({ snapshot: session.snapshot }), {
      accessCondition: { type: 'IfMatch', condition: 'etag-v1' },
    });
  });

  it('deduplicates raw events by event id before conditionally appending', async () => {
    const event = { eventId: 'input-01', type: 'keydown' as const, songPositionMs: 1200, receivedAt: now };
    const session = makeSession({ inputEvents: [event] });
    const replace = vi.fn();
    const repository = new SessionRepository({
      item: vi.fn(() => ({ read: vi.fn().mockResolvedValue({ resource: session, etag: 'etag-v1' }), replace })),
    } as unknown as Container);

    await expect(repository.appendEvent(userOid, session.id, event, 'etag-v1')).resolves.toMatchObject({ inputEvents: [event] });
    expect(replace).not.toHaveBeenCalled();
  });

  it('retains raw input data for 90 days and releases the active lock atomically', async () => {
    const session = makeSession();
    const batch = vi.fn().mockResolvedValue({ result: [{ statusCode: 200, eTag: 'etag-v2' }, { statusCode: 204 }] });
    const item = vi.fn((id: string) => ({
      read: vi.fn().mockResolvedValue(id === '__active__'
        ? { resource: { id, type: 'activeSessionLock', userOid, tenantId, runId: session.id }, etag: 'lock-etag' }
        : { resource: session, etag: 'etag-v1' }),
    }));
    const repository = new SessionRepository({ item, items: { batch } } as unknown as Container);

    const terminal = await repository.markTerminal(userOid, session.id, 'completed', 'etag-v1');

    expect(terminal).toMatchObject({ terminalStatus: 'completed', ttl: RAW_EVENT_RETENTION_SECONDS });
    const [operations, partitionKey] = batch.mock.calls[0] as unknown as [Array<Record<string, unknown>>, string];
    expect(partitionKey).toBe(userOid);
    expect(operations[0]).toMatchObject({ operationType: 'Replace', ifMatch: 'etag-v1' });
    expect(operations[1]).toMatchObject({ operationType: 'Delete', id: '__active__' });
  });
});

describe('ResultRepository', () => {
  it('inserts validated terminal results and parameterizes partition-scoped leaderboard queries', async () => {
    const result = makeResult();
    const create = vi.fn().mockResolvedValue({ resource: result });
    const fetchAll = vi.fn().mockResolvedValue({ resources: [makeResult({ id: 'result-02', score: 900 }), result] });
    const query = vi.fn(() => ({ fetchAll }));
    const repository = new ResultRepository({ items: { create, query } } as unknown as Container);

    await expect(repository.insertResult(result)).resolves.toEqual(result);
    await expect(repository.queryLeaderboard('all-time', 10)).resolves.toMatchObject([{ id: 'result-01' }, { id: 'result-02' }]);
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        parameters: expect.arrayContaining([
          { name: '@leaderboardKey', value: 'all-time' },
          { name: '@status', value: 'completed' },
        ]),
      }),
      { partitionKey: 'all-time', maxItemCount: 10 },
    );
  });

  it('validates daily leaderboard keys and enforces safe result limits', async () => {
    const fetchAll = vi.fn().mockResolvedValue({ resources: [] });
    const query = vi.fn(() => ({ fetchAll }));
    const repository = new ResultRepository({ items: { query } } as unknown as Container);

    expect(getDailyLeaderboardKey(new Date('2026-09-22T23:59:00.000Z'))).toBe('daily:2026-09-22');
    await expect(repository.queryLeaderboard('daily:2026-02-30')).rejects.toThrow(/real calendar date/);
    await repository.queryLeaderboard('daily:2026-09-22', 500);
    expect(query).toHaveBeenCalledWith(expect.anything(), { partitionKey: 'daily:2026-09-22', maxItemCount: 100 });
  });

  it('rejects non-terminal result documents', async () => {
    const create = vi.fn();
    const repository = new ResultRepository({ items: { create } } as unknown as Container);
    await expect(repository.insertResult(makeResult({ status: 'active' as GameResultDocument['status'] }))).rejects.toThrow(/terminal/);
    expect(create).not.toHaveBeenCalled();
  });
});
