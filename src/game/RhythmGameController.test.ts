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

    controller.handleInput({ type: 'keydown', songPositionMs: beatmap.events[0].startMs });
    expect(controller.getSnapshot().runState.perfectCount).toBe(1);
    expect(controller.getSnapshot().runState.nextEventIndex).toBe(1);
  });

  it('does not mutate gameplay state while clock is paused', async () => {
    const clock = createFakeClock();
    clock.state = 'paused';
    const controller = new RhythmGameController({ beatmap, clock: clock as never, scheduler: createFakeScheduler() as never, audioSettings: settings });

    await controller.start();
    controller.handleInput({ type: 'keydown', songPositionMs: beatmap.events[0].startMs });

    expect(controller.getSnapshot().runState.nextEventIndex).toBe(0);
  });

  it('exposes the stable chart list and total event count in every snapshot', async () => {
    const controller = new RhythmGameController({
      beatmap,
      clock: createFakeClock() as never,
      scheduler: createFakeScheduler() as never,
      audioSettings: settings,
    });

    await controller.start();
    const first = controller.getSnapshot();
    const second = controller.getSnapshot();

    expect(first.events).toBe(beatmap.events);
    expect(second.events).toBe(first.events);
    expect(first.totalEvents).toBe(beatmap.events.length);
    expect(first.totalEvents).toBe(180);
  });

  it('misses a tap only strictly after the late Good deadline and never twice', async () => {
    const clock = createFakeClock();
    const controller = new RhythmGameController({ beatmap, clock: clock as never, scheduler: createFakeScheduler() as never, audioSettings: settings });
    const event = beatmap.events[0];
    const deadlineMs = event.startMs + 160;

    await controller.start();
    clock.getSongPositionMs.mockReturnValue(deadlineMs);
    controller.update();
    expect(controller.getSnapshot().runState.nextEventIndex).toBe(0);

    clock.getSongPositionMs.mockReturnValue(deadlineMs + 1);
    controller.update();
    controller.update();
    expect(controller.getSnapshot().runState).toMatchObject({ nextEventIndex: 1, missCount: 1, hearts: 4 });
    expect(controller.getSnapshot().lastJudgement).toEqual({ judgement: 'miss', errorMs: 161, eventId: event.id });
  });

  it('advances every already-expired event during one update', async () => {
    const controller = new RhythmGameController({
      beatmap,
      clock: createFakeClock() as never,
      scheduler: createFakeScheduler() as never,
      audioSettings: settings,
    });

    await controller.start();
    controller.update(beatmap.events[4].startMs + 160);

    expect(controller.getSnapshot().runState).toMatchObject({ nextEventIndex: 4, missCount: 4, hearts: 1 });
    controller.update(beatmap.events[4].startMs + 160);
    expect(controller.getSnapshot().runState).toMatchObject({ nextEventIndex: 4, missCount: 4, hearts: 1 });
  });

  it('uses the hold end deadline, clears a pending hold and applies the final-heart failure once', async () => {
    const clock = createFakeClock();
    const scheduler = createFakeScheduler();
    const holdIndex = beatmap.events.findIndex((event) => event.type === 'hold');
    const event = beatmap.events[holdIndex];
    const initialRunState = { ...createInitialRunState({ runId: 'run-hold', userOid: 'user-1', beatmapId: beatmap.id }), hearts: 1, nextEventIndex: holdIndex };
    const controller = new RhythmGameController({
      beatmap,
      clock: clock as never,
      scheduler: scheduler as never,
      initialRunState,
      audioSettings: settings,
    });

    await controller.start(0, initialRunState);
    controller.handleInput({ type: 'keydown', songPositionMs: event.startMs });
    controller.update(event.endMs! + 160);
    expect(controller.getSnapshot().runState.nextEventIndex).toBe(holdIndex);

    controller.update(event.endMs! + 161);
    expect(controller.getSnapshot().runState).toMatchObject({ status: 'failed', nextEventIndex: holdIndex + 1, missCount: 1, hearts: 0 });
    expect(clock.pause).toHaveBeenCalledTimes(1);
    expect(scheduler.pause).toHaveBeenCalledTimes(1);

    controller.handleInput({ type: 'keyup', songPositionMs: event.endMs! + 170 });
    controller.update(event.endMs! + 10);
    expect(controller.getSnapshot().runState).toMatchObject({ nextEventIndex: holdIndex + 1, missCount: 1 });
  });

  it('exposes visible hold progress before and after the hold keydown', async () => {
    const clock = createFakeClock();
    const holdIndex = beatmap.events.findIndex((event) => event.type === 'hold');
    const event = beatmap.events[holdIndex];
    const initialRunState = { ...createInitialRunState({ runId: 'run-hold-feedback', userOid: 'user-1', beatmapId: beatmap.id }), nextEventIndex: holdIndex };
    const controller = new RhythmGameController({
      beatmap,
      clock: clock as never,
      scheduler: createFakeScheduler() as never,
      initialRunState,
      audioSettings: settings,
    });

    await controller.start(0, initialRunState);
    clock.getSongPositionMs.mockReturnValue(event.startMs);
    expect(controller.getSnapshot().holdState).toMatchObject({ eventId: event.id, phase: 'waiting', progress: 0 });
    controller.handleInput({ type: 'keydown', songPositionMs: event.startMs });
    expect(controller.getSnapshot().holdState).toMatchObject({ eventId: event.id, phase: 'holding', progress: 0 });
    expect(controller.getSnapshot().holdState?.startJudgement?.judgement).toBe('perfect');
  });

  it('tracks and resolves a burst exactly once after its authored window', async () => {
    const clock = createFakeClock();
    const burstIndex = beatmap.events.findIndex((event) => event.type === 'burst');
    const event = beatmap.events[burstIndex];
    const initialRunState = { ...createInitialRunState({ runId: 'run-burst', userOid: 'user-1', beatmapId: beatmap.id }), nextEventIndex: burstIndex };
    const controller = new RhythmGameController({
      beatmap,
      clock: clock as never,
      scheduler: createFakeScheduler() as never,
      initialRunState,
      audioSettings: settings,
    });

    await controller.start(0, initialRunState);
    const requiredPresses = event.requiredPresses!;
    for (let press = 0; press < requiredPresses - 1; press += 1) {
      const position = event.startMs + Math.round((event.endMs! - event.startMs) * press / Math.max(1, requiredPresses - 1));
      controller.handleInput({ type: 'keydown', songPositionMs: position });
      controller.handleInput({ type: 'keyup', songPositionMs: position });
    }
    expect(controller.getSnapshot().burstState).toMatchObject({
      eventId: event.id,
      requiredPresses,
      completedPresses: requiredPresses - 1,
      phase: 'counting',
      progress: (requiredPresses - 1) / requiredPresses,
    });

    const finalPosition = event.endMs!;
    controller.handleInput({ type: 'keydown', songPositionMs: finalPosition });
    controller.handleInput({ type: 'keyup', songPositionMs: finalPosition });
    controller.update(event.endMs!);
    expect(controller.getSnapshot().runState).toMatchObject({ nextEventIndex: burstIndex + 1, perfectCount: 1 });
    const judgedSnapshot = controller.getSnapshot();
    controller.update(event.endMs! + 10);
    expect(controller.getSnapshot().runState).toEqual(judgedSnapshot.runState);
  });

  it('does not count the previous tap release as the first burst release', async () => {
    const tapIndex = beatmap.events.findIndex((event, index) =>
      event.type === 'tap' && beatmap.events[index + 1]?.type === 'burst',
    );
    const tap = beatmap.events[tapIndex];
    const burst = beatmap.events[tapIndex + 1];
    const initialRunState = {
      ...createInitialRunState({ runId: 'run-tap-before-burst', userOid: 'user-1', beatmapId: beatmap.id }),
      nextEventIndex: tapIndex,
    };
    const controller = new RhythmGameController({
      beatmap,
      clock: createFakeClock() as never,
      scheduler: createFakeScheduler() as never,
      initialRunState,
      audioSettings: settings,
    });

    await controller.start(0, initialRunState);
    controller.handleInput({ type: 'keydown', songPositionMs: tap.startMs });
    controller.handleInput({ type: 'keyup', songPositionMs: tap.startMs + 10 });
    expect(controller.getSnapshot().burstState?.completedPresses).toBe(0);

    for (let press = 0; press < burst.requiredPresses!; press += 1) {
      const position = burst.startMs + Math.round(
        ((burst.endMs! - burst.startMs) * press) / Math.max(1, burst.requiredPresses! - 1),
      );
      controller.handleInput({ type: 'keydown', songPositionMs: position });
      controller.handleInput({ type: 'keyup', songPositionMs: position + 10 });
    }

    expect(controller.getSnapshot().lastJudgement).toMatchObject({
      eventId: burst.id,
      judgement: 'perfect',
      completedPresses: burst.requiredPresses,
    });
  });

  it('preserves an incomplete burst while paused and emits one automatic miss', async () => {
    const clock = createFakeClock();
    const burstIndex = beatmap.events.findIndex((event) => event.type === 'burst');
    const event = beatmap.events[burstIndex];
    const initialRunState = { ...createInitialRunState({ runId: 'run-burst-miss', userOid: 'user-1', beatmapId: beatmap.id }), nextEventIndex: burstIndex };
    const controller = new RhythmGameController({
      beatmap,
      clock: clock as never,
      scheduler: createFakeScheduler() as never,
      initialRunState,
      audioSettings: settings,
    });
    const misses: string[] = [];
    controller.subscribeAutomaticMiss((miss) => misses.push(miss.chartEventId));

    await controller.start(0, initialRunState);
    controller.handleInput({ type: 'keydown', songPositionMs: event.startMs });
    controller.handleInput({ type: 'keyup', songPositionMs: event.startMs + 20 });
    controller.pause();
    controller.update(event.endMs! + 1000);
    expect(controller.getSnapshot().runState.nextEventIndex).toBe(burstIndex);

    await controller.resume();
    controller.update(event.endMs! + 161);
    controller.update(event.endMs! + 161);
    expect(misses).toEqual([event.id]);
    expect(controller.getSnapshot().runState).toMatchObject({ nextEventIndex: burstIndex + 1, missCount: 1 });
  });

  it('notifies persistence before subscribers observe automatic terminal failure', async () => {
    const event = beatmap.events[0];
    const initialRunState = { ...createInitialRunState({ runId: 'run-auto-fail', userOid: 'user-1', beatmapId: beatmap.id }), hearts: 1 };
    const controller = new RhythmGameController({
      beatmap,
      clock: createFakeClock() as never,
      scheduler: createFakeScheduler() as never,
      initialRunState,
      audioSettings: settings,
    });
    const notifications: string[] = [];
    controller.subscribeAutomaticMiss((miss) => notifications.push(`persist:${miss.chartEventId}`));
    controller.subscribe((snapshot) => {
      if (snapshot.runState.status === 'failed') notifications.push('terminal');
    });

    await controller.start(0, initialRunState);
    controller.update(event.startMs + 161);

    expect(notifications).toEqual([`persist:${event.id}`, 'terminal']);
  });

  it('does not expire a hold until its end window closes, even without a keydown', async () => {
    const holdIndex = beatmap.events.findIndex((event) => event.type === 'hold');
    const event = beatmap.events[holdIndex];
    const initialRunState = { ...createInitialRunState({ runId: 'run-hold-unpressed', userOid: 'user-1', beatmapId: beatmap.id }), nextEventIndex: holdIndex };
    const controller = new RhythmGameController({
      beatmap,
      clock: createFakeClock() as never,
      scheduler: createFakeScheduler() as never,
      initialRunState,
      audioSettings: settings,
    });

    await controller.start(0, initialRunState);
    controller.update(event.endMs! + 161);

    expect(controller.getSnapshot().runState).toMatchObject({ nextEventIndex: holdIndex + 1, missCount: 1 });
  });

  it('freezes automatic misses while paused and resumes from the same run state', async () => {
    const clock = createFakeClock();
    const controller = new RhythmGameController({ beatmap, clock: clock as never, scheduler: createFakeScheduler() as never, audioSettings: settings });
    const deadlineMs = beatmap.events[0].startMs + 160;

    await controller.start();
    controller.pause();
    controller.update(deadlineMs + 1000);
    expect(controller.getSnapshot().runState.nextEventIndex).toBe(0);

    await controller.resume();
    controller.update(deadlineMs + 1);
    expect(controller.getSnapshot().runState).toMatchObject({ nextEventIndex: 1, missCount: 1 });
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
    pause: vi.fn(() => { state = 'paused'; }),
    resume: vi.fn(async () => { state = 'playing'; }),
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
