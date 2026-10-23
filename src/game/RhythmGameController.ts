import {
  isBurstRhythmEvent,
  type Beatmap,
  type BurstRhythmEvent,
  type RhythmEvent,
  type RunState,
  type SectionId,
} from "@/domain/rhythm";
import { AudioClock } from "./audio/AudioClock";
import { OfficeSoundScheduler } from "./audio/OfficeSoundScheduler";
import type { MusicStatus } from "./audio/OfficeSoundScheduler";
import {
  clampAudioSettings,
  DEFAULT_AUDIO_SETTINGS,
  type AudioClockState,
  type AudioSettings,
} from "./audio/types";
import {
  judgeBurst,
  judgeHoldEnd,
  judgeHoldStart,
  judgeTap,
  combineHoldJudgements,
} from "./judgement/judgeInput";
import {
  JUDGEMENT_WINDOWS,
  type InputEvent,
  type JudgementResult,
} from "./judgement/types";
import { SpaceInputController } from "./input/SpaceInputController";
import { createInitialRunState, normalizeRunState, reduceRunState } from "./state/reduceRunState";

export type RhythmGameSnapshot = {
  clockState: AudioClockState;
  songPositionMs: number;
  runState: RunState;
  currentEvent?: RhythmEvent;
  events: readonly RhythmEvent[];
  totalEvents: number;
  section: SectionId;
  lastJudgement?: JudgementResult;
  holdState?: HoldState;
  burstState?: BurstState;
  judgementHistory: readonly JudgementHistoryEntry[];
  musicStatus: MusicStatus;
};

export type JudgementHistoryEntry = {
  eventId: string;
  patternId: string;
  patternKind: RhythmEvent["patternKind"];
  judgement: JudgementResult["judgement"];
};

export type HoldState = {
  eventId: string;
  phase: "waiting" | "holding";
  progress: number;
  startJudgement?: JudgementResult;
};

export type BurstState = {
  eventId: string;
  requiredPresses: number;
  completedPresses: number;
  phase: "waiting" | "counting";
  progress: number;
};

export type AutomaticMissNotification = {
  chartEventId: string;
  songPositionMs: number;
};

export type GameStartCountdownStep = 3 | 2 | 1 | "GO";

export type RhythmGameControllerOptions = {
  beatmap: Beatmap;
  clock?: AudioClock;
  scheduler?: OfficeSoundScheduler;
  inputController?: Pick<SpaceInputController, "start" | "stop"> &
    Partial<Pick<SpaceInputController, "releaseHeld">>;
  audioSettings?: AudioSettings;
  initialRunState?: RunState;
  runId?: string;
  userOid?: string;
};

export class RhythmGameController {
  private readonly beatmap: Beatmap;
  private readonly clock: AudioClock;
  private readonly scheduler: OfficeSoundScheduler;
  private audioSettings: AudioSettings;
  private pendingAudioSettings?: AudioSettings;
  private readonly runId: string;
  private readonly userOid: string;
  private inputController?: Pick<SpaceInputController, "start" | "stop"> &
    Partial<Pick<SpaceInputController, "releaseHeld">>;
  private runState: RunState;
  private pendingHoldStart?: JudgementResult;
  private pendingBurstInputs: InputEvent[] = [];
  private lastJudgement?: JudgementResult;
  private judgementHistory: JudgementHistoryEntry[] = [];
  private startGeneration = 0;
  private pendingStartCountdown?: {
    timeout: ReturnType<typeof setTimeout>;
    resolve: (active: boolean) => void;
  };
  private startCountdownCallback?: (step: GameStartCountdownStep | null) => void;
  private readonly listeners = new Set<
    (snapshot: RhythmGameSnapshot) => void
  >();
  private readonly automaticMissListeners = new Set<
    (miss: AutomaticMissNotification) => void
  >();

  constructor(options: RhythmGameControllerOptions) {
    this.beatmap = options.beatmap;
    this.clock = options.clock ?? new AudioClock();
    this.scheduler = options.scheduler ?? new OfficeSoundScheduler(this.clock);
    this.audioSettings = clampAudioSettings(
      options.audioSettings ?? DEFAULT_AUDIO_SETTINGS,
    );
    this.runId = options.runId ?? `run-${Date.now()}`;
    this.userOid = options.userOid ?? "local-user";
    this.runState =
      options.initialRunState ??
      createInitialRunState({
        runId: this.runId,
        userOid: this.userOid,
        beatmapId: this.beatmap.id,
      });
    this.inputController = options.inputController;
  }

