import type { BurstRhythmEvent, RhythmEvent, RunState } from "@/domain/rhythm";
import { AudioClock as BrowserAudioClock } from "@/game/audio/AudioClock";
import { OfficeSoundScheduler, type MusicStatus } from "@/game/audio/OfficeSoundScheduler";
import { DEFAULT_AUDIO_SETTINGS, type AudioSettings } from "@/game/audio/types";
import { combineHoldJudgements, judgeBurst, judgeHoldEnd, judgeHoldStart, judgeTap } from "@/game/judgement/judgeInput";
import { JUDGEMENT_WINDOWS, type InputEvent, type JudgementResult } from "@/game/judgement/types";
import { SpaceInputController } from "@/game/input/SpaceInputController";
import { createInitialRunState, reduceRunState } from "@/game/state/reduceRunState";
import type { PracticeChart } from "./createPracticeBeatmap";
import type { AudioClock as AudioClockContract } from "@/game/audio/types";
import type { MusicTrackRegion } from "@/game/audio/MusicTrackPlayer";

export type PracticeRunStatus = "countdown" | "playing" | "paused" | "summary" | "exited";

export type PracticeLoopResult = Readonly<{
  patternId: string;
  accuracy: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
}>;

export type PracticeRunSnapshot = {
  status: PracticeRunStatus;
  patternId: string;
  nextEventIndex: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  accuracy: number;
  lastJudgement?: JudgementResult;
  completedLoops: number;
  sessionPerfectCount: number;
  sessionGoodCount: number;
  sessionMissCount: number;
  bestCompletedLoopAccuracy?: number;
  songPositionMs: number;
  sourceAudioPositionMs: number;
  countInBeat: number;
  musicStatus: MusicStatus;
  audioUnavailable: boolean;
};

type PracticeAudioScheduler = Pick<OfficeSoundScheduler,
  "load" | "start" | "pause" | "resume" | "stop" | "getMusicStatus" | "playCountInBeat" | "restartLoop"
>;

type FrameHandle = number | ReturnType<typeof setTimeout>;
type PracticeInputController = Pick<SpaceInputController, "start" | "stop" | "releaseHeld"> &
  Partial<Pick<SpaceInputController, "press" | "release">>;

export type PracticeRunControllerOptions = {
  clock?: AudioClockContract;
  scheduler?: PracticeAudioScheduler;
  audioSettings?: AudioSettings;
  inputController?: PracticeInputController;
  now?: () => number;
  requestFrame?: (callback: () => void) => FrameHandle;
  cancelFrame?: (handle: FrameHandle) => void;
};

export class PracticeRunController {
  private readonly chart: PracticeChart;
  private readonly clock: AudioClockContract;
  private readonly scheduler: PracticeAudioScheduler;
  private readonly settings: AudioSettings;
  private readonly listeners = new Set<(snapshot: PracticeRunSnapshot) => void>();
  private readonly onLoopComplete?: (snapshot: PracticeLoopResult) => void;
  private readonly now: () => number;
  private readonly requestFrame: (callback: () => void) => FrameHandle;
  private readonly cancelFrame: (handle: FrameHandle) => void;
  private readonly inputController?: PracticeInputController;
  private frameHandle: FrameHandle | null = null;
  private hasStarted = false;
  private loopRunState: RunState;
  private status: PracticeRunStatus = "countdown";
  private resumeStatus: "countdown" | "playing" = "playing";
  private countInStartedAtMs = 0;
  private countInElapsedMs = 0;
  private countInBeat = 0;
  private audioClockReady = false;
  private cancelled = false;
  private audioUnavailable = false;
  private fallbackSongPositionMs = 0;
  private fallbackStartedAtMs = 0;
  private pausedSongPositionMs = 0;
  private pendingHoldStart?: JudgementResult;
  private pendingBurstInputs: InputEvent[] = [];
  private ignoreNextKeyup = false;
  private loopRestarting = false;
  private lastJudgement?: JudgementResult;
  private completedLoops = 0;
  private sessionPerfectCount = 0;
  private sessionGoodCount = 0;
  private sessionMissCount = 0;
  private bestCompletedLoopAccuracy?: number;
  private snapshot: PracticeRunSnapshot;

