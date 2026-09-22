import { describe, expect, it } from 'vitest';
import type { RhythmGameSnapshot } from '@/game/RhythmGameController';
import { getHudProgress } from './GameHud';

describe('GameHud progress', () => {
  it('shows the run chart total instead of a fixed event count', () => {
    const snapshot = {
      clockState: 'playing',
      songPositionMs: 12_000,
      runState: { nextEventIndex: 14 },
      events: [],
      totalEvents: 96,
      section: 'keyboard',
    } as unknown as RhythmGameSnapshot;

    expect(getHudProgress(snapshot)).toBe('PLAYING  ·  14/96');
  });
});
