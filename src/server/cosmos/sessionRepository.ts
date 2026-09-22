import 'server-only';

import type { Container, OperationInput } from '@azure/cosmos';
import {
  ActiveSessionConflictError,
  CosmosOperationError,
  getCosmosStatusCode,
  rethrowCosmosError,
} from './errors';
import {
  RAW_EVENT_RETENTION_SECONDS,
  type ActiveSessionLockDocument,
  type GameSessionDocument,
  type StoredCosmosDocument,
  type TerminalRunStatus,
  type VerifiedInputEvent,
} from './models';

const ACTIVE_LOCK_ID = '__active__';

export class SessionRepository {
  constructor(private readonly container: Container) {}

  async getActiveByUser(userOid: string, tenantId: string): Promise<StoredCosmosDocument<GameSessionDocument> | undefined> {
    let lockResponse;
    try {
      lockResponse = await this.container.item(ACTIVE_LOCK_ID, userOid).read<ActiveSessionLockDocument>();
    } catch (error) {
      if (getCosmosStatusCode(error) === 404) return undefined;
      throw error;
    }

    const lock = lockResponse.resource;
    if (!lock || lock.tenantId !== tenantId) return undefined;

    try {
      const response = await this.container.item(lock.runId, userOid).read<GameSessionDocument>();
      const session = response.resource;
      if (!session || session.tenantId !== tenantId || session.terminalStatus) return undefined;
      return { ...session, _etag: response.etag };
    } catch (error) {
      if (getCosmosStatusCode(error) === 404) return undefined;
      throw error;
    }
  }