  constructor(
    chart: PracticeChart,
    onLoopComplete?: (snapshot: PracticeLoopResult) => void,
    options: PracticeRunControllerOptions = {},
  ) {
    this.chart = chart;
    this.clock = options.clock ?? new BrowserAudioClock();
    this.scheduler = options.scheduler ?? new OfficeSoundScheduler(this.clock as never);
    this.settings = options.audioSettings ?? DEFAULT_AUDIO_SETTINGS;
    this.onLoopComplete = onLoopComplete;
    this.now = options.now ?? (() => globalThis.performance?.now?.() ?? Date.now());
    this.requestFrame = options.requestFrame ?? defaultRequestFrame;
    this.cancelFrame = options.cancelFrame ?? defaultCancelFrame;
    this.loopRunState = createInitialRunState({ runId: `practice-${chart.patternId}`, userOid: "practice", beatmapId: chart.beatmap.id });
    this.inputController = options.inputController ?? (typeof window !== "undefined"
      ? new SpaceInputController({
          getGameState: () => this.status,
          getSongPositionMs: () => this.getSongPositionMs(),
          onInput: (input) => this.handleInput(input),
          onPauseRequest: () => this.pause(),
        })
      : undefined);
    this.snapshot = this.createSnapshot();
  }

  start(): void {
    if (this.hasStarted || this.status === "summary" || this.status === "exited") return;
    this.hasStarted = true;
    this.status = "countdown";
    this.countInBeat = 0;
    this.countInElapsedMs = 0;
    this.emit();
    this.inputController?.start();
    this.scheduleFrame();
    void this.prepareAudio();
  }

  pause(): void {
    if (this.status !== "playing" && this.status !== "countdown") return;
    this.resumeStatus = this.status;
    if (this.status === "countdown") {
      this.countInElapsedMs = Math.max(0, this.now() - this.countInStartedAtMs);
    } else {
      this.pausedSongPositionMs = this.getSongPositionMs();
      if (!this.audioClockReady) this.fallbackSongPositionMs = this.pausedSongPositionMs;
    }
    this.inputController?.releaseHeld();
    this.clock.pause();
    this.scheduler.pause();
    this.status = "paused";
    this.emit();
  }

  resume(): void {
    if (this.status !== "paused" || this.loopRestarting) return;
    const resumeStatus = this.resumeStatus;
    this.status = resumeStatus;
    if (resumeStatus === "countdown") {
      this.countInStartedAtMs = this.now();
      if (this.countInBeat === 0) {
        this.countInBeat = 1;
        this.scheduler.playCountInBeat(true);
      }
      void this.clock.resume().catch(() => { this.audioUnavailable = true; });
    } else if (this.audioClockReady) {
      void this.clock.resume().then(() => this.scheduler.resume()).catch(() => { this.audioUnavailable = true; });
    } else {
      this.fallbackStartedAtMs = this.now();
    }
    this.inputController?.start();
    this.emit();
    this.scheduleFrame();
  }

  exit(): void {
    if (this.status === "summary" || this.status === "exited") return;
    this.cancelled = true;
    this.stopResources();
    this.status = "summary";
    this.emit();
  }

  dispose(): void {
    if (this.status === "exited") return;
    this.cancelled = true;
    this.stopResources();
    this.status = "exited";
    this.emit();
    this.listeners.clear();
  }

