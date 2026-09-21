import type { RunState } from '@/domain/rhythm';
import type { RhythmGameController, RhythmGameSnapshot } from '../RhythmGameController';

export type PauseReason = 'button' | 'escape' | 'visibility' | 'blur' | 'browser-back';
export type PauseState = { paused: boolean; reason?: PauseReason; snapshot?: RunState };

export class PauseCoordinator {
  private readonly controller: Pick<RhythmGameController, 'pause' | 'resume' | 'abandon' | 'getSnapshot'>;
  private state: PauseState = { paused: false };
  private readonly listeners = new Set<(state: PauseState) => void>();

  constructor(controller: Pick<RhythmGameController, 'pause' | 'resume' | 'abandon' | 'getSnapshot'>) {
    this.controller = controller;
  }

  requestPause(reason: PauseReason): boolean {
    const snapshot = this.controller.getSnapshot();
    if (this.state.paused || snapshot.clockState !== 'playing') {
      return false;
    }

    this.controller.pause();
    this.state = { paused: true, reason, snapshot: this.controller.getSnapshot().runState };
    this.emit();
    return true;
  }

  async resume(): Promise<void> {
    if (!this.state.paused) {
      return;
    }

    await this.controller.resume();
    this.state = { paused: false };
    this.emit();
  }

  abandon(): void {
    this.controller.abandon();
    this.state = { paused: false };
    this.emit();
  }

  getState(): PauseState {
    return this.state;
  }

  subscribe(listener: (state: PauseState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

export function getPauseSnapshot(coordinator: PauseCoordinator): RhythmGameSnapshot['runState'] | undefined {
  return coordinator.getState().snapshot;
}
