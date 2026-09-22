import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsStore, SETTINGS_STORAGE_KEY } from './settingsStore';

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  };
}

describe('SettingsStore', () => {
  let storage: Storage;
  let store: SettingsStore;

  beforeEach(() => {
    storage = createMemoryStorage();
    store = new SettingsStore(storage);
  });

  it('round-trips settings in a versioned namespace without identity or token fields', () => {
    const saved = store.save({ musicVolume: 0.4, sfxVolume: 0.25, muted: true, inputOffsetMs: -35 });
    expect(store.load()).toEqual(saved);
    expect(JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY) ?? '{}').version).toBe(1);
    expect(storage.getItem(SETTINGS_STORAGE_KEY)).not.toMatch(/token|email|oid|tenant/i);
  });

  it('clamps unsafe values to supported volume and calibration ranges', () => {
    store.save({ musicVolume: 8, sfxVolume: -1, muted: false, inputOffsetMs: -900 });
    expect(store.load()).toEqual({ musicVolume: 1, sfxVolume: 0, muted: false, inputOffsetMs: -150 });
  });

  it('migrates the unversioned v0 settings shape into v1', () => {
    storage.setItem('office-rhythm:settings:v0', JSON.stringify({ musicVolume: 0.3, sfxVolume: 0.6, muted: true }));
    expect(store.load()).toEqual({ musicVolume: 0.3, sfxVolume: 0.6, muted: true, inputOffsetMs: 0 });
    expect(storage.getItem('office-rhythm:settings:v0')).toBeNull();
    expect(JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY) ?? '{}').version).toBe(1);
  });
});
