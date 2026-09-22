import type { RunState } from '@/domain/rhythm';
import { getComboMultiplier } from '@/game/state/scorePolicy';
import { RunStatusBadge } from './RunStatusBadge';

export function ResultSummary({
  runState,
  elapsedMs,
  pendingSubmission = true,
  submissionError = false,
  onPlayAgain,
  playAgainDisabled = false,
  playAgainLabel = '다시 플레이',
  onExit,
  exitError,
  exitDisabled = false,
  exitLabel = '\uc0c8 \uac8c\uc784',
}: {
  runState: RunState;
  elapsedMs: number;
  pendingSubmission?: boolean;
  submissionError?: boolean;
  onPlayAgain?: () => void;
  playAgainDisabled?: boolean;
  playAgainLabel?: string;
  onExit?: () => void;
  exitError?: string;
  exitDisabled?: boolean;
  exitLabel?: string;
}) {
  const elapsedSeconds = Math.max(0, Math.round(elapsedMs / 1000));

  return (
    <section className={'result-summary'} aria-labelledby={'result-title'}>
      <div className={'result-card'}>
        <p className={'eyebrow'}>RUN SUMMARY</p>
        <div className={'result-heading'}>
          <h2 id={'result-title'}>오늘의 업무 리듬 결과</h2>
          <RunStatusBadge status={runState.status} />
        </div>
        <div className={'result-score'}>{runState.score.toLocaleString()}<small> points</small></div>
        <div className={'result-grid'}>
          <span>Perfect <strong>{runState.perfectCount}</strong></span>
          <span>Good <strong>{runState.goodCount}</strong></span>
          <span>Miss <strong>{runState.missCount}</strong></span>
          <span>최고 콤보 <strong>{runState.maxCombo}</strong></span>
          <span>최종 배율 <strong>x{getComboMultiplier(runState.combo).toFixed(1)}</strong></span>
          <span>플레이 시간 <strong>{Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}</strong></span>
        </div>
        <p className={'result-submission'} role={submissionError ? 'alert' : 'status'}>
          {submissionError ? '결과 저장에 실패했습니다. 연결을 확인하고 다시 플레이를 누르면 저장을 재시도한 뒤 새 게임을 시작합니다.' : pendingSubmission ? '결과를 안전하게 저장하고 있어요…' : '결과가 저장되었습니다.'}
        </p>
        {exitError ? <p className={'result-submission'} role={'alert'}>{exitError}</p> : null}
        <div className={'result-actions'}>
          {onPlayAgain && <button type={'button'} className={'primary'} disabled={playAgainDisabled} onClick={onPlayAgain}>{playAgainLabel}</button>}
          {onExit && <button type={'button'} disabled={exitDisabled} onClick={onExit}>{exitLabel}</button>}
        </div>
      </div>
    </section>
  );
}
