import 'server-only';

import { randomUUID } from 'node:crypto';
import type { RunState } from '@/domain/rhythm';
import { createInitialRunState } from '@/game/state/reduceRunState';
import type { GameIdentity } from './authenticateRequest';
import { ActiveSessionConflictError, CosmosOperationError, CosmosPreconditionFailedError } from '@/server/cosmos/errors';
import type { GameSessionDocument, StoredCosmosDocument, TerminalRunStatus, VerifiedInputEvent } from '@/server/cosmos/models';
import { getGameContainers } from '@/server/cosmos/containers';
import { SessionRepository } from '@/server/cosmos/sessionRepository';

export type SessionRecord = StoredCosmosDocument<GameSessionDocument>;
export type PauseReason = 'button' | 'escape' | 'visibility' | 'blur' | 'browser-back';

export class SessionService {
  constructor(
    private readonly repository: SessionRepository,
    private readonly createId: () => string = randomUUID,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async getActive(identity: GameIdentity): Promise<SessionRecord | undefined> {
    return this.repository.getActiveByUser(identity.oid, identity.tenantId);
  }

  async createOrGet(identity: GameIdentity): Promise<{ session: SessionRecord; created: boolean }> {
    const current = await this.getActive(identity);
    if (current) return { session: current, created: false };

    const id = this.createId();
    const now = this.now();
    const snapshot = createInitialRunState({ runId: id, userOid: identity.oid, beatmapId: 'office-day-01' });
    const document: GameSessionDocument = {
      id,
      type: 'gameSession',
      userOid: identity.oid,
      tenantId: identity.tenantId,
      beatmapId: 'office-day-01',
      status: 'active',
      snapshot: { ...snapshot, updatedAt: now },
      inputEvents: [],
      createdAt: now,
      updatedAt: now,
    };

    try {
      return { session: await this.repository.create(document), created: true };
    } catch (error) {
      if (!(error instanceof ActiveSessionConflictError)) throw error;
      const racedSession = await this.getActive(identity);
      if (!racedSession) throw error;
      return { session: racedSession, created: false };
    }
  }

  async appendAndSnapshot(
    identity: GameIdentity,
    runId: string,
    events: VerifiedInputEvent[],
    snapshot: RunState | undefined,
    expectedEtag: string,
  ): Promise<SessionRecord> {
    let current: SessionRecord | undefined;
    let etag = expectedEtag;
    for (const event of events) {
      current = await this.repository.appendEvent(identity.oid, runId, event, etag);
      etag = current._etag;
    }
    if (snapshot) {
      current = await this.repository.replaceSnapshot(identity.oid, runId, snapshot, etag);
    }
    if (!current) throw new Error('At least one event or a snapshot is required.');
    return current;
  }

  async pause(identity: GameIdentity, runId: string, snapshot: RunState, etag: string): Promise<SessionRecord> {
    return this.repository.pauseSnapshot(identity.oid, runId, snapshot, etag);
  }

  async abandon(identity: GameIdentity, runId: string, etag: string): Promise<SessionRecord> {
    const current = await this.repository.getActiveByUser(identity.oid, identity.tenantId);
    if (!current || current.id !== runId) throw new Error('The active game session was not found.');
    const terminalSnapshot = { ...current.snapshot, status: 'abandoned' as const, updatedAt: this.now() };
    const saved = await this.repository.replaceSnapshot(identity.oid, runId, terminalSnapshot, etag);
    return this.repository.markTerminal(identity.oid, runId, 'abandoned', saved._etag);
  }
}

let sessionService: SessionService | undefined;

export function getSessionService(): SessionService {
  if (!sessionService) sessionService = new SessionService(new SessionRepository(getGameContainers().sessions));
  return sessionService;
}

export function requireVersion(value: string | null | undefined): string {
  const version = value?.trim().replace(/^W\//, '').replace(/^|$/g, '');
  if (!version) throw new Error('A current session version is required.');
  return version;
}

export function validateSnapshot(value: unknown, identity: GameIdentity, runId: string): RunState {
  if (!value || typeof value !== 'object') throw new Error('A valid game snapshot is required.');
  const snapshot = value as Partial<RunState>;
  const counts = [snapshot.nextEventIndex, snapshot.hearts, snapshot.combo, snapshot.maxCombo, snapshot.consecutivePerfects, snapshot.score, snapshot.perfectCount, snapshot.goodCount, snapshot.missCount];
  if (
    snapshot.runId !== runId || snapshot.userOid !== identity.oid || snapshot.beatmapId !== 'office-day-01' ||
    !['active', 'paused'].includes(snapshot.status ?? '') || !Number.isFinite(snapshot.cursorMs) || (snapshot.cursorMs ?? -1) < 0 ||
    counts.some((number) => !Number.isSafeInteger(number) || (number ?? -1) < 0) || typeof snapshot.updatedAt !== 'string'
  ) throw new Error('The snapshot does not match the active run or contains invalid state.');
  return snapshot as RunState;
}

export function validateEvents(value: unknown): VerifiedInputEvent[] {
  if (!Array.isArray(value) || value.length > 128) throw new Error('events must contain at most 128 input records.');
  return value.map((candidate) => {
    if (!candidate || typeof candidate !== 'object') throw new Error('Invalid input event.');
    const event = candidate as Partial<VerifiedInputEvent>;
    if (
      typeof event.eventId !== 'string' || event.eventId.length > 80 || !event.eventId ||
      !Number.isSafeInteger(event.clientSequence) || (event.clientSequence ?? -1) < 0 ||
      (event.type !== 'keydown' && event.type !== 'keyup') || !Number.isFinite(event.songPositionMs) || (event.songPositionMs ?? -1) < 0
    ) throw new Error('Invalid input event fields.');
    return {
      eventId: event.eventId,
      clientSequence: event.clientSequence as number,
      type: event.type,
      songPositionMs: event.songPositionMs as number,
      receivedAt: new Date().toISOString(),
      ...(event.judgement && ['perfect', 'good', 'miss'].includes(event.judgement) ? { judgement: event.judgement } : {}),
    };
  });
}

export function validatePauseReason(value: unknown): PauseReason {
  if (value === 'button' || value === 'escape' || value === 'visibility' || value === 'blur' || value === 'browser-back') return value;
  throw new Error('A valid pause reason is required.');
}

export function toTerminalStatus(value: unknown): TerminalRunStatus {
  if (value === 'completed' || value === 'failed' || value === 'abandoned') return value;
  throw new Error('Invalid terminal session status.');
}

export function getServiceErrorStatus(error: unknown): number {
  if (error instanceof CosmosPreconditionFailedError) return 412;
  if (error instanceof ActiveSessionConflictError) return 409;
  if (error instanceof CosmosOperationError) return error.statusCode >= 500 ? 503 : error.statusCode;
  if (error && typeof error === 'object' && 'statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode >= 500 ? 503 : error.statusCode;
  }
  const message = error instanceof Error ? error.message : '';
  return message.includes('not found') ? 404 : 400;
}
