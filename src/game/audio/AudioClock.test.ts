import { describe, expect, it, vi } from 'vitest';
import beatmapJson from '@/content/beatmaps/office-day-01.json';
import { validateBeatmap } from '@/domain/validateBeatmap';
import { AudioClock, AudioClockError } from './AudioClock';
import type { AudioSettings } from './types';

const beatmap = validateBeatmap(beatmapJson);
const settings: AudioSettings = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  muted: false,
  inputOffsetMs: 0,
};

describe('AudioClock', () => {
  it('keeps song position monotonic across pause and resume', async () => {
    const fakeContext = createFakeAudioContext();
    const clock = new AudioClock({ contextFactory: () => fakeContext as unknown as AudioContext });
    await clock.load(beatmap, settings);
    await clock.start();

    fakeContext.currentTime = 1.25;
    expect(clock.getSongPositionMs()).toBeCloseTo(1250);
    clock.pause();
    fakeContext.currentTime = 10;
    expect(clock.getSongPositionMs()).toBeCloseTo(1250);

    await clock.resume();
    fakeContext.currentTime = 10.5;
    expect(clock.getSongPositionMs()).toBeCloseTo(1750);
  });

  it('reports a recoverable error when AudioContext resume is blocked', async () => {
    const fakeContext = createFakeAudioContext();
    fakeContext.resume = vi.fn().mockRejectedValue(new Error('gesture required'));
    const clock = new AudioClock({ contextFactory: () => fakeContext as unknown as AudioContext });
    await clock.load(beatmap, settings);

    await expect(clock.start()).rejects.toBeInstanceOf(AudioClockError);
    expect(clock.getState()).toBe('idle');
  });
});

function createFakeAudioContext(): { currentTime: number; resume: () => Promise<void>; suspend: () => Promise<void> } {
  return {
    currentTime: 0,
    resume: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
  };
}
