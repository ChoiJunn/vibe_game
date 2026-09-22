import type { RunState } from '@/domain/rhythm';
import type { PauseReason } from '@/game/pause/PauseCoordinator';
import type { GameSessionDocument, VerifiedInputEvent } from '@/server/cosmos/models';

export type SessionEnvelope = { session: GameSessionDocument; version: string };
export type ActiveSessionResponse = SessionEnvelope | null;
export type ResultSubmissionResponse = { result: { id: string; score: number }; session: GameSessionDocument; version: string; created: boolean };
export type IdTokenProvider = () => Promise<string>;
export type FetchLike = typeof fetch;

type ErrorPayload = { error?: string; code?: string };

export class SessionApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly latestSession?: ActiveSessionResponse,
  ) {
    super(message);
    this.name = 'SessionApiError';
  }
}

export class SessionApiClient {
  constructor(
    private readonly getIdToken: IdTokenProvider,
    private readonly fetcher: FetchLike = globalThis.fetch.bind(globalThis),
    private readonly requestTimeoutMs = 15_000,
  ) {}

  createOrResume(): Promise<SessionEnvelope> {
    return this.request<SessionEnvelope>('/api/game/session', { method: 'POST' });
  }

  async getActive(): Promise<ActiveSessionResponse> {
    const result = await this.request<{ session: GameSessionDocument | null; version?: string }>(
      '/api/game/session', { method: 'GET' }, false,
    );
    return result.session && result.version ? { session: result.session, version: result.version } : null;
  }

  save(
    runId: string,
    version: string,
    events: VerifiedInputEvent[],
    snapshot: RunState,
  ): Promise<SessionEnvelope> {
    return this.request('/api/game/session/events', {
      method: 'POST',
      headers: { 'If-Match': version },
      body: JSON.stringify({
        runId,
        clientSequence: events[0]?.clientSequence ?? snapshot.nextEventIndex,
        events,
        snapshot,
      }),
    }, true);
  }

  pause(
    runId: string,
    version: string,
    snapshot: RunState,
    reason: PauseReason,
  ): Promise<SessionEnvelope> {
    return this.request('/api/game/session/pause', {
      method: 'POST',
      headers: { 'If-Match': version },
      body: JSON.stringify({ runId, snapshot, reason }),
    });
  }

  abandon(runId: string, version: string, confirmed: boolean): Promise<SessionEnvelope> {
    return this.request('/api/game/session/abandon', {
      method: 'POST',
      headers: { 'If-Match': version },
      body: JSON.stringify({ runId, expectedVersion: version, confirmed }),
    });
  }

  submitResult(
    runId: string,
    terminalStatus: 'completed' | 'failed' | 'abandoned',
    claimedSnapshot: RunState,
  ): Promise<ResultSubmissionResponse> {
    return this.request('/api/game/results', {
      method: 'POST',
      body: JSON.stringify({ runId, terminalStatus, claimedSnapshot, confirmed: terminalStatus === 'abandoned' }),
    });
  }

  private async request<T>(path: string, init: RequestInit, reloadOnConflict = false): Promise<T> {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.requestTimeoutMs);
    let tokenTimeout: ReturnType<typeof setTimeout> | undefined;

    try {
      const token = await Promise.race([
        this.getIdToken(),
        new Promise<never>((_, reject) => {
          tokenTimeout = setTimeout(() => reject(new RequestTimeoutError()), this.requestTimeoutMs);
        }),
      ]);
      const response = await this.fetcher(path, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...init.headers,
        },
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as ErrorPayload;
        const latestSession = response.status === 412 && reloadOnConflict ? await this.getActive().catch(() => null) : undefined;
        throw new SessionApiError(
          payload.error ?? 'The game session request failed.',
          response.status,
          payload.code ?? 'SESSION_SERVICE_ERROR',
          latestSession,
        );
      }
      return await response.json() as T;
    } catch (error) {
      if (timedOut || error instanceof RequestTimeoutError || (error instanceof DOMException && error.name === 'AbortError')) {
        throw new SessionApiError('The save request timed out. Check your connection and retry.', 408, 'REQUEST_TIMEOUT');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      if (tokenTimeout) clearTimeout(tokenTimeout);
    }
  }
}

class RequestTimeoutError extends Error {}
