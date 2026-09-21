import { describe, expect, it, vi } from 'vitest';
import beatmapJson from '@/content/beatmaps/office-day-01.json';
import { validateBeatmap } from '@/domain/validateBeatmap';
import { AudioClock } from './AudioClock';
import { OfficeSoundScheduler } from './OfficeSoundScheduler';
import type { AudioSettings } from './types';

const beatmap = validateBeatmap(beatmapJson);
const settings: AudioSettings = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  muted: false,
  inputOffsetMs: 0,
};

describe('OfficeSoundScheduler', () => {
  it('schedules fixed beatmap events with section-specific instruments', async () => {
    const fakeContext = createFakeAudioContext();
    const clock = new AudioClock({ contextFactory: () => fakeContext as unknown as AudioContext });
    await clock.load(beatmap, settings);
    await clock.start(1000);
    const scheduler = new OfficeSoundScheduler(clock, { lookaheadMs: 2000, tickMs: 1000 });

    scheduler.load(beatmap, settings);
    scheduler.start();

    expect(fakeContext.createOscillator).toHaveBeenCalledTimes(4);
    expect(fakeContext.createGain).toHaveBeenCalled();
    scheduler.stop();
  });

  it('does not create audio nodes when muted', async () => {
    const fakeContext = createFakeAudioContext();
    const clock = new AudioClock({ contextFactory: () => fakeContext as unknown as AudioContext });
    await clock.load(beatmap, { ...settings, muted: true });
    await clock.start(1000);
    const scheduler = new OfficeSoundScheduler(clock, { lookaheadMs: 2000 });

    scheduler.load(beatmap, { ...settings, muted: true });
    scheduler.start();

    expect(fakeContext.createOscillator).not.toHaveBeenCalled();
    expect(fakeContext.createBufferSource).not.toHaveBeenCalled();
    scheduler.stop();
  });
});

function createFakeAudioContext(): Record<string, unknown> & {
  currentTime: number;
  resume: () => Promise<void>;
  suspend: () => Promise<void>;
  destination: AudioNode;
  createOscillator: ReturnType<typeof vi.fn>;
  createGain: ReturnType<typeof vi.fn>;
  createBuffer: ReturnType<typeof vi.fn>;
  createBufferSource: ReturnType<typeof vi.fn>;
} {
  const destination = {} as AudioNode;
  const createGain = vi.fn(() => ({
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  }));
  const createOscillator = vi.fn(() => ({
    type: 'sine',
    frequency: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: vi.fn(),
  }));
  const createBuffer = vi.fn(() => ({ getChannelData: () => new Float32Array(20) }));
  const createBufferSource = vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: vi.fn(),
  }));

  return {
    currentTime: 0,
    sampleRate: 44_100,
    destination,
    resume: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    createGain,
    createOscillator,
    createBuffer,
    createBufferSource,
  };
}
