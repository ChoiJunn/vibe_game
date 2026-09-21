import { describe, expect, it } from 'vitest';
import { createEmptyScoreResult } from './score';

describe('score domain contract', () => {
  it('creates a neutral result with all counters reset', () => {
    expect(createEmptyScoreResult()).toEqual({
      score: 0,
      perfectCount: 0,
      goodCount: 0,
      missCount: 0,
      maxCombo: 0,
      durationMs: 0,
      status: 'abandoned',
      breakdown: [],
    });
  });
});
