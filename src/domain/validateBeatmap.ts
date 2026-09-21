import { SECTION_ORDER, type Beatmap, type RhythmEvent, type SectionId } from './rhythm';

export class BeatmapValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BeatmapValidationError';
  }
}

function isSectionId(value: unknown): value is SectionId {
  return typeof value === 'string' && SECTION_ORDER.includes(value as SectionId);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new BeatmapValidationError(message);
  }
}

function validateEvent(event: RhythmEvent, index: number, sections: Beatmap['sections']): void {
  assert(event && typeof event === 'object', `events[${index}] must be an object`);
  assert(typeof event.id === 'string' && event.id.length > 0, `events[${index}].id is required`);
  assert(event.type === 'tap' || event.type === 'hold', `events[${index}].type is invalid`);
  assert(Number.isInteger(event.startMs) && event.startMs >= 0, `events[${index}].startMs is invalid`);
  assert(isSectionId(event.section), `events[${index}].section is invalid`);

  if (event.type === 'hold') {
    const endMs = event.endMs;
    assert(typeof endMs === 'number' && Number.isInteger(endMs), `events[${index}].endMs is required for hold`);
    assert(endMs > event.startMs, `events[${index}].endMs must be after startMs`);
  } else {
    assert(event.endMs === undefined, `events[${index}].endMs is only valid for hold`);
  }

  const section = sections.find((candidate) => candidate.id === event.section && event.startMs >= candidate.startMs && event.startMs < candidate.endMs);
  assert(section, `events[${index}] must be inside its section`);
  assert((event.endMs ?? event.startMs) <= section.endMs, `events[${index}] must end inside its section`);
}

export function validateBeatmap(input: unknown): Beatmap {
  assert(input && typeof input === 'object', 'beatmap must be an object');
  const beatmap = input as Partial<Beatmap>;
  assert(beatmap.id === 'office-day-01', 'beatmap id must be office-day-01');
  assert(beatmap.bpm === 110, 'beatmap bpm must be 110');
  assert(Array.isArray(beatmap.timeSignature) && beatmap.timeSignature[0] === 4 && beatmap.timeSignature[1] === 4, 'time signature must be 4/4');
  assert(Array.isArray(beatmap.sections) && beatmap.sections.length === SECTION_ORDER.length, 'beatmap must contain six sections');
  assert(Array.isArray(beatmap.events), 'beatmap events are required');

  const sections = beatmap.sections;
  sections.forEach((section, index) => {
    assert(section && isSectionId(section.id), `sections[${index}].id is invalid`);
    assert(Number.isInteger(section.startMs) && Number.isInteger(section.endMs), `sections[${index}] times must be integers`);
    assert(section.endMs > section.startMs, `sections[${index}] must have positive duration`);
    assert(section.id === SECTION_ORDER[index], `sections[${index}] is out of order`);
    if (index === 0) {
      assert(section.startMs === 0, 'first section must start at zero');
    } else {
      assert(section.startMs === sections[index - 1].endMs, `sections[${index}] must be contiguous`);
    }
  });

  const ids = new Set<string>();
  let previousStartMs = -1;
  beatmap.events.forEach((event, index) => {
    assert(!ids.has(event.id), `duplicate event id: ${event.id}`);
    ids.add(event.id);
    assert(event.startMs >= previousStartMs, `events[${index}] are out of order`);
    previousStartMs = event.startMs;
    validateEvent(event, index, sections);
  });

  return beatmap as Beatmap;
}
