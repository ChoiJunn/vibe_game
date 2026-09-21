import { describe, expect, it } from 'vitest';
import beatmapJson from '@/content/beatmaps/office-day-01.json';
import { validateBeatmap, BeatmapValidationError } from './validateBeatmap';

describe('beatmap domain contract', () => {
  it('validates the fixed office day beatmap', () => {
    const beatmap = validateBeatmap(beatmapJson);

    expect(beatmap.id).toBe('office-day-01');
    expect(beatmap.bpm).toBe(110);
    expect(beatmap.timeSignature).toEqual([4, 4]);
    expect(beatmap.sections).toHaveLength(6);
    expect(beatmap.events).toHaveLength(12);
  });

  it('rejects duplicate event ids and invalid hold timing', () => {
    const duplicate = structuredClone(beatmapJson);
    duplicate.events[1].id = duplicate.events[0].id;

    expect(() => validateBeatmap(duplicate)).toThrow(BeatmapValidationError);

    const invalidHold = structuredClone(beatmapJson);
    invalidHold.events[1].endMs = invalidHold.events[1].startMs;

    expect(() => validateBeatmap(invalidHold)).toThrow('endMs must be after startMs');
  });

  it('rejects sections that are not contiguous and ordered', () => {
    const invalidSections = structuredClone(beatmapJson);
    invalidSections.sections[1].id = 'mail';

    expect(() => validateBeatmap(invalidSections)).toThrow('out of order');
  });
});
