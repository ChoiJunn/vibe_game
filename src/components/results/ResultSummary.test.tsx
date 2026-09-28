import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialRunState } from '@/game/state/reduceRunState';
import { ResultSummary } from './ResultSummary';

describe('ResultSummary', () => {
  it('exposes completed and failed status data for the result view', () => {
    const completed = { ...createInitialRunState({ runId: 'run-01', userOid: 'user-01', beatmapId: 'office-day-01' }), status: 'completed' as const, score: 420, maxCombo: 6 };
    const failed = { ...completed, status: 'failed' as const, hearts: 0 };

    expect(ResultSummary({ runState: completed, elapsedMs: 65_000 }).props.children).toBeTruthy();
    expect(ResultSummary({ runState: failed, elapsedMs: 20_000 }).props.children).toBeTruthy();
  });

  it('clearly distinguishes a local recovery copy from a server-saved result', () => {
    const failed = { ...createInitialRunState({ runId: 'run-02', userOid: 'user-01', beatmapId: 'office-day-01' }), status: 'failed' as const };
    const markup = renderToStaticMarkup(<ResultSummary runState={failed} elapsedMs={0} submissionError unsavedResultRetained />);

    expect(markup).toContain('복구용 사본을 이 브라우저에 24시간 보관 중');
    expect(markup).toContain('순위표에는 반영되지 않았습니다');
    expect(markup).toContain('role="alert"');
  });

  it('reports when local storage could not retain a failed result', () => {
    const failed = { ...createInitialRunState({ runId: 'run-03', userOid: 'user-01', beatmapId: 'office-day-01' }), status: 'failed' as const };
    const markup = renderToStaticMarkup(<ResultSummary runState={failed} elapsedMs={0} submissionError />);

    expect(markup).toContain('복구용 사본은 보관하지 못했습니다');
  });
});
