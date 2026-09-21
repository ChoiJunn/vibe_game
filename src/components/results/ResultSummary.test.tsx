import { describe, expect, it } from 'vitest';
import { createInitialRunState } from '@/game/state/reduceRunState';
import { ResultSummary } from './ResultSummary';

describe('ResultSummary', () => {
  it('exposes completed and failed status data for the result view', () => {
    const completed = { ...createInitialRunState({ runId: 'run-01', userOid: 'user-01', beatmapId: 'office-day-01' }), status: 'completed' as const, score: 420, maxCombo: 6 };
    const failed = { ...completed, status: 'failed' as const, hearts: 0 };

    expect(ResultSummary({ runState: completed, elapsedMs: 65_000 }).props.children).toBeTruthy();
    expect(ResultSummary({ runState: failed, elapsedMs: 20_000 }).props.children).toBeTruthy();
  });
});
