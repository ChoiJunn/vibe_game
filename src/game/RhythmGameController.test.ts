import { describe, expect, it, vi } from 'vitest';
import beatmapJson from '@/content/beatmaps/office-day-01.json';
import { validateBeatmap } from '@/domain/validateBeatmap';
import { createInitialRunState } from '@/game/state/reduceRunState';
import { RhythmGameController } from './RhythmGameController';
import type { AudioClockState, AudioSettings } from './audio/types';

const beatmap = validateBeatmap(beatmapJson);
const settings: AudioSettings = { musicVolume: 0.7, sfxVolume: 0.8, muted: true, inputOffsetMs: 0 };

describe('RhythmGameController', () => {
  it('connects clock, scheduler, input and reducer state', async () => {
    const clock = createFakeClock();
    const scheduler = createFakeScheduler();
    const inputController = { start: vi.fn(), stop: vi.fn() };
    const controller = new RhythmGameController({ beatmap, clock: clock as never, scheduler: scheduler as never, inputController, audioSettings: settings });

    await controller.start();
    expect(clock.load).toHaveBeenCalledWith(beatmap, settings);
    expect(clock.start).toHaveBeenCalledWith(0);
    expect(scheduler.start).toHaveBeenCalledTimes(1);
    expect(inputController.start).toHaveBeenCalledTimes(1);

    controller.handleInput({ type: 'keydown', songPositionMs: 1091 });
    expect(controller.getSnapshot().runState.perfectCount).toBe(1);
    expect(controller.getSnapshot().runState.nextEventIndex).toBe(1);
  });

  it('does not mutate gameplay state while clock is paused', async () => {
    const clock = createFakeClock();
    clock.state = 'paused';
    const controller = new RhythmGameController({ beatmap, clock: clock as never, scheduler: createFakeScheduler() as never, audioSettings: settings });

    await controller.start();
    controller.handleInput({ type: 'keydown', songPositionMs: 1091 });

    expect(controller.getSnapshot().runState.nextEventIndex).toBe(0);
  });

  it('pauses clock and scheduler immediately when the final heart is lost', async () => {
    const clock = createFakeClock();
    const scheduler = createFakeScheduler();
    const inputController = { start: vi.fn(), stop: vi.fn(), releaseHeld: vi.fn() };
    const controller = new RhythmGameController({
      beatmap,
      clock: clock as never,
      scheduler: scheduler as never,
      inputController,
      initialRunState: {
        ...createInitialRunState({ runId: 'run-fail', userOid: 'user-1', beatmapId: beatmap.id }),
        hearts: 1,
        missCount: 4,
        nextEventIndex: 4,
      },
      audioSettings: settings,
    });
    await controller.start(0, controller.getSnapshot().runState);

    controller.handleInput({ type: 'keydown', songPositionMs: 5000 });

    expect(controller.getSnapshot().runState.status).toBe('failed');
    expect(inputController.releaseHeld).toHaveBeenCalledTimes(1);
    expect(clock.pause).toHaveBeenCalledTimes(1);
    expect(scheduler.pause).toHaveBeenCalledTimes(1);
  });
});

function createFakeClock(): {
  state: AudioClockState;
  load: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  getState: ReturnType<typeof vi.fn>;
  getSongPositionMs: ReturnType<typeof vi.fn>;
} {
  let state: AudioClockState = 'playing';
  return {
    get state() { return state; },
    set state(nextState: AudioClockState) { state = nextState; },
    load: vi.fn().mockResolvedValue(undefined),
    start: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    resume: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    getState: vi.fn(() => state),
    getSongPositionMs: vi.fn().mockReturnValue(1091),
  };
}

function createFakeScheduler(): {
  load: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
} {
  return {
    load: vi.fn(),
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
  };
}