  handleInput(input: InputEvent): void {
    if (this.status !== "playing" || this.loopRestarting) return;
    const event = this.chart.beatmap.events[this.loopRunState.nextEventIndex];
    if (!event) return;

    if (input.type === "keyup" && this.ignoreNextKeyup) {
      this.ignoreNextKeyup = false;
      return;
    }

    if (event.type === "tap") {
      if (input.type !== "keydown") return;
      this.ignoreNextKeyup = true;
      this.applyJudgement(judgeTap(event, input, this.settings.inputOffsetMs), event, input.songPositionMs);
      return;
    }

    if (event.type === "hold") {
      if (input.type === "keydown" && !this.pendingHoldStart) {
        this.pendingHoldStart = judgeHoldStart(event, input, this.settings.inputOffsetMs);
      } else if (input.type === "keyup" && this.pendingHoldStart) {
        const end = judgeHoldEnd(event, input, this.settings.inputOffsetMs);
        const result = combineHoldJudgements(this.pendingHoldStart, end).combined;
        this.pendingHoldStart = undefined;
        this.applyJudgement(result, event, input.songPositionMs);
      }
      return;
    }

    this.pendingBurstInputs.push(input);
    if (isBurstComplete(event, this.pendingBurstInputs) && input.songPositionMs + this.settings.inputOffsetMs >= (event.endMs ?? event.startMs)) {
      this.resolveBurst(event, input.songPositionMs);
    }
  }

  pressInputSource(source: string): void {
    this.inputController?.press?.(source);
  }

  releaseInputSource(source: string): void {
    this.inputController?.release?.(source);
  }

  update(songPositionOverride?: number): void {
    if (this.status === "countdown") {
      this.updateCountdown();
      return;
    }
    if (this.status !== "playing") return;
    if (this.loopRestarting) return;
    const songPositionMs = songPositionOverride ?? this.getSongPositionMs();
    this.pausedSongPositionMs = songPositionMs;

    while (this.status === "playing") {
      if (this.loopRunState.nextEventIndex >= this.chart.beatmap.events.length) {
        if (songPositionMs >= this.chart.loopDurationMs) this.completeLoop();
        else this.emit();
        return;
      }
      const event = this.chart.beatmap.events[this.loopRunState.nextEventIndex];
      if (!event) return;
      if (event.type === "burst") {
        const endMs = event.endMs ?? event.startMs;
        if (isBurstComplete(event, this.pendingBurstInputs) && songPositionMs >= endMs) {
          this.resolveBurst(event, songPositionMs);
          continue;
        }
        if (songPositionMs <= endMs + JUDGEMENT_WINDOWS.goodMs) { this.emit(); return; }
        this.pendingBurstInputs = [];
        this.applyJudgement({ judgement: "miss", errorMs: songPositionMs - endMs, eventId: event.id }, event, songPositionMs);
        continue;
      }

      const targetMs = event.type === "hold" ? event.endMs ?? event.startMs : event.startMs;
      if (songPositionMs <= targetMs + JUDGEMENT_WINDOWS.goodMs) { this.emit(); return; }
      this.pendingHoldStart = undefined;
      this.applyJudgement({ judgement: "miss", errorMs: songPositionMs - targetMs, eventId: event.id }, event, songPositionMs);
    }
  }