  attachInputController(
    inputController: Pick<SpaceInputController, "start" | "stop"> &
      Partial<Pick<SpaceInputController, "releaseHeld">>,
  ): void {
    this.inputController = inputController;
  }

  async start(
    atSongMs = 0,
    restoredState?: RunState,
    onCountdown?: (step: GameStartCountdownStep | null) => void,
  ): Promise<void> {
    this.invalidatePendingStart();
    const generation = this.startGeneration;
    this.startCountdownCallback = onCountdown;
    this.runState = restoredState
      ? { ...normalizeRunState(restoredState), status: "active" }
      : createInitialRunState({
          runId: this.runId,
          userOid: this.userOid,
          beatmapId: this.beatmap.id,
        });
    this.pendingHoldStart = undefined;
    this.pendingBurstInputs = [];
    this.lastJudgement = undefined;
    this.judgementHistory = [];
    try {
      await this.clock.load(this.beatmap, this.audioSettings);
      if (!this.isCurrentStart(generation)) return;
      this.scheduler.load(this.beatmap, this.audioSettings, atSongMs);
      this.scheduler.setFeverActive?.(false);

      if (onCountdown) {
        if (!this.audioSettings.muted && this.audioSettings.sfxVolume > 0) {
          try {
            await this.clock.prepareForCountIn();
          } catch {
            // A visual count-in is still useful when the browser blocks audio.
          }
          if (!this.isCurrentStart(generation)) {
            this.clock.stop();
            return;
          }
        }

        for (const [step, accent] of [[3, true], [2, false], [1, false]] as const) {
          onCountdown(step);
          this.playStartCountInBeat(accent);
          if (!await this.waitForStartCountdown(1_000, generation)) return;
        }

        onCountdown("GO");
        this.playStartCountInBeat(true);
        if (!await this.waitForStartCountdown(250, generation)) return;
      }

      if (!this.isCurrentStart(generation)) return;
      await this.clock.start(atSongMs);
      if (!this.isCurrentStart(generation)) {
        this.clock.stop();
        return;
      }
      this.scheduler.start();
      this.inputController?.start();
      this.emit();
    } finally {
      if (this.isCurrentStart(generation)) {
        this.clearStartCountdownCallback();
      }
    }
  }

  pause(): void {
    this.inputController?.releaseHeld?.();
    this.clock.pause();
    this.scheduler.pause();
    this.emit();
  }

  async resume(): Promise<void> {
    await this.clock.resume();
    this.scheduler.resume();
    this.emit();
  }

  stop(): void {
    this.invalidatePendingStart();
    this.inputController?.stop();
    this.scheduler.stop();
    this.clock.stop();
    this.emit();
  }

  abandon(): void {
    if (this.runState.status === "active") {
      this.runState = { ...this.runState, status: "abandoned" };
    }
    this.stop();
  }

  handleInput(input: InputEvent): void {
    if (
      this.runState.status !== "active" ||
      this.clock.getState() !== "playing"
    ) {
      return;
    }

    const event = this.beatmap.events[this.runState.nextEventIndex];
    if (!event) {
      return;
    }

    if (event.type === "tap" && input.type === "keydown") {
      this.applyResult(
        judgeTap(event, input, this.audioSettings.inputOffsetMs),
        event,
      );
      return;
    }

    if (isBurstRhythmEvent(event)) {
      // Tap notes are judged on keydown and advance the chart immediately.
      // Their matching keyup can therefore arrive while the next chart event
      // is already a burst; it belongs to the tap, not to this burst.
      if (
        input.type === "keyup" &&
        this.pendingBurstInputs.at(-1)?.type !== "keydown"
      ) {
        return;
      }
      this.pendingBurstInputs.push(input);
      if (
        input.type === "keyup" &&
        this.isBurstComplete(event) &&
        input.songPositionMs + this.audioSettings.inputOffsetMs >= event.endMs!
      ) {
        this.resolveBurst(event, input.songPositionMs);
      }
      return;
    }

    if (event.type !== "hold") {
      return;
    }

    if (input.type === "keydown" && !this.pendingHoldStart) {
      this.pendingHoldStart = judgeHoldStart(
        event,
        input,
        this.audioSettings.inputOffsetMs,
      );
      return;
    }

    if (input.type === "keyup" && this.pendingHoldStart) {
      const end = judgeHoldEnd(event, input, this.audioSettings.inputOffsetMs);
      const combined = combineHoldJudgements(
        this.pendingHoldStart,
        end,
      ).combined;
      this.pendingHoldStart = undefined;
      this.applyResult(combined, event);
      if (this.pendingAudioSettings) {
        const pending = this.pendingAudioSettings;
        this.pendingAudioSettings = undefined;
        this.applyAudioSettings(pending);
      }
    }
  }

