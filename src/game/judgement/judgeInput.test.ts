import { describe, expect, it } from 'vitest';
import { combineHoldJudgements, judgeHoldEnd, judgeHoldStart, judgeTap } from './judgeInput';

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
});
