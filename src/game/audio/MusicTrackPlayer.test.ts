import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MusicTrackPlayer } from './MusicTrackPlayer';

describe('MusicTrackPlayer', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reuses one decoded track and preserves the precise offset on resume', async () => {
    const fake = createContext();
    const fetcher = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    const player = new MusicTrackPlayer(fake.context, fake.context.destination, fetcher as typeof fetch);
    await Promise.all([player.load('/game/audio/office-groove.wav'), player.load('/game/audio/office-groove.wav')]);
    await player.load('/game/audio/office-groove.wav');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fake.decodeAudioData).toHaveBeenCalledTimes(1);

    player.setVolume(0.42);
    player.start(12_345);
    expect(fake.sources[0].start).toHaveBeenCalledWith(0, 12.345);
    player.pause(12_678);
    expect(fake.sources[0].stop).toHaveBeenCalledTimes(1);
    player.resume(12_678);
    expect(fake.sources[1].start).toHaveBeenCalledWith(0, 12.678);
    expect(fake.gains[1].gain.setValueAtTime).toHaveBeenCalledWith(0.42, 0);
    player.stop();
    expect(fake.sources[1].stop).toHaveBeenCalledTimes(1);
  });

  it('loops only the selected audio region and resumes at its matching phase', async () => {
    const fake = createContext();
    const player = new MusicTrackPlayer(fake.context, fake.context.destination, vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }) as typeof fetch);
    player.setLoopRegion({ startMs: 5_000, endMs: 7_000 });
    await player.load('/game/audio/office-groove.wav');

    player.start(2_500);
    expect(fake.sources[0]).toMatchObject({ loop: true, loopStart: 5, loopEnd: 7 });
    expect(fake.sources[0].start).toHaveBeenCalledWith(0, 5.5);
    player.pause(3_250);
    player.resume(3_250);
    expect(fake.sources[1].start).toHaveBeenCalledWith(0, 6.25);
  });

  it('rejects a selected loop region that extends past the decoded soundtrack', async () => {
    const fake = createContext();
    const player = new MusicTrackPlayer(fake.context, fake.context.destination, vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }) as typeof fetch);
    player.setLoopRegion({ startMs: 119_000, endMs: 121_000 });

    await expect(player.load('/game/audio/office-groove.wav')).rejects.toThrow('outside the decoded track');
  });

  it('invokes the browser fetch function with its global context', async () => {
    const fake = createContext();
    const fetcher = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    vi.stubGlobal('fetch', fetcher);

    await new MusicTrackPlayer(fake.context).load('/game/audio/office-groove.wav');

    expect(fetcher).toHaveBeenCalledWith('/game/audio/office-groove.wav', undefined);
  });

  it('resets a failed load so a later request can retry', async () => {
    const fake = createContext();
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, arrayBuffer: async () => new ArrayBuffer(0) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    const player = new MusicTrackPlayer(fake.context, fake.context.destination, fetcher as typeof fetch);

    await expect(player.load('/game/audio/office-groove.wav')).rejects.toThrow('503');
    await player.load('/game/audio/office-groove.wav');

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fake.decodeAudioData).toHaveBeenCalledTimes(1);
  });

  it('ships a 120-second WAV with a verified 155 BPM pulse', () => {
    const wav = readFileSync(resolve(process.cwd(), 'public/game/audio/office-groove.wav'));
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    const samples = wav.readUInt32LE(40) / (wav.readUInt16LE(34) / 8);
    const seconds = samples / wav.readUInt32LE(24);
    expect(seconds).toBe(120);
    expect(seconds * 155 / 60).toBe(310);
  });
});

function createContext() {
  const destination = {} as AudioNode;
  const sources: Array<{ start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; connect: ReturnType<typeof vi.fn>; loop: boolean; loopStart: number; loopEnd: number }> = [];
  const gains: Array<{ gain: { setValueAtTime: ReturnType<typeof vi.fn>; setTargetAtTime: ReturnType<typeof vi.fn> }; connect: ReturnType<typeof vi.fn> }> = [];
  const decodeAudioData = vi.fn().mockResolvedValue({ duration: 120 });
  const context = {
    currentTime: 0, state: 'running', destination, decodeAudioData,
    createBufferSource: vi.fn(() => {
      const source = { buffer: null, onended: null, start: vi.fn(), stop: vi.fn(), connect: vi.fn(), loop: false, loopStart: 0, loopEnd: 0 };
      sources.push(source);
      return source;
    }),
    createGain: vi.fn(() => {
      const gain = { gain: { setValueAtTime: vi.fn(), setTargetAtTime: vi.fn() }, connect: vi.fn() };
      gains.push(gain);
      return gain;
    }),
  } as unknown as AudioContext;
  return { context, sources, gains, decodeAudioData };
}