  update(songPositionMs = this.clock.getSongPositionMs()): void {
    if (
      this.runState.status !== "active" ||
      this.clock.getState() !== "playing"
    ) {
      return;
    }

    while (this.runState.status === "active") {
      if (this.clock.getState() !== "playing") return;
      const event = this.beatmap.events[this.runState.nextEventIndex];
      if (!event) return;

      if (isBurstRhythmEvent(event)) {
        if (this.isBurstComplete(event) && songPositionMs >= event.endMs!) {
          this.resolveBurst(event, songPositionMs);
          continue;
        }

        const burstDeadlineMs = event.endMs! + JUDGEMENT_WINDOWS.goodMs;
        if (songPositionMs <= burstDeadlineMs) return;

        const automaticMiss = { chartEventId: event.id, songPositionMs };
        this.automaticMissListeners.forEach((listener) =>
          listener(automaticMiss),
        );
        this.pendingBurstInputs = [];
        this.applyResult(
          {
            judgement: "miss",
            errorMs: songPositionMs - event.endMs!,
            eventId: event.id,
          },
          event,
          songPositionMs,
        );
        continue;
      }

      const targetMs = event.type === "hold" ? event.endMs! : event.startMs;
      const deadlineMs = targetMs + JUDGEMENT_WINDOWS.goodMs;
      if (songPositionMs <= deadlineMs) return;

      const automaticMiss = { chartEventId: event.id, songPositionMs };
      this.automaticMissListeners.forEach((listener) =>
        listener(automaticMiss),
      );
      this.pendingHoldStart = undefined;
      if (this.pendingAudioSettings) {
        const pending = this.pendingAudioSettings;
        this.pendingAudioSettings = undefined;
        this.applyAudioSettings(pending);
      }
      this.applyResult(
        {
          judgement: "miss",
          errorMs: songPositionMs - targetMs,
          eventId: event.id,
        },
        event,
        songPositionMs,
      );
    }
  }

  setAudioSettings(settings: AudioSettings): void {
    const next = clampAudioSettings(settings);
    if (this.pendingHoldStart) {
      this.pendingAudioSettings = { ...next };
      next.inputOffsetMs = this.audioSettings.inputOffsetMs;
    } else {
      this.pendingAudioSettings = undefined;
    }
    this.applyAudioSettings(next);
  }

