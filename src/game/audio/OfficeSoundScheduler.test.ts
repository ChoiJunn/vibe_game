import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('schedules fixed beatmap events with section-specific instruments', async () => {
    const fakeContext = createFakeAudioContext();
    const clock = new AudioClock({ contextFactory: () => fakeContext as unknown as AudioContext });
    await clock.load(beatmap, settings);
    await clock.start(1000);
    const scheduler = new OfficeSoundScheduler(clock, { lookaheadMs: 2000, tickMs: 1000 });

    scheduler.load(beatmap, settings);
    scheduler.start();

    expect(fakeContext.createOscillator.mock.calls.length).toBeGreaterThan(0);
    expect(fakeContext.createGain).toHaveBeenCalled();
    scheduler.stop();
  });

  it('starts the continuous backing track from the run offset', async () => {
    const fakeContext = createFakeAudioContext();
    const clock = new AudioClock({ contextFactory: () => fakeContext as unknown as AudioContext });
    await clock.load(beatmap, settings);
    await clock.start();
    const scheduler = new OfficeSoundScheduler(clock, { lookaheadMs: 120 });

    scheduler.load(beatmap, settings);
    scheduler.start();

    await vi.waitFor(() => expect(fakeContext.createBufferSource).toHaveBeenCalledTimes(1));
    expect(fakeContext.createBufferSource.mock.results[0].value.start).toHaveBeenCalledWith(0, 0);
    scheduler.stop();
  });

  it('keeps scheduling SFX when the backing track cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('music unavailable')));
    const fakeContext = createFakeAudioContext();
    const clock = new AudioClock({ contextFactory: () => fakeContext as unknown as AudioContext });
    await clock.load(beatmap, settings);
    await clock.start();
    const scheduler = new OfficeSoundScheduler(clock, { lookaheadMs: 2000, tickMs: 1000 });

    scheduler.load(beatmap, settings);
    expect(scheduler.getMusicStatus()).toBe('loading');
    scheduler.start();

    await vi.waitFor(() => expect(scheduler.getMusicStatus()).toBe('unavailable'));
    expect(fakeContext.createOscillator).toHaveBeenCalled();
    scheduler.stop();
    expect(scheduler.getMusicStatus()).toBe('idle');
  });

  it('reports ready after the backing track is decoded', async () => {
    const fakeContext = createFakeAudioContext();
    const clock = new AudioClock({ contextFactory: () => fakeContext as unknown as AudioContext });
    await clock.load(beatmap, settings);
    await clock.start();
    const scheduler = new OfficeSoundScheduler(clock);

    scheduler.load(beatmap, settings);
    expect(scheduler.getMusicStatus()).toBe('loading');
    await vi.waitFor(() => expect(scheduler.getMusicStatus()).toBe('ready'));
  });

  it('resumes at the frozen audio clock offset without restarting the beatmap', async () => {
    const fakeContext = createFakeAudioContext();
    const clock = new AudioClock({ contextFactory: () => fakeContext as unknown as AudioContext });
    await clock.load(beatmap, settings);
    await clock.start(5000);
    const scheduler = new OfficeSoundScheduler(clock);
    scheduler.load(beatmap, settings);
    scheduler.start();
    await vi.waitFor(() => expect(fakeContext.createBufferSource).toHaveBeenCalledTimes(1));
    scheduler.pause();
    await clock.resume();
    scheduler.resume();
    await vi.waitFor(() => expect(fakeContext.createBufferSource).toHaveBeenCalledTimes(2));
    expect(fakeContext.createBufferSource.mock.results[1].value.start).toHaveBeenCalledWith(0, 5);
    scheduler.stop();
  });

  it('keeps the metronome off by default and schedules enabled clicks on the audio clock', async () => {
    const metronomeBeatmap = { ...beatmap, bpm: 120, events: [], patterns: [], sections: [{ id: 'arrival' as const, startMs: 0, endMs: 10_000 }] };
    const fakeContext = createFakeAudioContext();
    const clock = new AudioClock({ contextFactory: () => fakeContext as unknown as AudioContext });
    await clock.load(metronomeBeatmap, settings);
    await clock.start();
    const scheduler = new OfficeSoundScheduler(clock, { lookaheadMs: 0, tickMs: 5 });

    scheduler.load(metronomeBeatmap, settings);
    scheduler.start();
    expect(fakeContext.createOscillator).not.toHaveBeenCalled();
    scheduler.stop();

    vi.useFakeTimers();
    scheduler.load(metronomeBeatmap, settings);
    scheduler.setMetronomeEnabled(true);
    scheduler.start();
    expect(fakeContext.createOscillator).toHaveBeenCalledTimes(1);
    for (let beat = 1; beat <= 4; beat += 1) {
      fakeContext.currentTime = beat * 0.5;
      expect(clock.getSongPositionMs()).toBe(beat * 500);
      await vi.advanceTimersByTimeAsync(5);
      expect(fakeContext.createOscillator).toHaveBeenCalledTimes(beat + 1);
    }

    const clickNodes = fakeContext.createOscillator.mock.results;
    expect(clickNodes.slice(0, 5).map(({ value }) => value.start.mock.calls[0]?.[0])).toEqual([0, 0.5, 1, 1.5, 2]);
    const clickVolumes = fakeContext.createGain.mock.results
      .map(({ value }) => value.gain.linearRampToValueAtTime.mock.calls[0]?.[0])
      .filter((volume): volume is number => typeof volume === 'number');
    [0.8, 0.56, 0.56, 0.56, 0.8].forEach((volume, index) => {
      expect(clickVolumes[index]).toBeCloseTo(volume, 5);
    });
    scheduler.stop();
    vi.useRealTimers();
  });

  it('does not emit metronome clicks while muted or when SFX volume is zero', async () => {
    const metronomeBeatmap = { ...beatmap, bpm: 120, events: [], patterns: [], sections: [{ id: 'arrival' as const, startMs: 0, endMs: 10_000 }] };
    for (const savedSettings of [{ ...settings, muted: true }, { ...settings, sfxVolume: 0 }]) {
      const fakeContext = createFakeAudioContext();
      const clock = new AudioClock({ contextFactory: () => fakeContext as unknown as AudioContext });
      await clock.load(metronomeBeatmap, savedSettings);
      await clock.start();
      const scheduler = new OfficeSoundScheduler(clock, { lookaheadMs: 0, tickMs: 5 });
      scheduler.load(metronomeBeatmap, savedSettings);
      scheduler.setMetronomeEnabled(true);
      scheduler.start();

      expect(fakeContext.createOscillator).not.toHaveBeenCalled();
      expect(fakeContext.createGain.mock.results.flatMap(({ value }) => value.gain.linearRampToValueAtTime.mock.calls)).toHaveLength(0);
      scheduler.stop();
    }
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
    decodeAudioData: vi.fn().mockResolvedValue({ duration: 120 }),
  };
}
