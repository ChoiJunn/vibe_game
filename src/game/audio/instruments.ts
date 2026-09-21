import type { SectionId } from '@/domain/rhythm';

export type ScheduledAudioNode = AudioScheduledSourceNode;

export type InstrumentOptions = {
  context: AudioContext;
  when: number;
  durationSec: number;
  volume: number;
  destination: AudioNode;
};

export function createSectionSound(section: SectionId, options: InstrumentOptions): ScheduledAudioNode[] {
  switch (section) {
    case 'arrival':
      return createTone(options, 'sine', 220, 330);
    case 'keyboard':
      return createNoiseBurst(options, 0.18);
    case 'mail':
      return createTone(options, 'triangle', 520, 780);
    case 'meeting':
      return createTone(options, 'sawtooth', 146, 196);
    case 'copy':
      return createNoiseBurst(options, 0.32);
    case 'departure':
      return createTone(options, 'sine', 392, 262);
  }
}

export function createBeatAccent(options: InstrumentOptions): ScheduledAudioNode[] {
  return createTone(options, 'square', 880, 660);
}

function createTone(
  options: InstrumentOptions,
  type: OscillatorType,
  startFrequency: number,
  endFrequency: number,
): ScheduledAudioNode[] {
  const oscillator = options.context.createOscillator();
  const gain = createEnvelope(options, 0.0001);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, options.when);
  oscillator.frequency.linearRampToValueAtTime(endFrequency, options.when + options.durationSec);
  oscillator.connect(gain);
  oscillator.start(options.when);
  oscillator.stop(options.when + options.durationSec);

  return [oscillator];
}

function createNoiseBurst(options: InstrumentOptions, durationSec: number): ScheduledAudioNode[] {
  const sampleRate = options.context.sampleRate || 44_100;
  const buffer = options.context.createBuffer(1, Math.ceil(sampleRate * durationSec), sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }

  const source = options.context.createBufferSource();
  const gain = createEnvelope({ ...options, durationSec }, 0.0001);
  source.buffer = buffer;
  source.connect(gain);
  source.start(options.when);
  source.stop(options.when + durationSec);

  return [source];
}

function createEnvelope(options: InstrumentOptions, minimumGain: number): GainNode {
  const gain = options.context.createGain();
  const end = options.when + options.durationSec;
  const peak = Math.max(minimumGain, options.volume);

  gain.gain.setValueAtTime(0.0001, options.when);
  gain.gain.linearRampToValueAtTime(peak, options.when + Math.min(0.02, options.durationSec / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  gain.connect(options.destination);

  return gain;
}
