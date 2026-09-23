import { describe, expect, it } from 'vitest';
import beatmapJson from '@/content/beatmaps/office-day-01.json';
import { validateBeatmap, BeatmapValidationError } from './validateBeatmap';

describe('beatmap domain contract', () => {
  it('validates the fixed office day beatmap', () => {
    const beatmap = validateBeatmap(beatmapJson);

    expect(beatmap.id).toBe('office-day-01');
    expect(beatmap.bpm).toBe(155);
    expect(beatmap.timeSignature).toEqual([4, 4]);
    expect(beatmap.sections).toHaveLength(6);
    expect(beatmap.events).toHaveLength(180);
    expect(beatmap.patterns.length).toBeGreaterThan(0);
  });

  it('rejects duplicate event ids and invalid hold timing', () => {
    const duplicate = structuredClone(beatmapJson);
    duplicate.events[1].id = duplicate.events[0].id;

    expect(() => validateBeatmap(duplicate)).toThrow(BeatmapValidationError);

    const invalidHold = structuredClone(beatmapJson);
    const invalidHoldEvent = invalidHold.events.find((event) => event.type === 'hold')!;
    invalidHoldEvent.endMs = invalidHoldEvent.startMs;

    expect(() => validateBeatmap(invalidHold)).toThrow('endMs must be after startMs');
  });

  it('rejects an invalid burst window or pattern reference', () => {
    const invalidBurst = structuredClone(beatmapJson);
    const burst = invalidBurst.events.find((event) => event.type === 'burst')!;
    burst.endMs = burst.startMs + 100;
    expect(() => validateBeatmap(invalidBurst)).toThrow(/burst window/);

    const invalidPattern = structuredClone(beatmapJson);
    invalidPattern.events[0].patternId = 'not-present';
    expect(() => validateBeatmap(invalidPattern)).toThrow(/unknown pattern|does not point/);
  });

  it('rejects sections that are not contiguous and ordered', () => {
    const invalidSections = structuredClone(beatmapJson);
    invalidSections.sections[1].id = 'mail';

    expect(() => validateBeatmap(invalidSections)).toThrow('out of order');
  });
});
