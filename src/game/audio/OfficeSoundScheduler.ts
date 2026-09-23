import type { Beatmap, RhythmEvent } from '@/domain/rhythm';
import { AudioClock } from './AudioClock';
import { createBeatAccent, createSectionSound, type ScheduledAudioNode } from './instruments';
import { MusicTrackPlayer } from './MusicTrackPlayer';
import { clampAudioSettings, DEFAULT_AUDIO_SETTINGS, type AudioSettings } from './types';

export type OfficeSoundSchedulerOptions = {
  lookaheadMs?: number;
  tickMs?: number;
};

export type MusicStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

export class OfficeSoundScheduler {
  private readonly clock: AudioClock;
  private readonly lookaheadMs: number;
  private readonly tickMs: number;
  private beatmap: Beatmap | null = null;
  private settings: AudioSettings = DEFAULT_AUDIO_SETTINGS;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private musicStepMs = 0;
  private nextMusicStepIndex = 0;
  private readonly scheduledEventIds = new Set<string>();
  private readonly activeNodes = new Set<ScheduledAudioNode>();
  private musicTrack: MusicTrackPlayer | null = null;
  private musicLoad: Promise<void> | null = null;
  private musicStatus: MusicStatus = 'idle';

  constructor(clock: AudioClock, options: OfficeSoundSchedulerOptions = {}) {
    this.clock = clock;
    this.lookaheadMs = options.lookaheadMs ?? 120;
    this.tickMs = options.tickMs ?? 25;
  }

  load(beatmap: Beatmap, settings: AudioSettings = DEFAULT_AUDIO_SETTINGS, fromSongPositionMs = 0): void {
    this.stop();
    this.beatmap = beatmap;
    this.settings = clampAudioSettings(settings);
    this.musicStepMs = 60_000 / beatmap.bpm / 2;
    this.nextMusicStepIndex = Math.ceil(fromSongPositionMs / this.musicStepMs);
    this.musicTrack?.stop();
    this.musicTrack = new MusicTrackPlayer(this.clock.getAudioContext());
    this.musicTrack.setVolume(this.settings.muted ? 0 : this.settings.musicVolume);
    this.musicStatus = 'loading';
    this.musicLoad = this.musicTrack.load('/game/audio/office-groove.wav')
      .then(() => {
        this.musicStatus = 'ready';
      })
      .catch((error: unknown) => {
        this.musicStatus = 'unavailable';
        console.error('Unable to load the local office soundtrack.', error);
      });
    beatmap.events.forEach((event) => {
      if ((event.endMs ?? event.startMs) < fromSongPositionMs) this.scheduledEventIds.add(event.id);
    });
  }

  start(): void {
    if (!this.beatmap || this.running) {
      return;
    }

    this.running = true;
    void this.musicLoad?.then(() => {
      if (this.running && !this.settings.muted && this.settings.musicVolume > 0) {
        this.musicTrack?.start(this.clock.getSongPositionMs());
      }
    });
    this.tick();
    this.timer = setInterval(() => this.tick(), this.tickMs);
  }

  pause(): void {
    this.musicTrack?.pause(this.clock.getSongPositionMs());
    this.clearTimer();
    this.running = false;
  }

  resume(): void {
    if (!this.beatmap || this.running) {
      return;
    }

    this.running = true;
    void this.musicLoad?.then(() => {
      if (this.running && !this.settings.muted && this.settings.musicVolume > 0) {
        this.musicTrack?.resume(this.clock.getSongPositionMs());
      }
    });
    this.tick();
    this.timer = setInterval(() => this.tick(), this.tickMs);
  }

  stop(): void {
    this.clearTimer();
    this.running = false;
    this.musicTrack?.stop();
    this.musicStatus = 'idle';
    this.scheduledEventIds.clear();
    this.nextMusicStepIndex = 0;
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
    this.musicTrack?.setVolume(this.settings.muted ? 0 : this.settings.musicVolume);
    if (this.settings.muted || this.settings.musicVolume <= 0) this.musicTrack?.pause(this.clock.getSongPositionMs());
    else if (this.running) {
      void this.musicLoad?.then(() => this.musicTrack?.resume(this.clock.getSongPositionMs()));
    }
  }

  getMusicStatus(): MusicStatus {
    return this.musicStatus;
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

    while (this.nextMusicStepIndex * this.musicStepMs <= horizonMs) this.nextMusicStepIndex += 1;

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
      ...(this.settings.sfxVolume > 0
        ? createSectionSound(event.section, {
            context,
            when,
            durationSec,
            volume: this.settings.sfxVolume,
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
