import type { InputEvent } from '@/game/judgement/types';
import type { VerifiedInputEvent } from '@/server/cosmos/models';

export type SpaceInputControllerOptions = {
  inputTarget?: EventTarget;
  blurTarget?: EventTarget;
  isViewportFocused?: () => boolean;
  getGameState: () => string;
  getSongPositionMs: () => number;
  onInput: (input: InputEvent) => void;
  onPersistInput?: (input: VerifiedInputEvent) => void;
  getInputOffsetMs?: () => number;
  initialSequence?: number;
  onPauseRequest: () => void;
};

export class SpaceInputController {
  private readonly inputTarget: EventTarget;
  private readonly blurTarget: EventTarget;
  private readonly isViewportFocused: () => boolean;
  private readonly options: Pick<SpaceInputControllerOptions, 'getGameState' | 'getSongPositionMs' | 'onInput' | 'onPauseRequest' | 'onPersistInput' | 'getInputOffsetMs'>;
  private attached = false;
  private spaceHeld = false;
  private persistedSpaceDown = false;
  private sequence: number;
  private releaseWaiters = new Set<() => void>();

  constructor(options: SpaceInputControllerOptions) {
    this.inputTarget = options.inputTarget ?? (typeof window !== 'undefined' ? window : new EventTarget());
    this.blurTarget = options.blurTarget ?? (typeof window !== 'undefined' ? window : new EventTarget());
    this.isViewportFocused = options.isViewportFocused ?? (() => typeof document !== 'undefined' && document.activeElement === this.inputTarget);
    this.options = options;
    this.sequence = options.initialSequence ?? 0;
  }

  start(): void {
    if (this.attached) {
      return;
    }

    this.inputTarget.addEventListener('keydown', this.handleKeyDown);
    this.inputTarget.addEventListener('keyup', this.handleKeyUp);
    this.blurTarget.addEventListener('blur', this.handleBlur);
    this.attached = true;
  }

  stop(): void {
    if (!this.attached) {
      return;
    }

    this.inputTarget.removeEventListener('keydown', this.handleKeyDown);
    this.inputTarget.removeEventListener('keyup', this.handleKeyUp);
    this.blurTarget.removeEventListener('blur', this.handleBlur);
    this.attached = false;
    this.spaceHeld = false;
    this.persistedSpaceDown = false;
  }

  releaseHeld(): void {
    if (!this.spaceHeld) return;
    this.spaceHeld = false;
    // Keep recorded keydown/keyup pairs complete even if the final judgement
    // ended the run while Space was held; ignore keys pressed while paused.
    if (this.persistedSpaceDown) {
      this.persistedSpaceDown = false;
      this.forwardInput('keyup');
    }
    this.notifyReleased();
  }

  waitForRelease(): Promise<void> {
    if (!this.spaceHeld) return Promise.resolve();
    return new Promise((resolve) => this.releaseWaiters.add(resolve));
  }

  private readonly handleKeyDown = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.code !== 'Space') {
      return;
    }

    if (this.isViewportFocused()) {
      keyboardEvent.preventDefault();
    }

    if (keyboardEvent.repeat || this.spaceHeld) {
      return;
    }

    this.spaceHeld = true;
    if (this.options.getGameState() === 'playing') {
      this.persistedSpaceDown = true;
      this.forwardInput('keydown');
    }
  };

  private readonly handleKeyUp = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.code !== 'Space') {
      return;
    }

    if (this.isViewportFocused()) {
      keyboardEvent.preventDefault();
    }

    if (!this.spaceHeld) {
      return;
    }

    this.spaceHeld = false;
    if (this.persistedSpaceDown) {
      this.persistedSpaceDown = false;
      this.forwardInput('keyup');
    }
    this.notifyReleased();
  };

  private readonly handleBlur = (): void => {
    this.releaseHeld();
    this.options.onPauseRequest();
  };

  private forwardInput(type: InputEvent['type']): void {
    const songPositionMs = this.options.getSongPositionMs();
    const inputOffsetMs = this.options.getInputOffsetMs?.() ?? 0;
    if (this.options.onPersistInput) this.options.onPersistInput({
      eventId: globalThis.crypto?.randomUUID?.() ?? `input-${Date.now()}-${this.sequence}`,
      clientSequence: this.sequence++,
      type,
      songPositionMs,
      inputOffsetMs,
      receivedAt: new Date().toISOString(),
    });
    this.options.onInput({ type, songPositionMs });
  }

  private notifyReleased(): void {
    this.releaseWaiters.forEach((resolve) => resolve());
    this.releaseWaiters.clear();
  }
}
