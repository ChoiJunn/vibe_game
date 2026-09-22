import { describe, expect, it } from 'vitest';
import type { JudgementResult } from '@/game/judgement/types';
import { getJudgementCue, isNewJudgementEvent } from './JudgementFeedback';

describe('judgement feedback', () => {
  it('uses explicit non-color labels and distinct motion for each judgement', () => {
    const perfect = getJudgementCue('perfect');
    const good = getJudgementCue('good');
    const miss = getJudgementCue('miss');
    expect(perfect.label).toContain('PERFECT');
    expect(good.label).toContain('GOOD');
    expect(miss.label).toContain('MISS');
    expect(new Set([perfect.label, good.label, miss.label]).size).toBe(3);
    expect(perfect.rise).toBeLessThan(0);
    expect(miss.rise).toBeGreaterThan(0);
  });

  it('plays feedback once per chart event, even if snapshot objects are recreated', () => {
    const first = { eventId: 'event-01', judgement: 'perfect', errorMs: 0 } as JudgementResult;
    const repeated = { ...first };
    expect(isNewJudgementEvent(undefined, first)).toBe(true);
    expect(isNewJudgementEvent(first.eventId, repeated)).toBe(false);
    expect(isNewJudgementEvent(first.eventId, { ...first, eventId: 'event-02' })).toBe(true);
  });
});
