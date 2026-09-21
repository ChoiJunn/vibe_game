import type { InputEvent } from '@/game/judgement/types';

export type SpaceInputControllerOptions = {
  inputTarget?: EventTarget;
  blurTarget?: EventTarget;
  isViewportFocused?: () => boolean;
  getGameState: () => string;
  getSongPositionMs: () => number;
  onInput: (input: InputEvent) => void;
  onPauseRequest: () => void;
};

export class SpaceInputController {
  private readonly inputTarget: EventTarget;
  private readonly blurTarget: EventTarget;
  private readonly isViewportFocused: () => boolean;
  private readonly options: Pick<SpaceInputControllerOptions, 'getGameState' | 'getSongPositionMs' | 'onInput' | 'onPauseRequest'>;
  private attached = false;
  private spaceHeld = false;

  constructor(options: SpaceInputControllerOptions) {
    this.inputTarget = options.inputTarget ?? (typeof window !== 'undefined' ? window : new EventTarget());
    this.blurTarget = options.blurTarget ?? (typeof window !== 'undefined' ? window : new EventTarget());
    this.isViewportFocused = options.isViewportFocused ?? (() => typeof document !== 'undefined' && document.activeElement === this.inputTarget);
    this.options = options;
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
      this.options.onInput({ type: 'keydown', songPositionMs: this.options.getSongPositionMs() });
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
    if (this.options.getGameState() === 'playing') {
      this.options.onInput({ type: 'keyup', songPositionMs: this.options.getSongPositionMs() });
    }
  };

  private readonly handleBlur = (): void => {
    this.spaceHeld = false;
    this.options.onPauseRequest();
  };
}