  async create(document: GameSessionDocument): Promise<StoredCosmosDocument<GameSessionDocument>> {
    assertSessionIdentity(document);
    const lock: ActiveSessionLockDocument = {
      id: ACTIVE_LOCK_ID,
      type: 'activeSessionLock',
      userOid: document.userOid,
      tenantId: document.tenantId,
      runId: document.id,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
    const operations: OperationInput[] = [
      { operationType: 'Create', resourceBody: lock },
      { operationType: 'Create', resourceBody: document },
    ];

    try {
      const response = await this.container.items.batch(operations, document.userOid);
      const results = response.result ?? [];
      const failed = results.find((result) => result.statusCode >= 400);
      if (failed) {
        if (failed.statusCode === 409) throw new ActiveSessionConflictError(document.userOid);
        throw new CosmosOperationError(failed.statusCode, 'Cosmos rejected the session-create transaction.');
      }

      const created = results[1];
      if (!created?.resourceBody) throw new Error('Cosmos did not return the created game session.');
      return { ...(created.resourceBody as unknown as GameSessionDocument), _etag: created.eTag ?? '' };
    } catch (error) {
      if (error instanceof ActiveSessionConflictError) throw error;
      if (getCosmosStatusCode(error) === 409) throw new ActiveSessionConflictError(document.userOid);
      rethrowCosmosError(error, 'Create session');
    }
  }

  async replaceSnapshot(
    userOid: string,
    runId: string,
    snapshot: GameSessionDocument['snapshot'],
    expectedEtag: string,
  ): Promise<StoredCosmosDocument<GameSessionDocument>> {
    const current = await this.readSession(userOid, runId);
    assertEtag(expectedEtag);
    if (snapshot.runId !== runId || snapshot.userOid !== userOid) {
      throw new Error('Snapshot identity must match the requested session.');
    }
    if (current.tenantId === '' || current.terminalStatus) throw new Error('A terminal session cannot be autosaved.');

    const updated = { ...current, snapshot, updatedAt: new Date().toISOString() };
    return this.replaceSession(userOid, runId, updated, expectedEtag, 'Replace session snapshot');
  }

  async pauseSnapshot(
    userOid: string,
    runId: string,
    snapshot: GameSessionDocument['snapshot'],
    expectedEtag: string,
  ): Promise<StoredCosmosDocument<GameSessionDocument>> {
    const current = await this.readSession(userOid, runId);
    assertEtag(expectedEtag);
    if (snapshot.runId !== runId || snapshot.userOid !== userOid) {
      throw new Error('Snapshot identity must match the requested session.');
    }
    if (current.terminalStatus) throw new Error('A terminal session cannot be paused.');

    const updated = { ...current, status: 'paused' as const, snapshot: { ...snapshot, status: 'paused' as const }, updatedAt: new Date().toISOString() };
    return this.replaceSession(userOid, runId, updated, expectedEtag, 'Pause session');
  }

  async appendEvent(
    userOid: string,
    runId: string,
    event: VerifiedInputEvent,
    expectedEtag: string,
  ): Promise<StoredCosmosDocument<GameSessionDocument>> {
    const current = await this.readSession(userOid, runId);
    assertEtag(expectedEtag);
    if (current.terminalStatus) throw new Error('Cannot append input to a terminal session.');
    if (!event.eventId || !Number.isSafeInteger(event.clientSequence) || event.clientSequence < 0 || !Number.isFinite(event.songPositionMs) || event.songPositionMs < 0 || !Number.isFinite(Date.parse(event.receivedAt))) {
      throw new Error('Input event must have an id, non-negative song position, and valid receivedAt timestamp.');
    }

    if (current.inputEvents.some((existing) => existing.eventId === event.eventId)) {
      return current;
    }
    const updated = { ...current, inputEvents: [...current.inputEvents, event], updatedAt: new Date().toISOString() };
    return this.replaceSession(userOid, runId, updated, expectedEtag, 'Append session input event');
  }

  async markTerminal(
    userOid: string,
    runId: string,
    status: TerminalRunStatus,
    expectedEtag: string,
  ): Promise<StoredCosmosDocument<GameSessionDocument>> {
    const current = await this.readSession(userOid, runId);
    assertEtag(expectedEtag);
    if (current.terminalStatus) return current;

    const now = new Date();
    const updated: GameSessionDocument = {
      ...current,
      terminalStatus: status,
      expiresAt: new Date(now.getTime() + RAW_EVENT_RETENTION_SECONDS * 1000).toISOString(),
      ttl: RAW_EVENT_RETENTION_SECONDS,
      updatedAt: now.toISOString(),
    };

    const lock = await this.readLock(userOid);
    if (!lock || lock.resource?.runId !== runId) {
      return this.replaceSession(userOid, runId, updated, expectedEtag, 'Mark session terminal');
    }

    const operations: OperationInput[] = [
      {
        operationType: 'Replace',
        id: runId,
        resourceBody: updated,
        partitionKey: userOid,
        ifMatch: expectedEtag,
      },
      {
        operationType: 'Delete',
        id: ACTIVE_LOCK_ID,
        partitionKey: userOid,
      },
    ];

    try {
      const response = await this.container.items.batch(operations, userOid);
      const failed = response.result?.find((result) => result.statusCode >= 400);
      if (failed) {
        if (failed.statusCode === 412) rethrowCosmosError({ statusCode: 412 }, 'Mark session terminal');
        throw new CosmosOperationError(failed.statusCode, 'Cosmos rejected the terminal-session transaction.');
      }
      const replaced = response.result?.[0];
      return { ...updated, _etag: replaced?.eTag ?? expectedEtag };
    } catch (error) {
      rethrowCosmosError(error, 'Mark session terminal');
    }
  }

  private async readSession(userOid: string, runId: string): Promise<StoredCosmosDocument<GameSessionDocument>> {
    try {
      const response = await this.container.item(runId, userOid).read<GameSessionDocument>();
      if (!response.resource) throw new CosmosOperationError(404, 'Game session was not found.');
      return { ...response.resource, _etag: response.etag };
    } catch (error) {
      rethrowCosmosError(error, 'Read session');
    }
  }

  private async readLock(userOid: string) {
    try {
      return await this.container.item(ACTIVE_LOCK_ID, userOid).read<ActiveSessionLockDocument>();
    } catch (error) {
      if (getCosmosStatusCode(error) === 404) return undefined;
      throw error;
    }
  }

  private async replaceSession(
    userOid: string,
    runId: string,
    document: GameSessionDocument,
    expectedEtag: string,
    operation: string,
  ): Promise<StoredCosmosDocument<GameSessionDocument>> {
    const resource = { ...document } as Partial<StoredCosmosDocument<GameSessionDocument>>;
    delete resource._etag;
    delete resource._ts;
    try {
      const response = await this.container.item(runId, userOid).replace(resource as GameSessionDocument, {
        accessCondition: { type: 'IfMatch', condition: expectedEtag },
      });
      return { ...(resource as GameSessionDocument), _etag: response.etag };
    } catch (error) {
      rethrowCosmosError(error, operation);
    }
  }
}

function assertSessionIdentity(document: GameSessionDocument): void {
  if (!document.id || document.id !== document.snapshot.runId) throw new Error('Session id must equal snapshot.runId.');
  if (!document.userOid || document.userOid !== document.snapshot.userOid) throw new Error('Session userOid must equal snapshot.userOid.');
  if (!document.tenantId || !document.beatmapId || !Number.isFinite(Date.parse(document.createdAt)) || !Number.isFinite(Date.parse(document.updatedAt))) {
    throw new Error('Session tenant, beatmap, and timestamps are required.');
  }
}

function assertEtag(etag: string): void {
  if (!etag.trim()) throw new Error('An ETag from the latest read is required for conditional updates.');
}
