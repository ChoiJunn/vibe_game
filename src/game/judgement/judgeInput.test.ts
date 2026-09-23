import { describe, expect, it } from 'vitest';
import { combineHoldJudgements, judgeBurst, judgeHoldEnd, judgeHoldStart, judgeTap } from './judgeInput';

describe('judgeInput', () => {
  it('uses inclusive 80ms Perfect and 160ms Good boundaries', () => {
    const event = { id: 'tap-01', type: 'tap' as const, startMs: 1000 };

    expect(judgeTap(event, { type: 'keydown', songPositionMs: 1080 }).judgement).toBe('perfect');
    expect(judgeTap(event, { type: 'keydown', songPositionMs: 1160 }).judgement).toBe('good');
    expect(judgeTap(event, { type: 'keydown', songPositionMs: 1161 }).judgement).toBe('miss');
  });

  it('applies input offset to the song position', () => {
    const event = { id: 'tap-02', type: 'tap' as const, startMs: 1000 };

    expect(judgeTap(event, { type: 'keydown', songPositionMs: 930 }, 70).judgement).toBe('perfect');
  });

  it('judges hold start and end independently and combines the worse result', () => {
    const event = { id: 'hold-01', type: 'hold' as const, startMs: 1000, endMs: 2000 };
    const start = judgeHoldStart(event, { type: 'keydown', songPositionMs: 1000 });
    const end = judgeHoldEnd(event, { type: 'keyup', songPositionMs: 2161 });

    expect(start.judgement).toBe('perfect');
    expect(end.judgement).toBe('miss');
    expect(combineHoldJudgements(start, end).combined.judgement).toBe('miss');
  });

  it('judges a complete burst by its authored start and end edges', () => {
    const event = { id: 'burst-01', type: 'burst' as const, startMs: 1000, endMs: 1500, requiredPresses: 3 };
    const result = judgeBurst(event, [
      { type: 'keydown', songPositionMs: 1000 }, { type: 'keyup', songPositionMs: 1030 },
      { type: 'keydown', songPositionMs: 1180 }, { type: 'keyup', songPositionMs: 1200 },
      { type: 'keydown', songPositionMs: 1460 }, { type: 'keyup', songPositionMs: 1500 },
    ]);

    expect(result).toMatchObject({ judgement: 'perfect', completedPresses: 3, requiredPresses: 3, eventId: 'burst-01' });
  });

  it('misses an incomplete, duplicated, or late burst', () => {
    const event = { id: 'burst-02', type: 'burst' as const, startMs: 1000, endMs: 1500, requiredPresses: 3 };
    const incomplete = judgeBurst(event, [
      { type: 'keydown', songPositionMs: 1000 }, { type: 'keyup', songPositionMs: 1050 },
      { type: 'keydown', songPositionMs: 1200 }, { type: 'keyup', songPositionMs: 1250 },
    ]);
    const duplicated = judgeBurst(event, [
      { type: 'keydown', songPositionMs: 1000 }, { type: 'keydown', songPositionMs: 1020 },
      { type: 'keyup', songPositionMs: 1050 }, { type: 'keyup', songPositionMs: 1100 },
      { type: 'keydown', songPositionMs: 1200 }, { type: 'keyup', songPositionMs: 1250 },
    ]);
    const late = judgeBurst(event, [
      { type: 'keydown', songPositionMs: 1300 }, { type: 'keyup', songPositionMs: 1400 },
      { type: 'keydown', songPositionMs: 1500 }, { type: 'keyup', songPositionMs: 1600 },
      { type: 'keydown', songPositionMs: 1650 }, { type: 'keyup', songPositionMs: 1700 },
    ]);

    expect(incomplete.judgement).toBe('miss');
    expect(duplicated.judgement).toBe('miss');
    expect(late.judgement).toBe('miss');
  });
});
