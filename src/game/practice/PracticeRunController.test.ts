import { describe, expect, it, vi } from "vitest";
import type { Beatmap, RhythmEvent } from "@/domain/rhythm";
import type { AudioSettings } from "@/game/audio/types";
import type { PracticeChart } from "./createPracticeBeatmap";
import { PracticeRunController, type PracticeRunControllerOptions } from "./PracticeRunController";

const settings: AudioSettings = { musicVolume: 0.7, sfxVolume: 0.8, muted: false, inputOffsetMs: 0 };
const chart = makeChart([
  { id: "tap-1", type: "tap", startMs: 100 },
  { id: "hold-1", type: "hold", startMs: 300, endMs: 500 },
  { id: "burst-1", type: "burst", startMs: 700, endMs: 900, requiredPresses: 2 },
  { id: "tap-2", type: "tap", startMs: 1100 },
]);

describe("PracticeRunController", () => {
  it("uses timestamped tap, hold, and paired burst input, then completes one loop once", async () => {
    const harness = createHarness(chart);
    const completed = vi.fn();
    const controller = new PracticeRunController(chart, completed, harness.options);
    await enterPlaying(controller, harness);

    controller.handleInput({ type: "keydown", songPositionMs: 100 });
    controller.handleInput({ type: "keyup", songPositionMs: 105 });
    expect(controller.getSnapshot()).toMatchObject({ nextEventIndex: 1, perfectCount: 1, completedLoops: 0 });

    controller.handleInput({ type: "keydown", songPositionMs: 300 });
    expect(controller.getSnapshot().nextEventIndex).toBe(1);
    controller.handleInput({ type: "keyup", songPositionMs: 500 });
    expect(controller.getSnapshot()).toMatchObject({ nextEventIndex: 2, perfectCount: 2 });

    controller.handleInput({ type: "keydown", songPositionMs: 720 });
    controller.handleInput({ type: "keyup", songPositionMs: 720 });
    controller.handleInput({ type: "keydown", songPositionMs: 900 });
    controller.handleInput({ type: "keyup", songPositionMs: 900 });
    expect(controller.getSnapshot()).toMatchObject({ nextEventIndex: 3, perfectCount: 3 });

    controller.handleInput({ type: "keydown", songPositionMs: 1100 });
    controller.handleInput({ type: "keyup", songPositionMs: 1101 });
    expect(controller.getSnapshot()).toMatchObject({ nextEventIndex: 4, completedLoops: 0 });

    harness.clock.position = chart.loopDurationMs;
    controller.update();
    expect(controller.getSnapshot()).toMatchObject({ completedLoops: 1, sessionPerfectCount: 4, accuracy: 0 });
    expect(completed).toHaveBeenCalledTimes(1);
    expect(Object.isFrozen(completed.mock.calls[0][0])).toBe(true);
    expect(completed.mock.calls[0][0]).toMatchObject({ patternId: "source-pattern", accuracy: 100, perfectCount: 4 });

    controller.update();
    expect(completed).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it("does not turn arbitrary or early presses into Perfect and advances automatic misses only once", async () => {
    const oneTap = makeChart([{ id: "tap", type: "tap", startMs: 500 }]);
    const harness = createHarness(oneTap);
    const controller = new PracticeRunController(oneTap, undefined, harness.options);
    await enterPlaying(controller, harness);

    controller.handleInput({ type: "keydown", songPositionMs: 0 });
    controller.handleInput({ type: "keyup", songPositionMs: 1 });
    expect(controller.getSnapshot()).toMatchObject({ missCount: 1, perfectCount: 0, nextEventIndex: 1 });

    harness.clock.position = oneTap.loopDurationMs;
    controller.update();
    expect(controller.getSnapshot()).toMatchObject({ completedLoops: 1, sessionMissCount: 1 });
    controller.dispose();

    const autoMissHarness = createHarness(oneTap);
    const autoMissController = new PracticeRunController(oneTap, undefined, autoMissHarness.options);
    await enterPlaying(autoMissController, autoMissHarness);
    autoMissHarness.clock.position = 661;
    autoMissController.update();
    autoMissController.update();
    expect(autoMissController.getSnapshot()).toMatchObject({ missCount: 1, nextEventIndex: 1 });
    autoMissHarness.clock.position = oneTap.loopDurationMs;
    autoMissController.update();
    await vi.waitFor(() => expect(autoMissHarness.scheduler.restartLoop).toHaveBeenCalled());
    autoMissHarness.clock.position = 500;
    autoMissController.handleInput({ type: "keydown", songPositionMs: 500 });
    expect(autoMissController.getSnapshot()).toMatchObject({ completedLoops: 1, perfectCount: 1, status: "playing" });
    autoMissController.dispose();
  });

  it("automatically misses overdue holds and bursts without ending the session", async () => {
    for (const event of [
      { id: "hold", type: "hold" as const, startMs: 300, endMs: 500 },
      { id: "burst", type: "burst" as const, startMs: 300, endMs: 500, requiredPresses: 2 },
    ]) {
      const currentChart = makeChart([event]);
      const harness = createHarness(currentChart);
      const controller = new PracticeRunController(currentChart, undefined, harness.options);
      await enterPlaying(controller, harness);
      harness.clock.position = (event.endMs ?? event.startMs) + 161;
      controller.update();
      expect(controller.getSnapshot()).toMatchObject({ missCount: 1, nextEventIndex: 1, status: "playing" });
      harness.clock.position = currentChart.loopDurationMs;
      controller.update();
      expect(controller.getSnapshot()).toMatchObject({ completedLoops: 1, sessionMissCount: 1, status: "playing" });
      controller.dispose();
    }
  });

  it("reuses the source audio region and plays one four-beat count-in for the session", async () => {
    const harness = createHarness(chart);
    const controller = new PracticeRunController(chart, undefined, harness.options);
    controller.start();
    await vi.waitFor(() => expect(harness.clock.start).toHaveBeenCalledTimes(1));
    expect(harness.scheduler.load).toHaveBeenCalledWith(
      chart.beatmap,
      settings,
      0,
      { startMs: chart.sourceAudioStartMs, endMs: chart.sourceAudioEndMs },
    );
    expect(harness.scheduler.playCountInBeat).toHaveBeenCalledTimes(1);

    for (const beat of [500, 1_000, 1_500, 2_000]) {
      harness.setNow(beat);
      controller.update();
    }
    await vi.waitFor(() => expect(controller.getSnapshot().status).toBe("playing"));
    expect(harness.scheduler.playCountInBeat).toHaveBeenCalledTimes(4);

    harness.clock.position = chart.loopDurationMs;
    controller.update();
    await vi.waitFor(() => expect(harness.clock.start).toHaveBeenCalledTimes(3));
    expect(harness.scheduler.load).toHaveBeenCalledTimes(1);
    expect(harness.scheduler.restartLoop).toHaveBeenCalled();
    expect(harness.scheduler.playCountInBeat).toHaveBeenCalledTimes(4);
    controller.dispose();
  });

  it("keeps timing practice usable when browser audio initialization fails", async () => {
    const harness = createHarness(chart);
    harness.clock.load.mockRejectedValueOnce(new Error("Web Audio unavailable"));
    const controller = new PracticeRunController(chart, undefined, harness.options);
    controller.start();
    await vi.waitFor(() => expect(controller.getSnapshot().countInBeat).toBe(1));
    harness.setNow(2_000);
    controller.update();
    await vi.waitFor(() => expect(controller.getSnapshot().status).toBe("playing"));
    expect(controller.getSnapshot().audioUnavailable).toBe(true);
    expect(harness.scheduler.start).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it("freezes the chart on pause, resumes at the same position, and excludes the partial loop on exit", async () => {
    const harness = createHarness(chart);
    const controller = new PracticeRunController(chart, undefined, harness.options);
    await enterPlaying(controller, harness);
    harness.clock.position = 400;
    controller.update();
    controller.pause();
    const paused = controller.getSnapshot().songPositionMs;
    harness.clock.position = 1_000;
    controller.update();
    expect(controller.getSnapshot().songPositionMs).toBe(paused);
    expect(harness.inputController.releaseHeld).toHaveBeenCalledTimes(1);

    controller.resume();
    await vi.waitFor(() => expect(harness.scheduler.resume).toHaveBeenCalledTimes(1));
    expect(controller.getSnapshot().songPositionMs).toBe(paused);
    controller.exit();
    expect(controller.getSnapshot()).toMatchObject({ status: "summary", completedLoops: 0, sessionPerfectCount: 0 });
    expect(harness.scheduler.stop).toHaveBeenCalled();
    expect(harness.clock.stop).toHaveBeenCalled();
    expect(harness.inputController.stop).toHaveBeenCalledTimes(1);
  });
});

function makeChart(inputs: Array<{
  id: string;
  type: RhythmEvent["type"];
  startMs: number;
  endMs?: number;
  requiredPresses?: number;
}>): PracticeChart {
  const events = inputs.map(({ id, type, startMs, endMs, requiredPresses }) => ({
    id,
    type,
    startMs,
    endMs,
    requiredPresses,
    section: "arrival" as const,
    patternId: "source-pattern",
    patternKind: type === "burst" ? "burst" as const : type === "hold" ? "hold" as const : "straight" as const,
  }));
  const loopDurationMs = (events[events.length - 1].endMs ?? events[events.length - 1].startMs) + 500;
  const beatmap: Beatmap = {
    id: "office-day-01",
    bpm: 120,
    timeSignature: [4, 4],
    events,
    patterns: [{ id: "source-pattern", kind: "straight", label: "테스트 패턴", startMs: 0, endMs: loopDurationMs, eventIds: events.map(({ id }) => id) }],
    sections: [{ id: "arrival", startMs: 0, endMs: loopDurationMs }],
  };
  return { beatmap, patternId: "source-pattern", sourceAudioStartMs: 2_000, sourceAudioEndMs: 2_000 + loopDurationMs, loopDurationMs };
}

function createHarness(practiceChart: PracticeChart) {
  let now = 0;
  const clock = {
    position: 0,
    pausedPosition: undefined as number | undefined,
    load: vi.fn().mockResolvedValue(undefined),
    start: vi.fn(async (position = 0) => { clock.position = position; }),
    pause: vi.fn(() => { clock.pausedPosition = clock.position; }),
    resume: vi.fn(async () => { clock.position = clock.pausedPosition ?? clock.position; }),
    stop: vi.fn(),
    getSongPositionMs: vi.fn(() => clock.position),
    getState: vi.fn(() => "playing"),
    setSettings: vi.fn(),
    subscribe: vi.fn(() => () => undefined),
  };
  const scheduler = {
    load: vi.fn(),
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    getMusicStatus: vi.fn(() => "ready" as const),
    playCountInBeat: vi.fn(),
    restartLoop: vi.fn(),
  };
  const inputController = { start: vi.fn(), stop: vi.fn(), releaseHeld: vi.fn() };
  const options: PracticeRunControllerOptions = {
    clock: clock as never,
    scheduler: scheduler as never,
    audioSettings: settings,
    inputController,
    now: () => now,
    requestFrame: () => 1,
    cancelFrame: () => undefined,
  };
  return { clock, scheduler, inputController, options, setNow: (value: number) => { now = value; }, practiceChart };
}

async function enterPlaying(controller: PracticeRunController, harness: ReturnType<typeof createHarness>) {
  controller.start();
  await vi.waitFor(() => expect(harness.clock.start).toHaveBeenCalledTimes(1));
  harness.setNow(2_000);
  controller.update();
  await vi.waitFor(() => expect(controller.getSnapshot().status).toBe("playing"));
}
