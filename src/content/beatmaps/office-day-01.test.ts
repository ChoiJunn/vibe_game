import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';
import beatmapJson from './office-day-01.json';
import beatmapSchema from './beatmap.schema.json';
import { validateBeatmap } from '@/domain/validateBeatmap';

describe('office-day-01 beatmap', () => {
  it('matches the JSON Schema and domain invariants', () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    const validateSchema = ajv.compile(beatmapSchema);

    expect(validateSchema(beatmapJson), JSON.stringify(validateSchema.errors)).toBe(true);
    expect(() => validateBeatmap(beatmapJson)).not.toThrow();
  });

  it('contains a two-minute, 96-event chart with a rising section density', () => {
    const beatmap = validateBeatmap(beatmapJson);
    const counts = Object.fromEntries(beatmap.sections.map((section) => [
      section.id,
      beatmap.events.filter((event) => event.section === section.id).length,
    ]));

    expect(beatmap.sections.map(({ startMs, endMs }) => [startMs, endMs])).toEqual([
      [0, 19_636], [19_636, 39_273], [39_273, 58_909],
      [58_909, 78_545], [78_545, 98_182], [98_182, 120_000],
    ]);
    expect(beatmap.events).toHaveLength(96);
    expect(counts).toEqual({ arrival: 12, keyboard: 14, mail: 15, meeting: 16, copy: 18, departure: 21 });
    expect(beatmap.events.map((event) => event.startMs)).toEqual(
      [...beatmap.events.map((event) => event.startMs)].sort((left, right) => left - right),
    );
    expect(new Set(beatmap.events.map((event) => event.id)).size).toBe(96);
    for (const event of beatmap.events) {
      const section = beatmap.sections.find(({ id }) => id === event.section);
      expect(section).toBeDefined();
      expect(event.startMs).toBeGreaterThanOrEqual(section!.startMs);
      expect(event.startMs).toBeLessThan(section!.endMs);
      if (event.type === 'hold') {
        expect(event.endMs).toBeDefined();
        expect(event.endMs!).toBeGreaterThan(event.startMs);
        expect(event.endMs!).toBeLessThanOrEqual(section!.endMs);
      }
    }
  });

  it('rejects charts outside the supported event count and exact duration', () => {
    expect(() => validateBeatmap({ ...beatmapJson, events: beatmapJson.events.slice(0, 89) })).toThrow(/90 and 120/);
    const sections = beatmapJson.sections.map((section) => ({ ...section }));
    sections[sections.length - 1].endMs += 1;
    expect(() => validateBeatmap({ ...beatmapJson, sections })).toThrow(/chart boundaries/);
  });
});
