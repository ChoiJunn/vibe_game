import { describe, expect, it } from 'vitest';
import { getCrossfadeProgress, getJourneyPanOffset, isFeverActiveAt } from './OfficeBackground';

describe('OfficeBackground journey timing', () => {
  it('uses song position for a bounded parallax offset', () => {
    expect(getJourneyPanOffset(0)).toBeCloseTo(0);
    expect(getJourneyPanOffset(3_000)).toBeCloseTo(14);
    expect(getJourneyPanOffset(9_000)).toBeCloseTo(-14);
  });

  it('increases motion with combo and softens it briefly after Miss', () => {
    const calm = getJourneyPanOffset(3_000, 0);
    expect(getJourneyPanOffset(3_000, 10)).toBeGreaterThan(calm);
    expect(getJourneyPanOffset(3_000, 20)).toBeGreaterThan(getJourneyPanOffset(3_000, 10));
    expect(getJourneyPanOffset(3_000, 10, 1)).toBeLessThan(getJourneyPanOffset(3_000, 10));
  });

  it('crossfades on the song clock and clamps at both ends', () => {
    expect(getCrossfadeProgress(4_000, 5_000)).toBe(0);
    expect(getCrossfadeProgress(5_380, 5_000)).toBeCloseTo(0.5);
    expect(getCrossfadeProgress(6_000, 5_000)).toBe(1);
  });

  it('derives the neon stage from the persisted Fever end time', () => {
    expect(isFeverActiveAt(1_000, 9_000)).toBe(true);
    expect(isFeverActiveAt(9_000, 9_000)).toBe(false);
  });
});
