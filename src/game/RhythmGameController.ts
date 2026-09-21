import type { Beatmap, RhythmEvent, RunState, SectionId } from '@/domain/rhythm';
import { AudioClock } from './audio/AudioClock';
import { OfficeSoundScheduler } from './audio/OfficeSoundScheduler';
import { DEFAULT_AUDIO_SETTINGS, type AudioClockState, type AudioSettings } from './audio/types';
import { judgeHoldEnd, judgeHoldStart, judgeTap, combineHoldJudgements } from './judgement/judgeInput';
import type { InputEvent, JudgementResult } from './judgement/types';
import { SpaceInputController } from './input/SpaceInputController';
import { createInitialRunState, reduceRunState } from './state/reduceRunState';

export type RhythmGameSnapshot = {
  clockState: AudioClockState;
  songPositionMs: number;
  runState: RunState;
  currentEvent?: RhythmEvent;
  section: SectionId;
  lastJudgement?: JudgementResult;
};

export type RhythmGameControllerOptions = {
  beatmap: Beatmap;
  clock?: AudioClock;
  scheduler?: OfficeSoundScheduler;
  inputController?: Pick<SpaceInputController, 'start' | 'stop'>;
  audioSettings?: AudioSettings;
  runId?: string;
  userOid?: string;
};

export class RhythmGameController {
  private readonly beatmap: Beatmap;
  private readonly clock: AudioClock;
  private readonly scheduler: OfficeSoundScheduler;
  private readonly audioSettings: AudioSettings;
  private readonly runId: string;
  private readonly userOid: string;
  private inputController?: Pick<SpaceInputController, 'start' | 'stop'>;
  private runState: RunState;
  private pendingHoldStart?: JudgementResult;
  private lastJudgement?: JudgementResult;
  private readonly listeners = new Set<(snapshot: RhythmGameSnapshot) => void>();

  constructor(options: RhythmGameControllerOptions) {
    this.beatmap = options.beatmap;
    this.clock = options.clock ?? new AudioClock();
    this.scheduler = options.scheduler ?? new OfficeSoundScheduler(this.clock);
    this.audioSettings = options.audioSettings ?? DEFAULT_AUDIO_SETTINGS;
    this.runId = options.runId ?? `run-${Date.now()}`;
    this.userOid = options.userOid ?? 'local-user';
    this.runState = createInitialRunState({
      runId: this.runId,
      userOid: this.userOid,
      beatmapId: this.beatmap.id,
    });
    this.inputController = options.inputController;
  }

  attachInputController(inputController: Pick<SpaceInputController, 'start' | 'stop'>): void {
    this.inputController = inputController;
  }

  async start(atSongMs = 0): Promise<void> {
    await this.clock.load(this.beatmap, this.audioSettings);
    this.scheduler.load(this.beatmap, this.audioSettings);
    await this.clock.start(atSongMs);
    this.scheduler.start();
    this.inputController?.start();
    this.emit();
  }

  pause(): void {
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
    this.inputController?.stop();
    this.scheduler.stop();
    this.clock.stop();
    this.emit();
  }

  handleInput(input: InputEvent): void {
    if (this.runState.status !== 'active' || this.clock.getState() !== 'playing') {
      return;
    }

    const event = this.beatmap.events[this.runState.nextEventIndex];
    if (!event) {
      return;
    }

    if (event.type === 'tap' && input.type === 'keydown') {
      this.applyResult(judgeTap(event, input, this.audioSettings.inputOffsetMs), event);
      return;
    }

    if (event.type !== 'hold') {
      return;
    }

    if (input.type === 'keydown' && !this.pendingHoldStart) {
      this.pendingHoldStart = judgeHoldStart(event, input, this.audioSettings.inputOffsetMs);
      return;
    }

    if (input.type === 'keyup' && this.pendingHoldStart) {
      const end = judgeHoldEnd(event, input, this.audioSettings.inputOffsetMs);
      const combined = combineHoldJudgements(this.pendingHoldStart, end).combined;
      this.pendingHoldStart = undefined;
      this.applyResult(combined, event);
    }
  }

  subscribe(listener: (snapshot: RhythmGameSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): RhythmGameSnapshot {
    const currentEvent = this.beatmap.events[this.runState.nextEventIndex];
    return {
      clockState: this.clock.getState(),
      songPositionMs: this.clock.getSongPositionMs(),
      runState: this.runState,
      currentEvent,
      section: currentEvent?.section ?? this.beatmap.sections[this.beatmap.sections.length - 1]?.id ?? 'arrival',
      lastJudgement: this.lastJudgement,
    };
  }

  getSongPositionMs(): number {
    return this.clock.getSongPositionMs();
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
  }

  private applyResult(result: JudgementResult, event: RhythmEvent): void {
    const eventIndex = this.runState.nextEventIndex;
    this.runState = reduceRunState(this.runState, {
      result,
      eventIndex,
      isFinalEvent: eventIndex === this.beatmap.events.length - 1,
      finalEventEndMs: event.endMs ?? event.startMs,
      songPositionMs: this.clock.getSongPositionMs(),
    });
    this.lastJudgement = result;
    this.emit();
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
