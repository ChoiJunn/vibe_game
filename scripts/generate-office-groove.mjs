import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const output = resolve(scriptDir, '../public/game/audio/office-groove.wav');
const sampleRate = 22_050;
const bpm = 155;
const durationSeconds = 120;
const beatSeconds = 60 / bpm;
const samples = new Float32Array(sampleRate * durationSeconds);
const progressions = [
  [130.81, 164.81, 196.0], [110.0, 130.81, 164.81], [146.83, 174.61, 220.0],
  [98.0, 123.47, 146.83], [116.54, 146.83, 174.61], [130.81, 164.81, 196.0],
];

function addTone(start, duration, frequency, amplitude, bass = false) {
  const first = Math.max(0, Math.floor(start * sampleRate));
  const last = Math.min(samples.length, Math.floor((start + duration) * sampleRate));
  for (let index = first; index < last; index += 1) {
    const elapsed = index / sampleRate - start;
    const attack = Math.min(1, elapsed / 0.008);
    const release = Math.min(1, (duration - elapsed) / Math.min(0.09, duration * 0.4));
    const envelope = Math.max(0, Math.min(attack, release)) * Math.exp(-elapsed * 1.4);
    const phase = 2 * Math.PI * frequency * elapsed;
    const fundamental = Math.sin(phase);
    const overtone = Math.sin(phase * 2.003) * 0.22;
    samples[index] += amplitude * envelope * (bass ? fundamental * 0.82 + overtone : fundamental + overtone);
  }
}

function addKick(start) {
  const duration = 0.19;
  const first = Math.floor(start * sampleRate);
  const last = Math.min(samples.length, first + Math.floor(duration * sampleRate));
  for (let index = first; index < last; index += 1) {
    const elapsed = (index - first) / sampleRate;
    samples[index] += Math.sin(2 * Math.PI * (105 - 55 * elapsed / duration) * elapsed) * Math.exp(-elapsed * 21) * 0.44;
  }
}

function addNoise(start, duration, amplitude, seed) {
  const first = Math.floor(start * sampleRate);
  const last = Math.min(samples.length, first + Math.floor(duration * sampleRate));
  let value = seed | 0;
  for (let index = first; index < last; index += 1) {
    value = (value * 1664525 + 1013904223) | 0;
    const noise = (value >>> 8) / 0x7fffff - 1;
    const elapsed = (index - first) / sampleRate;
    samples[index] += noise * amplitude * Math.exp(-elapsed * (duration < 0.1 ? 42 : 13));
  }
}

const beatCount = Math.round(durationSeconds / beatSeconds);
for (let beat = 0; beat < beatCount; beat += 1) {
  const start = beat * beatSeconds;
  const bar = Math.floor(beat / 4);
  const chord = progressions[Math.min(5, Math.floor(bar / 9))];
  const beatInBar = beat % 4;
  if (beatInBar === 0 || beatInBar === 2) addKick(start);
  if (beatInBar === 1 || beatInBar === 3) addNoise(start, 0.16, 0.23, beat * 881 + 17);
  addNoise(start, 0.045, 0.075, beat * 991 + 41);
  const offbeat = start + beatSeconds * 0.5;
  if (offbeat < durationSeconds) addNoise(offbeat, 0.055, 0.105, beat * 1277 + 73);
  const bassNotes = [chord[0] / 2, chord[0] / 2, chord[1] / 2, chord[0] / 2, chord[2] / 2, chord[1] / 2, chord[0] / 2, chord[1] / 2];
  addTone(start, beatSeconds * 0.34, bassNotes[beat % bassNotes.length], 0.25, true);
  if (beatInBar === 0 || beatInBar === 2) chord.forEach((frequency, note) => addTone(start + 0.035, 0.19, frequency, note === 0 ? 0.07 : 0.045));
  const chop = start + beatSeconds * 0.52;
  if (chop < durationSeconds) addTone(chop, 0.075, chord[(bar + beatInBar) % chord.length] * 2, 0.035);
  if (bar % 4 === 3) {
    const lift = start + beatSeconds * 0.25;
    if (lift < durationSeconds) addTone(lift, 0.09, chord[(beat + 1) % chord.length] * 3, 0.055);
  }
}

const pcmBytes = samples.length * 2;
const wav = Buffer.alloc(44 + pcmBytes);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + pcmBytes, 4);
wav.write('WAVE', 8);
wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(pcmBytes, 40);
for (let index = 0; index < samples.length; index += 1) wav.writeInt16LE(Math.round(Math.tanh(samples[index] * 1.35) * 0.88 * 32_767), 44 + index * 2);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, wav);
console.log(`Generated original ${bpm} BPM, ${durationSeconds}s track: ${output}`);
