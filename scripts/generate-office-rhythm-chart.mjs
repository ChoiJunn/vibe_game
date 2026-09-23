import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const output = resolve(scriptDir, '../src/content/beatmaps/office-day-01.json');
const bpm = 155;
const durationMs = 120_000;
const beatMs = 60_000 / bpm;
const halfBeatMs = beatMs / 2;
const sections = [
  { id: 'arrival', startMs: 0, endMs: 20_000 },
  { id: 'keyboard', startMs: 20_000, endMs: 40_000 },
  { id: 'mail', startMs: 40_000, endMs: 60_000 },
  { id: 'meeting', startMs: 60_000, endMs: 80_000 },
  { id: 'copy', startMs: 80_000, endMs: 100_000 },
  { id: 'departure', startMs: 100_000, endMs: durationMs },
];
const sectionCounts = [20, 24, 28, 32, 36, 40];
const burstIndices = new Set([22, 36, 52, 68, 84, 100, 115, 132, 145, 155, 165, 173, 177]);
const holdIndices = new Set([5, 12, 19, 28, 43, 50, 59, 65, 74, 80, 91, 97, 104, 110, 123, 129, 138, 143, 150, 158, 162, 168, 175]);
const transitionIndices = new Set([20, 44, 72, 104, 140, 168]);

function sectionFor(startMs) {
  return sections.find((section) => startMs >= section.startMs && startMs < section.endMs) ?? sections.at(-1);
}

let globalIndex = 0;
const starts = sections.flatMap((section, sectionIndex) => {
  const count = sectionCounts[sectionIndex];
  const usableBeats = Math.floor((section.endMs - section.startMs) / beatMs) - 2;
  return Array.from({ length: count }, (_, index) => {
    const quarter = Math.floor(((index + 1) * usableBeats) / (count + 1));
    const offbeat = globalIndex % 5 < 2;
    globalIndex += 1;
    return Math.round(section.startMs + quarter * beatMs + (offbeat ? halfBeatMs : 0));
  });
});

const events = starts.map((startMs, index) => {
  const section = sectionFor(startMs);
  const id = `${section.id}-${String(index + 1).padStart(3, '0')}`;
  const patternKind = burstIndices.has(index)
    ? 'burst'
    : holdIndices.has(index)
      ? 'hold'
      : transitionIndices.has(index)
        ? 'transition'
        : index % 5 < 2
          ? 'offbeat'
          : 'straight';
  const type = patternKind === 'burst' ? 'burst' : patternKind === 'hold' ? 'hold' : 'tap';
  const nextStart = starts[index + 1] ?? durationMs;
  const endMs = type === 'burst'
    ? Math.min(nextStart - 80, startMs + 480)
    : type === 'hold'
      ? Math.min(nextStart - 80, startMs + (index > 140 ? 430 : 350))
      : undefined;
  const requiredPresses = type === 'burst' ? 3 + (index % 3) : undefined;
  return {
    id,
    type,
    startMs,
    ...(endMs ? { endMs } : {}),
    section: section.id,
    patternKind,
    patternId: `pattern-${String(Math.floor(index / 4) + 1).padStart(3, '0')}`,
    ...(requiredPresses ? { requiredPresses } : {}),
  };
});

const patterns = [];
for (let index = 0; index < events.length; index += 4) {
  const group = events.slice(index, index + 4);
  const first = group[0];
  patterns.push({
    id: `pattern-${String(patterns.length + 1).padStart(3, '0')}`,
    kind: first.patternKind,
    label: `${first.section.toUpperCase()} ${first.patternKind.toUpperCase()}`,
    startMs: first.startMs,
    endMs: group.at(-1).endMs ?? group.at(-1).startMs,
    eventIds: group.map((event) => event.id),
  });
}

events.forEach((event, index) => {
  event.patternId = patterns[Math.floor(index / 4)].id;
});

await writeFile(output, `${JSON.stringify({ id: 'office-day-01', bpm, timeSignature: [4, 4], sections, events, patterns }, null, 2)}\n`);
console.log(`Generated ${events.length} events, ${events.filter((event) => event.patternKind === 'burst').length} bursts, ${events.filter((event) => event.patternKind === 'offbeat').length / events.length * 100}% offbeat at ${bpm} BPM.`);
