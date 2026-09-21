import type { Beatmap } from '@/domain/rhythm';
import {
  clampAudioSettings,
  DEFAULT_AUDIO_SETTINGS,
  type AudioClock as AudioClockContract,
  type AudioClockOptions,
  type AudioClockState,
  type AudioSettings,
} from './types';

export class AudioClockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AudioClockError';
  }
}

export class AudioClock implements AudioClockContract {
  private audioContext: AudioContext | null = null;
  private beatmap: Beatmap | null = null;
  private settings: AudioSettings = DEFAULT_AUDIO_SETTINGS;
  private state: AudioClockState = 'idle';
  private songPositionMs = 0;
  private audioAnchorSec = 0;
  private songAnchorMs = 0;
  private readonly listeners = new Set<(state: AudioClockState) => void>();
  private readonly contextFactory: () => AudioContext;

  constructor(options: AudioClockOptions = {}) {
    this.contextFactory = options.contextFactory ?? createBrowserAudioContext;
  }

  async load(beatmap: Beatmap, settings: AudioSettings): Promise<void> {
    this.beatmap = beatmap;
    this.settings = clampAudioSettings(settings);
    this.songPositionMs = 0;
    this.audioAnchorSec = 0;
    this.songAnchorMs = 0;
    this.setState('idle');
    this.ensureAudioContext();
  }

  async start(atSongMs = 0): Promise<void> {
    this.requireBeatmap();
    const position = this.clampSongPosition(atSongMs);

    try {
      const context = this.ensureAudioContext();
      await context.resume();
      this.songPositionMs = position;
      this.songAnchorMs = position;
      this.audioAnchorSec = context.currentTime;
      this.setState(position >= this.getDurationMs() ? 'ended' : 'playing');
    } catch {
      this.setState('idle');
      throw new AudioClockError('오디오를 시작하려면 화면을 클릭하거나 키를 눌러 재생을 허용해 주세요.');
    }
  }

  pause(): void {
    if (this.state !== 'playing') {
      return;
    }

    this.songPositionMs = this.readPlayingPosition();
    void this.audioContext?.suspend().catch(() => undefined);
    this.setState('paused');
  }

  async resume(): Promise<void> {
    if (this.state !== 'paused') {
      return;
    }

    try {
      const context = this.ensureAudioContext();
      await context.resume();
      this.songAnchorMs = this.songPositionMs;
      this.audioAnchorSec = context.currentTime;
      this.setState(this.songPositionMs >= this.getDurationMs() ? 'ended' : 'playing');
    } catch {
      throw new AudioClockError('오디오 재개가 차단되었습니다. 화면과 다시 상호작용한 후 시도해 주세요.');
    }
  }

  stop(): void {
    void this.audioContext?.suspend().catch(() => undefined);
    this.songPositionMs = 0;
    this.songAnchorMs = 0;
    this.audioAnchorSec = 0;
    this.setState('idle');
  }

  getSongPositionMs(): number {
    if (this.state === 'playing') {
      this.songPositionMs = this.readPlayingPosition();
    }

    return this.songPositionMs;
  }

  getState(): AudioClockState {
    return this.state;
  }

  setSettings(settings: AudioSettings): void {
    this.settings = clampAudioSettings(settings);
  }

  subscribe(listener: (state: AudioClockState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSettings(): AudioSettings {
    return this.settings;
  }

  getAudioContext(): AudioContext {
    return this.ensureAudioContext();
  }

  private readPlayingPosition(): number {
    const context = this.ensureAudioContext();
    const elapsedMs = Math.max(0, (context.currentTime - this.audioAnchorSec) * 1000);
    const position = this.clampSongPosition(this.songAnchorMs + elapsedMs);

    if (position >= this.getDurationMs()) {
      this.songPositionMs = this.getDurationMs();
      this.setState('ended');
    }

    return position;
  }

  private ensureAudioContext(): AudioContext {
    if (!this.audioContext) {
      try {
        this.audioContext = this.contextFactory();
      } catch {
        throw new AudioClockError('이 브라우저에서는 Web Audio를 사용할 수 없습니다.');
      }
    }

    return this.audioContext;
  }

  private requireBeatmap(): Beatmap {
    if (!this.beatmap) {
      throw new AudioClockError('오디오 clock에 beatmap을 먼저 load해야 합니다.');
    }

    return this.beatmap;
  }

  private getDurationMs(): number {
    const beatmap = this.requireBeatmap();
    return beatmap.sections[beatmap.sections.length - 1]?.endMs ?? 0;
  }

  private clampSongPosition(position: number): number {
    return Math.min(this.getDurationMs(), Math.max(0, Number.isFinite(position) ? position : 0));
  }

  private setState(nextState: AudioClockState): void {
    if (this.state === nextState) {
      return;
    }

    this.state = nextState;
    this.listeners.forEach((listener) => listener(nextState));
  }
}

function createBrowserAudioContext(): AudioContext {
  const audioContextConstructor =
    globalThis.AudioContext ??
    (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!audioContextConstructor) {
    throw new AudioClockError('이 브라우저에서는 Web Audio를 사용할 수 없습니다.');
  }

  return new audioContextConstructor();
}
