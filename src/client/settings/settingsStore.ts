import { clampAudioSettings, DEFAULT_AUDIO_SETTINGS, type AudioSettings } from '@/game/audio/types';

export const SETTINGS_STORAGE_KEY = 'office-rhythm:settings:v1';
const LEGACY_SETTINGS_STORAGE_KEY = 'office-rhythm:settings:v0';
type SettingsStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export class SettingsStore {
  constructor(private readonly storage?: SettingsStorage) {}

  load(): AudioSettings {
    const storage = this.getStorage();
    if (!storage) return { ...DEFAULT_AUDIO_SETTINGS };

    const current = this.parse(storage.getItem(SETTINGS_STORAGE_KEY));
    if (current) return current;

    const legacy = this.parse(storage.getItem(LEGACY_SETTINGS_STORAGE_KEY));
    if (!legacy) return { ...DEFAULT_AUDIO_SETTINGS };
    this.save(legacy);
    storage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
    return legacy;
  }

  save(settings: AudioSettings): AudioSettings {
    const normalized = clampAudioSettings(settings);
    this.getStorage()?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 1, settings: normalized }));
    return normalized;
  }

  private parse(raw: string | null): AudioSettings | undefined {
    if (!raw) return undefined;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return undefined;
      const envelope = parsed as { version?: unknown; settings?: unknown };
      const values = envelope.version === 1 ? envelope.settings : parsed;
      if (!values || typeof values !== 'object') return undefined;
      const candidate = values as Partial<AudioSettings>;
      return clampAudioSettings({
        musicVolume: typeof candidate.musicVolume === 'number' ? candidate.musicVolume : DEFAULT_AUDIO_SETTINGS.musicVolume,
        sfxVolume: typeof candidate.sfxVolume === 'number' ? candidate.sfxVolume : DEFAULT_AUDIO_SETTINGS.sfxVolume,
        muted: typeof candidate.muted === 'boolean' ? candidate.muted : DEFAULT_AUDIO_SETTINGS.muted,
        inputOffsetMs: typeof candidate.inputOffsetMs === 'number' ? candidate.inputOffsetMs : DEFAULT_AUDIO_SETTINGS.inputOffsetMs,
      });
    } catch {
      return undefined;
    }
  }

  private getStorage(): SettingsStorage | undefined {
    if (this.storage) return this.storage;
    try {
      return typeof window === 'undefined' ? undefined : window.localStorage;
    } catch {
      return undefined;
    }
  }
}

export const settingsStore = new SettingsStore();
