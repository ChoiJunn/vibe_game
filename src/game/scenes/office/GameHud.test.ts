import { describe, expect, it } from 'vitest';
import type { RhythmGameSnapshot } from '@/game/RhythmGameController';
import { getHudLines, getHudProgress } from './GameHud';

describe('GameHud', () => {
  it('shows the actual event total instead of a fixed count', () => {
    const snapshot = {
      clockState: 'playing',
      runState: { hearts: 5, score: 0, combo: 0, nextEventIndex: 14 },
      totalEvents: 96,
    } as unknown as RhythmGameSnapshot;
    expect(getHudProgress(snapshot)).toBe('PLAYING | 14/96');
  });

  it('shows accurate hearts, score, combo, multiplier and paused progress', () => {
    const snapshot = {
      clockState: 'paused',
      runState: { hearts: 3, score: 1240, combo: 20, nextEventIndex: 48 },
      totalEvents: 96,
    } as unknown as RhythmGameSnapshot;
    expect(getHudLines(snapshot)).toEqual([
      'HEARTS  3/5',
      'SCORE  01240   COMBO  20   x1.2',
      'PAUSED | 48/96',
    ]);
  });
});
