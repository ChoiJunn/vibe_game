const defaultFetcher: typeof fetch = (input, init) => globalThis.fetch(input, init);

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
        this.buffer = buffer;
      })
      .catch((error: unknown) => {
        this.loadPromise = null;
        throw error;
      });

    return this.loadPromise;
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
    const offset = this.clampOffset(songPositionMs);
    if (offset >= this.buffer.duration * 1000) return;

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffer;
    gain.gain.setValueAtTime(this.volume, this.context.currentTime);
    source.connect(gain);
    gain.connect(this.destination);
    source.onended = () => {
      if (this.source === source) this.source = null;
    };
    this.source = source;
    this.gain = gain;
    this.offsetMs = offset;
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
}
