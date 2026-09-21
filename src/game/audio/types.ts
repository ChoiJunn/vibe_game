import type { Beatmap } from '@/domain/rhythm';

export type AudioClockState = 'idle' | 'countdown' | 'playing' | 'paused' | 'ended';

export type AudioSettings = {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  inputOffsetMs: number;
};

export interface AudioClock {
  load(beatmap: Beatmap, settings: AudioSettings): Promise<void>;
  start(atSongMs?: number): Promise<void>;
  pause(): void;
  resume(): Promise<void>;
  stop(): void;
  getSongPositionMs(): number;
  getState(): AudioClockState;
  setSettings(settings: AudioSettings): void;
  subscribe(listener: (state: AudioClockState) => void): () => void;
}

export type AudioClockOptions = {
  contextFactory?: () => AudioContext;
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  muted: false,
  inputOffsetMs: 0,
};

export function clampAudioSettings(settings: AudioSettings): AudioSettings {
  return {
    musicVolume: clamp(settings.musicVolume, 0, 1),
    sfxVolume: clamp(settings.sfxVolume, 0, 1),
    muted: settings.muted,
    inputOffsetMs: Number.isFinite(settings.inputOffsetMs) ? settings.inputOffsetMs : 0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
