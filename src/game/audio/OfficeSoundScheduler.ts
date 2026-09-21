import type { Beatmap, RhythmEvent } from '@/domain/rhythm';
import { AudioClock } from './AudioClock';
import { createBeatAccent, createSectionSound, type ScheduledAudioNode } from './instruments';
import { clampAudioSettings, DEFAULT_AUDIO_SETTINGS, type AudioSettings } from './types';

export type OfficeSoundSchedulerOptions = {
  lookaheadMs?: number;
  tickMs?: number;
};

export class OfficeSoundScheduler {
  private readonly clock: AudioClock;
  private readonly lookaheadMs: number;
  private readonly tickMs: number;
  private beatmap: Beatmap | null = null;
  private settings: AudioSettings = DEFAULT_AUDIO_SETTINGS;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private readonly scheduledEventIds = new Set<string>();
  private readonly activeNodes = new Set<ScheduledAudioNode>();

  constructor(clock: AudioClock, options: OfficeSoundSchedulerOptions = {}) {
    this.clock = clock;
    this.lookaheadMs = options.lookaheadMs ?? 120;
    this.tickMs = options.tickMs ?? 25;
  }

  load(beatmap: Beatmap, settings: AudioSettings = DEFAULT_AUDIO_SETTINGS): void {
    this.stop();
    this.beatmap = beatmap;
    this.settings = clampAudioSettings(settings);
  }

  start(): void {
    if (!this.beatmap || this.running) {
      return;
    }

    this.running = true;
    this.tick();
    this.timer = setInterval(() => this.tick(), this.tickMs);
  }

  pause(): void {
    this.clearTimer();
    this.running = false;
  }

  resume(): void {
    if (!this.beatmap || this.running) {
      return;
    }

    this.start();
  }

  stop(): void {
    this.clearTimer();
    this.running = false;
    this.scheduledEventIds.clear();
    this.activeNodes.forEach((node) => {
      try {
        node.stop();
      } catch {
        // A node may have already completed its scheduled envelope.
      }
    });
    this.activeNodes.clear();
  }

  setSettings(settings: AudioSettings): void {
    this.settings = clampAudioSettings(settings);
  }

  private tick(): void {
    const beatmap = this.beatmap;
    if (!beatmap || !this.running) {
      return;
    }

    const songPositionMs = this.clock.getSongPositionMs();
    if (this.clock.getState() === 'ended') {
      this.pause();
      return;
    }

    const context = this.clock.getAudioContext();
    const horizonMs = songPositionMs + this.lookaheadMs;

    beatmap.events
      .filter((event) => !this.scheduledEventIds.has(event.id) && event.startMs <= horizonMs)
      .forEach((event) => this.scheduleEvent(event, songPositionMs, context));
  }

  private scheduleEvent(event: RhythmEvent, songPositionMs: number, context: AudioContext): void {
    this.scheduledEventIds.add(event.id);

    if (this.settings.muted) {
      return;
    }

    const delayMs = Math.max(0, event.startMs - songPositionMs);
    const when = context.currentTime + delayMs / 1000;
    const durationSec = event.type === 'hold' ? Math.max(0.08, ((event.endMs ?? event.startMs) - event.startMs) / 1000) : 0.12;
    const nodes = [
      ...(this.settings.musicVolume > 0
        ? createSectionSound(event.section, {
            context,
            when,
            durationSec,
            volume: this.settings.musicVolume,
            destination: context.destination,
          })
        : []),
      ...(this.settings.sfxVolume > 0
        ? createBeatAccent({
            context,
            when,
            durationSec: Math.min(0.08, durationSec),
            volume: this.settings.sfxVolume,
            destination: context.destination,
          })
        : []),
    ];

    nodes.forEach((node) => {
      this.activeNodes.add(node);
      node.addEventListener('ended', () => this.activeNodes.delete(node), { once: true });
    });
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
