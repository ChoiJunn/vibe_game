import type { RunState } from '@/domain/rhythm';
import type { PauseReason } from '@/game/pause/PauseCoordinator';
import { SessionApiError, type SessionApiClient } from '@/client/game/sessionApi';
import type { VerifiedInputEvent } from '@/server/cosmos/models';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'retrying' | 'error' | 'conflict';
export type AutosaveState = {
  status: AutosaveStatus;
  message?: string;
  latestServerSession?: Awaited<ReturnType<SessionApiClient['getActive']>>;
};

export type AutosaveOptions = {
  debounceMs?: number;
  intervalMs?: number;
  maxRetries?: number;
  sleep?: (milliseconds: number) => Promise<void>;
};

export class AutosaveCoordinator {
  private version: string;
  private readonly api: SessionApiClient;
  private readonly runId: string;
  private readonly readSnapshot: () => RunState;
  private readonly debounceMs: number;
  private readonly intervalMs: number;
  private readonly maxRetries: number;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private pendingEvents: VerifiedInputEvent[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private intervalTimer: ReturnType<typeof setInterval> | undefined;
  private state: AutosaveState = { status: 'idle' };
  private inFlight: Promise<void> | undefined;
  private readonly listeners = new Set<(state: AutosaveState) => void>();

  constructor(input: {
    api: SessionApiClient;
    runId: string;
    version: string;
    readSnapshot: () => RunState;
    options?: AutosaveOptions;
  }) {
    this.api = input.api;
    this.runId = input.runId;
    this.version = input.version;
    this.readSnapshot = input.readSnapshot;
    this.debounceMs = input.options?.debounceMs ?? 250;
    this.intervalMs = input.options?.intervalMs ?? 5000;
    this.maxRetries = input.options?.maxRetries ?? 4;
    this.sleep = input.options?.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  start(): void {
    if (this.intervalTimer) return;
    this.intervalTimer = setInterval(() => void this.saveNow(), this.intervalMs);
  }

  stop(): void {
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.intervalTimer = undefined;
    this.debounceTimer = undefined;
  }

  recordInput(event: VerifiedInputEvent): void {
    this.pendingEvents.push(event);
    this.scheduleSave();
  }

  onJudgement(): void {
    this.scheduleSave();
  }

  onVisibilityChange(hidden: boolean): void {
    if (hidden) void this.saveNow();
  }

  saveNow(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    const snapshot = this.readSnapshot();
    const events = this.pendingEvents;
    this.pendingEvents = [];
    this.setState({ status: 'saving' });
    this.inFlight = this.persist(snapshot, events).finally(() => {
      this.inFlight = undefined;
      if (this.pendingEvents.length) this.scheduleSave();
    });
    return this.inFlight;
  }

  async pause(reason: PauseReason): Promise<void> {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = undefined;
    if (this.inFlight) await this.inFlight;
    await this.saveNow();
    if (this.state.status === 'error' || this.state.status === 'conflict') {
      throw new Error(this.state.message ?? 'The latest game state could not be saved before pausing.');
    }
    const snapshot = { ...this.readSnapshot(), status: 'paused' as const };
    try {
      const result = await this.withRetry(() => this.api.pause(this.runId, this.version, snapshot, reason));
      this.version = result.version;
      this.setState({ status: 'saved' });
    } catch (error) {
      this.reportError(error);
      throw error;
    }
  }

  async abandon(confirmed: boolean): Promise<void> {
    if (!confirmed) throw new Error('Abandoning a run requires explicit user confirmation.');
    if (this.inFlight) await this.inFlight;
    await this.saveNow();
    if (this.state.status === 'error' || this.state.status === 'conflict') {
      throw new Error(this.state.message ?? 'The latest game state could not be saved before abandoning.');
    }
    try {
      const result = await this.api.abandon(this.runId, this.version, true);
      this.version = result.version;
      this.stop();
      this.setState({ status: 'saved' });
    } catch (error) {
      this.reportError(error);
      throw error;
    }
  }

  getState(): AutosaveState { return this.state; }

  subscribe(listener: (state: AutosaveState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private scheduleSave(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined;
      void this.saveNow();
    }, this.debounceMs);
  }

  private async persist(snapshot: RunState, events: VerifiedInputEvent[]): Promise<void> {
    try {
      const result = await this.withRetry(() => this.api.save(this.runId, this.version, events, snapshot));
      this.version = result.version;
      this.setState({ status: 'saved' });
    } catch (error) {
      this.pendingEvents = [...events, ...this.pendingEvents];
      this.reportError(error);
    }
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (error instanceof SessionApiError && error.status < 500) throw error;
        if (attempt >= this.maxRetries) throw error;
        this.setState({ status: 'retrying', message: 'Network issue; retrying the save.' });
        await this.sleep(Math.min(4000, 250 * (2 ** attempt)));
      }
    }
  }

  private reportError(error: unknown): void {
    if (error instanceof SessionApiError && error.status === 412) {
      this.setState({
        status: 'conflict',
        message: error.message,
        latestServerSession: error.latestSession,
      });
      return;
    }
    this.setState({ status: 'error', message: error instanceof Error ? error.message : 'Save failed.' });
  }

  private setState(state: AutosaveState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }
}
