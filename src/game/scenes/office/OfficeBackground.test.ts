import { describe, expect, it } from 'vitest';
import { getCrossfadeProgress, getJourneyPanOffset } from './OfficeBackground';

describe('OfficeBackground journey timing', () => {
  it('uses song position for a bounded parallax offset', () => {
    expect(getJourneyPanOffset(0)).toBeCloseTo(0);
    expect(getJourneyPanOffset(3_000)).toBeCloseTo(14);
    expect(getJourneyPanOffset(9_000)).toBeCloseTo(-14);
  });

  it('crossfades on the song clock and clamps at both ends', () => {
    expect(getCrossfadeProgress(4_000, 5_000)).toBe(0);
    expect(getCrossfadeProgress(5_380, 5_000)).toBeCloseTo(0.5);
    expect(getCrossfadeProgress(6_000, 5_000)).toBe(1);
  });
});