  subscribe(listener: (snapshot: RhythmGameSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  subscribeAutomaticMiss(
    listener: (miss: AutomaticMissNotification) => void,
  ): () => void {
    this.automaticMissListeners.add(listener);
    return () => this.automaticMissListeners.delete(listener);
  }

  getSnapshot(): RhythmGameSnapshot {
    const currentEvent = this.beatmap.events[this.runState.nextEventIndex];
    const holdState =
      currentEvent?.type === "hold" && currentEvent.endMs !== undefined
        ? {
            eventId: currentEvent.id,
            phase: this.pendingHoldStart
              ? ("holding" as const)
              : ("waiting" as const),
            progress: Math.min(
              1,
              Math.max(
                0,
                (this.clock.getSongPositionMs() - currentEvent.startMs) /
                  (currentEvent.endMs - currentEvent.startMs),
              ),
            ),
            startJudgement: this.pendingHoldStart,
          }
        : undefined;
    const burstState =
      currentEvent && isBurstRhythmEvent(currentEvent)
        ? {
            eventId: currentEvent.id,
            requiredPresses: currentEvent.requiredPresses!,
            completedPresses: this.getCompletedBurstPresses(),
            phase:
              this.pendingBurstInputs.length > 0
                ? ("counting" as const)
                : ("waiting" as const),
            progress: Math.min(
              1,
              this.getCompletedBurstPresses() / currentEvent.requiredPresses!,
            ),
          }
        : undefined;
    return {
      clockState: this.clock.getState(),
      songPositionMs: this.clock.getSongPositionMs(),
      runState: this.runState,
      currentEvent,
      events: this.beatmap.events,
      totalEvents: this.beatmap.events.length,
      section:
        currentEvent?.section ??
        this.beatmap.sections[this.beatmap.sections.length - 1]?.id ??
        "arrival",
      lastJudgement: this.lastJudgement,
      holdState,
      burstState,
      judgementHistory: [...this.judgementHistory],
      musicStatus: typeof this.scheduler.getMusicStatus === "function" ? this.scheduler.getMusicStatus() : "idle",
    };
  }

  getSongPositionMs(): number {
    return this.clock.getSongPositionMs();
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
    this.automaticMissListeners.clear();
  }

  private applyResult(
    result: JudgementResult,
    event: RhythmEvent,
    songPositionMs = this.clock.getSongPositionMs(),
  ): void {
    const eventIndex = this.runState.nextEventIndex;
    this.runState = reduceRunState(this.runState, {
      result,
      event,
      eventIndex,
      isFinalEvent: eventIndex === this.beatmap.events.length - 1,
      finalEventEndMs: event.endMs ?? event.startMs,
      songPositionMs,
    });
    this.scheduler.setFeverActive?.(this.runState.feverActiveUntilMs > songPositionMs);
    if (event.type === "burst") this.pendingBurstInputs = [];
    this.lastJudgement = result;
    this.judgementHistory.push({ eventId: event.id, patternId: event.patternId, patternKind: event.patternKind, judgement: result.judgement });
    if (
      this.runState.status === "completed" ||
      this.runState.status === "failed"
    ) {
      // Freeze the run immediately. Release a recorded held key first so its
      // matching keyup is autosaved before the terminal result is submitted.
      this.inputController?.releaseHeld?.();
      this.clock.pause();
      this.scheduler.pause();
    }
    this.emit();
  }

  private isCurrentStart(generation: number): boolean {
    return generation === this.startGeneration;
  }

  private waitForStartCountdown(durationMs: number, generation: number): Promise<boolean> {
    if (!this.isCurrentStart(generation)) return Promise.resolve(false);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (this.pendingStartCountdown?.timeout === timeout) {
          this.pendingStartCountdown = undefined;
        }
        resolve(this.isCurrentStart(generation));
      }, durationMs);
      this.pendingStartCountdown = { timeout, resolve };
    });
  }

  private invalidatePendingStart(): void {
    this.startGeneration += 1;
    const pending = this.pendingStartCountdown;
    this.pendingStartCountdown = undefined;
    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve(false);
    }
    this.clearStartCountdownCallback();
  }

  private clearStartCountdownCallback(): void {
    const callback = this.startCountdownCallback;
    this.startCountdownCallback = undefined;
    callback?.(null);
  }

  private playStartCountInBeat(accent: boolean): void {
    if (this.audioSettings.muted || this.audioSettings.sfxVolume <= 0) return;
    this.scheduler.playCountInBeat(accent);
  }

  private resolveBurst(event: BurstRhythmEvent, songPositionMs: number): void {
    const result = judgeBurst(
      event,
      this.pendingBurstInputs,
      this.audioSettings.inputOffsetMs,
    );
    this.applyResult(result, event, songPositionMs);
  }

  private isBurstComplete(event: BurstRhythmEvent): boolean {
    const completedPresses = this.getCompletedBurstPresses();
    return (
      completedPresses >= event.requiredPresses &&
      this.pendingBurstInputs.at(-1)?.type === "keyup"
    );
  }

  private getCompletedBurstPresses(): number {
    return this.pendingBurstInputs.filter((input) => input.type === "keyup")
      .length;
  }

  private applyAudioSettings(settings: AudioSettings): void {
    this.audioSettings = clampAudioSettings(settings);
    this.clock.setSettings(this.audioSettings);
    this.scheduler.setSettings(this.audioSettings);
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
