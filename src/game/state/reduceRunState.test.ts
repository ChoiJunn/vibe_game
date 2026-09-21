import { describe, expect, it } from 'vitest';
import type { JudgementResult } from '@/game/judgement/types';
import { createInitialRunState, reduceRunState } from './reduceRunState';
import { calculateJudgementScore, getComboMultiplier } from './scorePolicy';

function result(judgement: JudgementResult['judgement'], eventId = 'event-01'): JudgementResult {
  return { judgement, errorMs: 0, eventId };
}

describe('reduceRunState', () => {
  it('applies score and multiplier after the judgement combo increments', () => {
    expect(getComboMultiplier(10)).toBe(1.1);
    expect(calculateJudgementScore(result('perfect'), 10)).toBe(110);

    const state = createInitialRunState({ runId: 'run-01', userOid: 'user-01', beatmapId: 'office-day-01' });
    const next = reduceRunState(state, { result: result('perfect'), eventIndex: 0, songPositionMs: 100 });

    expect(next.score).toBe(100);
    expect(next.combo).toBe(1);
    expect(next.perfectCount).toBe(1);
  });

  it('restores one heart at every ten consecutive Perfect results, capped at five', () => {
    let state = createInitialRunState({ runId: 'run-02', userOid: 'user-01', beatmapId: 'office-day-01', hearts: 3 });

    for (let index = 0; index < 10; index += 1) {
      state = reduceRunState(state, {
        result: result('perfect', `event-${index}`),
        eventIndex: index,
        songPositionMs: index * 100,
      });
    }

    expect(state.hearts).toBe(4);
    expect(state.consecutivePerfects).toBe(10);
  });

  it('resets combo on Good and fails when a Miss removes the last heart', () => {
    let state = createInitialRunState({ runId: 'run-03', userOid: 'user-01', beatmapId: 'office-day-01', hearts: 1 });
    state = reduceRunState(state, { result: result('perfect'), eventIndex: 0, songPositionMs: 100 });
    state = reduceRunState(state, { result: result('good', 'event-02'), eventIndex: 1, songPositionMs: 200 });

    expect(state.combo).toBe(2);
    expect(state.consecutivePerfects).toBe(0);

    state = reduceRunState(state, { result: result('miss', 'event-03'), eventIndex: 2, songPositionMs: 300 });
    expect(state.status).toBe('failed');
    expect(state.hearts).toBe(0);
    expect(state.combo).toBe(0);
  });

  it('ignores duplicate or out-of-order event results and completes on the final event', () => {
    const state = createInitialRunState({ runId: 'run-04', userOid: 'user-01', beatmapId: 'office-day-01' });
    const action = { result: result('perfect'), eventIndex: 0, songPositionMs: 100 };
    const next = reduceRunState(state, action);

    expect(reduceRunState(next, action)).toEqual(next);
    expect(reduceRunState(next, { result: result('perfect', 'event-03'), eventIndex: 2, songPositionMs: 300 })).toEqual(next);

    const completed = reduceRunState(next, {
      result: result('good', 'event-02'),
      eventIndex: 1,
      isFinalEvent: true,
      finalEventEndMs: 200,
      songPositionMs: 200,
    });
    expect(completed.status).toBe('completed');
  });
});