  subscribe(listener: (snapshot: PracticeRunSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): PracticeRunSnapshot { return this.snapshot; }
  getSongPositionMs(): number {
    if (this.audioClockReady && this.status !== "paused" && this.status !== "summary" && this.status !== "exited") {
      return this.clock.getSongPositionMs();
    }
    if (this.status === "playing") return this.fallbackSongPositionMs + Math.max(0, this.now() - this.fallbackStartedAtMs);
    return this.pausedSongPositionMs;
  }

  private async prepareAudio(): Promise<void> {
    try {
      await this.clock.load(this.chart.beatmap, this.settings);
      if (this.cancelled) return;
      const region: MusicTrackRegion = { startMs: this.chart.sourceAudioStartMs, endMs: this.chart.sourceAudioEndMs };
      this.scheduler.load(this.chart.beatmap, this.settings, 0, region);
      await this.clock.start(0);
      if (this.cancelled) {
        this.scheduler.stop();
        this.clock.stop();
        return;
      }
      this.audioClockReady = true;
      this.countInStartedAtMs = this.now();
      if (this.status === "countdown") {
        this.scheduler.playCountInBeat(true);
        this.countInBeat = 1;
      } else if (this.status === "paused") {
        this.clock.pause();
      }
    } catch {
      if (this.cancelled) return;
      this.audioUnavailable = true;
      this.countInStartedAtMs = this.now();
      if (this.status === "countdown") this.countInBeat = 1;
    }
    this.emit();
    this.scheduleFrame();
  }

  private updateCountdown(): void {
    if (this.countInBeat === 0) return;
    const beatMs = 60_000 / this.chart.beatmap.bpm;
    const elapsedMs = this.countInElapsedMs + (this.status === "countdown" ? Math.max(0, this.now() - this.countInStartedAtMs) : 0);
    const targetBeat = Math.min(4, Math.floor(elapsedMs / beatMs) + 1);
    while (this.countInBeat < targetBeat) {
      this.countInBeat += 1;
      this.scheduler.playCountInBeat(this.countInBeat === 1);
    }
    if (elapsedMs >= beatMs * 4) {
      void this.beginPlaying();
      return;
    }
    this.emit();
  }

  private async beginPlaying(): Promise<void> {
    if (this.status !== "countdown") return;
    this.countInBeat = 0;
    if (this.audioClockReady) {
      try {
        await this.clock.start(0);
        this.scheduler.restartLoop();
      } catch {
        this.audioUnavailable = true;
        this.audioClockReady = false;
        this.fallbackSongPositionMs = 0;
        this.fallbackStartedAtMs = this.now();
        this.scheduler.start();
      }
    } else {
      this.fallbackSongPositionMs = 0;
      this.fallbackStartedAtMs = this.now();
      this.scheduler.start();
    }
    if (this.status !== "countdown") return;
    this.status = "playing";
    this.emit();
    this.scheduleFrame();
  }

  private resolveBurst(event: RhythmEvent, songPositionMs: number): void {
    if (event.type !== "burst" || event.endMs === undefined || event.requiredPresses === undefined) return;
    const result = judgeBurst(event as BurstRhythmEvent, this.pendingBurstInputs, this.settings.inputOffsetMs);
    this.pendingBurstInputs = [];
    this.applyJudgement(result, event, songPositionMs);
  }

  private applyJudgement(result: JudgementResult, event: RhythmEvent, songPositionMs: number): void {
    const eventIndex = this.loopRunState.nextEventIndex;
    const nextState = reduceRunState(this.loopRunState, {
      result,
      event,
      eventIndex,
      isFinalEvent: eventIndex === this.chart.beatmap.events.length - 1,
      finalEventEndMs: event.endMs ?? event.startMs,
      songPositionMs,
    }, { continueAfterZeroHearts: true });
    this.loopRunState = nextState;
    this.lastJudgement = result;
    this.sessionPerfectCount += result.judgement === "perfect" ? 1 : 0;
    this.sessionGoodCount += result.judgement === "good" ? 1 : 0;
    this.sessionMissCount += result.judgement === "miss" ? 1 : 0;

    this.emit();
  }

  private completeLoop(): void {
    const result: PracticeLoopResult = Object.freeze({
      patternId: this.chart.patternId,
      accuracy: calculateAccuracy(this.loopRunState),
      perfectCount: this.loopRunState.perfectCount,
      goodCount: this.loopRunState.goodCount,
      missCount: this.loopRunState.missCount,
    });
    this.completedLoops += 1;
    this.bestCompletedLoopAccuracy = Math.max(this.bestCompletedLoopAccuracy ?? 0, result.accuracy);
    this.onLoopComplete?.(result);
    this.loopRunState = createInitialRunState({ runId: `practice-${this.chart.patternId}-${this.completedLoops}`, userOid: "practice", beatmapId: this.chart.beatmap.id });
    this.pendingHoldStart = undefined;
    this.pendingBurstInputs = [];
    this.loopRestarting = true;
    this.emit();
    if (this.audioClockReady) {
      void this.clock.start(0).then(() => {
        if (this.cancelled || this.status === "summary" || this.status === "exited") {
          this.scheduler.stop();
          this.clock.stop();
          this.loopRestarting = false;
          return;
        }
        if (this.status === "paused") {
          this.clock.pause();
          this.scheduler.pause();
          this.pausedSongPositionMs = 0;
          this.loopRestarting = false;
          this.emit();
          return;
        }
        this.scheduler.restartLoop();
        this.loopRestarting = false;
        this.pausedSongPositionMs = 0;
        this.emit();
      }).catch(() => {
        this.audioUnavailable = true;
        this.audioClockReady = false;
        this.fallbackSongPositionMs = 0;
        this.fallbackStartedAtMs = this.now();
        this.loopRestarting = false;
        this.emit();
      });
    } else {
      this.fallbackSongPositionMs = 0;
      this.fallbackStartedAtMs = this.now();
      this.loopRestarting = false;
    }
  }

  private createSnapshot(): PracticeRunSnapshot {
    const counts = this.loopRunState;
    const songPositionMs = this.status === "countdown" ? 0 : this.getSongPositionMs();
    return {
      status: this.status,
      patternId: this.chart.patternId,
      nextEventIndex: counts.nextEventIndex,
      perfectCount: counts.perfectCount,
      goodCount: counts.goodCount,
      missCount: counts.missCount,
      accuracy: calculateAccuracy(counts),
      lastJudgement: this.lastJudgement,
      completedLoops: this.completedLoops,
      sessionPerfectCount: this.sessionPerfectCount,
      sessionGoodCount: this.sessionGoodCount,
      sessionMissCount: this.sessionMissCount,
      bestCompletedLoopAccuracy: this.bestCompletedLoopAccuracy,
      songPositionMs,
      sourceAudioPositionMs: this.chart.sourceAudioStartMs + (songPositionMs % this.chart.loopDurationMs),
      countInBeat: this.countInBeat,
      musicStatus: this.scheduler.getMusicStatus(),
      audioUnavailable: this.audioUnavailable || this.scheduler.getMusicStatus() === "unavailable",
    };
  }

  private emit(): void {
    this.snapshot = this.createSnapshot();
    this.listeners.forEach((listener) => listener(this.snapshot));
  }

  private scheduleFrame(): void {
    if (this.frameHandle !== null || this.status === "paused" || this.status === "summary" || this.status === "exited") return;
    this.frameHandle = this.requestFrame(() => {
      this.frameHandle = null;
      if (this.status === "countdown") this.updateCountdown();
      else if (this.status === "playing") this.update();
      this.scheduleFrame();
    });
  }

  private stopResources(): void {
    if (this.frameHandle !== null) this.cancelFrame(this.frameHandle);
    this.frameHandle = null;
    this.inputController?.releaseHeld();
    this.inputController?.stop();
    this.scheduler.stop();
    this.clock.stop();
  }
}

export function calculateAccuracy(snapshot: Pick<PracticeRunSnapshot, "perfectCount" | "goodCount" | "missCount">): number {
  const total = snapshot.perfectCount + snapshot.goodCount + snapshot.missCount;
  return total === 0 ? 0 : Math.round(((snapshot.perfectCount * 100 + snapshot.goodCount * 60) / (total * 100)) * 100);
}

function isBurstComplete(event: RhythmEvent, inputs: readonly InputEvent[]): boolean {
  if (event.type !== "burst" || event.requiredPresses === undefined) return false;
  return inputs.filter((input) => input.type === "keyup").length >= event.requiredPresses && inputs.at(-1)?.type === "keyup";
}

function defaultRequestFrame(callback: () => void): FrameHandle {
  if (typeof globalThis.requestAnimationFrame === "function") return globalThis.requestAnimationFrame(callback);
  return setTimeout(callback, 16);
}

function defaultCancelFrame(handle: FrameHandle): void {
  if (typeof globalThis.cancelAnimationFrame === "function" && typeof handle === "number") globalThis.cancelAnimationFrame(handle);
  else clearTimeout(handle as ReturnType<typeof setTimeout>);
}
