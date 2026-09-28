const defaultFetcher: typeof fetch = (input, init) => globalThis.fetch(input, init);

export type MusicTrackRegion = {
  startMs: number;
  endMs: number;
};

/** Plays a locally bundled music bed against the game's shared AudioContext. */
export class MusicTrackPlayer {
  private readonly context: AudioContext;
  private readonly destination: AudioNode;
  private readonly fetcher: typeof fetch;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private loadPromise: Promise<void> | null = null;
  private offsetMs = 0;
  private volume = 1;
  private sourceStartedAt = 0;
  private loopRegion?: MusicTrackRegion;

  constructor(context: AudioContext, destination: AudioNode = context.destination, fetcher: typeof fetch = defaultFetcher) {
    this.context = context;
    this.destination = destination;
    this.fetcher = fetcher;
  }

  load(url: string): Promise<void> {
    if (this.buffer) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.fetcher(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load music track (${response.status})`);
        return response.arrayBuffer();
      })
      .then((data) => this.context.decodeAudioData(data))
      .then((buffer) => {
        if (this.loopRegion && (this.loopRegion.startMs < 0 || this.loopRegion.endMs <= this.loopRegion.startMs || this.loopRegion.endMs > buffer.duration * 1000)) {
          throw new Error('The requested music loop region is outside the decoded track.');
        }
        this.buffer = buffer;
      })
      .catch((error: unknown) => {
        this.loadPromise = null;
        throw error;
      });

    return this.loadPromise;
  }

  setLoopRegion(region?: MusicTrackRegion): void {
    this.loopRegion = region;
  }

  start(songPositionMs: number): void {
    this.playAt(songPositionMs);
  }

  pause(songPositionMs?: number): void {
    if (songPositionMs !== undefined) this.offsetMs = this.clampOffset(songPositionMs);
    else if (this.source) {
      this.offsetMs = this.clampOffset(this.offsetMs + (this.context.currentTime - this.sourceStartedAt) * 1000);
    }
    this.stopSource();
  }

  resume(songPositionMs: number): void {
    this.playAt(songPositionMs);
  }

  stop(): void {
    this.stopSource();
    this.offsetMs = 0;
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 0));
    if (this.gain) this.gain.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.015);
  }

  private playAt(songPositionMs: number): void {
    if (!this.buffer || this.context.state === 'closed') return;
    this.stopSource();
    const region = this.getValidLoopRegion();
    const offset = region
      ? region.startMs + (Math.max(0, songPositionMs) % (region.endMs - region.startMs))
      : this.clampOffset(songPositionMs);
    if (offset >= this.buffer.duration * 1000) return;

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffer;
    if (region) {
      source.loop = true;
      source.loopStart = region.startMs / 1000;
      source.loopEnd = region.endMs / 1000;
    }
    gain.gain.setValueAtTime(this.volume, this.context.currentTime);
    source.connect(gain);
    gain.connect(this.destination);
    source.onended = () => {
      if (this.source === source) this.source = null;
    };
    this.source = source;
    this.gain = gain;
    this.offsetMs = songPositionMs;
    this.sourceStartedAt = this.context.currentTime;
    source.start(0, offset / 1000);
  }

  private stopSource(): void {
    if (!this.source) return;
    const source = this.source;
    this.source = null;
    source.onended = null;
    try {
      source.stop();
    } catch {
      // The source may have ended naturally or already been stopped.
    }
  }

  private clampOffset(offsetMs: number): number {
    return Math.min(this.buffer ? this.buffer.duration * 1000 : Number.MAX_SAFE_INTEGER, Math.max(0, offsetMs));
  }

  private getValidLoopRegion(): MusicTrackRegion | undefined {
    if (!this.buffer || !this.loopRegion) return undefined;
    const durationMs = this.buffer.duration * 1000;
    if (this.loopRegion.startMs < 0 || this.loopRegion.endMs <= this.loopRegion.startMs || this.loopRegion.endMs > durationMs) return undefined;
    return this.loopRegion;
  }
}
