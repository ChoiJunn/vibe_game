import { describe, expect, it } from 'vitest';
import type { RunState } from '@/domain/rhythm';
import type { GameIdentity } from './authenticateRequest';
import { SessionService, validateEvents, validateSnapshot } from './sessionService';
import type { GameSessionDocument, StoredCosmosDocument, VerifiedInputEvent } from '@/server/cosmos/models';
import { ActiveSessionConflictError, CosmosPreconditionFailedError } from '@/server/cosmos/errors';
import type { SessionRepository } from '@/server/cosmos/sessionRepository';

const identity: GameIdentity = { oid: 'oid-1', tenantId: 'tenant-1' };

class MemorySessionRepository {
  record?: StoredCosmosDocument<GameSessionDocument>;
  revision = 0;

  async getActiveByUser(oid: string, tenantId: string) {
    if (!this.record || this.record.userOid !== oid || this.record.tenantId !== tenantId || this.record.terminalStatus) return undefined;
    return this.record;
  }

  async create(document: GameSessionDocument) {
    if (this.record && !this.record.terminalStatus) throw new ActiveSessionConflictError(document.userOid);
    this.record = { ...document, _etag: 'v' + (++this.revision) };
    return this.record;
  }

  async appendEvent(oid: string, runId: string, event: VerifiedInputEvent, version: string) {
    const current = this.require(oid, runId, version);
    if (current.inputEvents.some((item) => item.eventId === event.eventId)) return current;
    return this.write({ ...current, inputEvents: [...current.inputEvents, event] });
  }

  async replaceSnapshot(oid: string, runId: string, snapshot: RunState, version: string) {
    const current = this.require(oid, runId, version);
    return this.write({ ...current, snapshot });
  }

  async pauseSnapshot(oid: string, runId: string, snapshot: RunState, version: string) {
    const current = this.require(oid, runId, version);
    return this.write({ ...current, status: 'paused', snapshot: { ...snapshot, status: 'paused' } });
  }

  async markTerminal(oid: string, runId: string, status: 'abandoned', version: string) {
    const current = this.require(oid, runId, version);
    return this.write({ ...current, terminalStatus: status, ttl: 7776000 });
  }

  private require(oid: string, runId: string, version: string) {
    if (!this.record || this.record.userOid !== oid || this.record.id !== runId) throw new Error('Session not found.');
    if (this.record._etag !== version) throw new CosmosPreconditionFailedError();
    return this.record;
  }

  private write(document: GameSessionDocument) {
    this.record = { ...document, _etag: 'v' + (++this.revision) };
    return this.record;
  }
}

describe('SessionService lifecycle', () => {
  it('creates once, saves events and pause state, resumes, then abandons only after confirmation at the API boundary', async () => {
    const repository = new MemorySessionRepository();
    const service = new SessionService(repository as unknown as SessionRepository, () => 'run-1', () => '2026-09-22T00:00:00.000Z');

    const created = await service.createOrGet(identity);
    expect(created.created).toBe(true);
    const repeated = await service.createOrGet(identity);
    expect(repeated.created).toBe(false);
    expect(repeated.session.id).toBe(created.session.id);

    const event = validateEvents([{ eventId: 'event-1', clientSequence: 0, type: 'keydown', songPositionMs: 500 }])[0];
    const changed = await service.appendAndSnapshot(identity, 'run-1', [event], undefined, created.session._etag);
    const pausedSnapshot = validateSnapshot({ ...changed.snapshot, cursorMs: 500, status: 'paused' }, identity, 'run-1');
    const paused = await service.pause(identity, 'run-1', pausedSnapshot, changed._etag);
    expect(paused.snapshot.cursorMs).toBe(500);
    expect(paused.snapshot.nextEventIndex).toBe(0);
    expect((await service.getActive(identity))?.id).toBe('run-1');

    const abandoned = await service.abandon(identity, 'run-1', paused._etag);
    expect(abandoned.terminalStatus).toBe('abandoned');
    expect(await service.getActive(identity)).toBeUndefined();
  });

  it('rejects client-controlled user identity in snapshots and malformed event sequences', () => {
    const invalidSnapshot = { runId: 'run-1', userOid: 'somebody-else', beatmapId: 'office-day-01' };
    expect(() => validateSnapshot(invalidSnapshot, identity, 'run-1')).toThrow(/snapshot/i);
    expect(() => validateEvents([{ eventId: 'x', clientSequence: -1, type: 'keydown', songPositionMs: 1 }])).toThrow(/event/i);
  });
});
