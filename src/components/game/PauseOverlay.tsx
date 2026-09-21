'use client';

import type { RunState } from '@/domain/rhythm';
import type { PauseReason } from '@/game/pause/PauseCoordinator';

const REASON_LABELS: Record<PauseReason, string> = {
  button: '일시정지 버튼을 눌렀습니다.',
  escape: 'Esc 입력으로 게임을 멈췄습니다.',
  visibility: '다른 탭으로 이동해 게임을 멈췄습니다.',
  blur: '브라우저 창이 포커스를 잃어 게임을 멈췄습니다.',
  'browser-back': '뒤로가기를 눌러 현재 게임을 보호했습니다.',
};

export function PauseOverlay({
  paused,
  reason,
  snapshot,
  onResume,
  onAbandon,
}: {
  paused: boolean;
  reason?: PauseReason;
  snapshot?: RunState;
  onResume: () => void;
  onAbandon: () => void;
}) {
  if (!paused || !snapshot) {
    return null;
  }

  return (
    <div className="pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div className="pause-card">
        <p className="eyebrow">GAME PAUSED</p>
        <h2 id="pause-title">잠시 멈췄어요</h2>
        <p>{reason ? REASON_LABELS[reason] : '현재 진행 상태를 안전하게 보존했습니다.'}</p>
        <div className="pause-stats" aria-label="일시정지 시점 기록">
          <span>점수 {snapshot.score}</span>
          <span>콤보 {snapshot.combo}</span>
          <span>하트 {snapshot.hearts}/5</span>
          <span>진행 {snapshot.nextEventIndex}/12</span>
        </div>
        <div className="pause-actions">
          <button type="button" className="primary" onClick={onResume}>이어하기</button>
          <button type="button" onClick={onAbandon}>게임 나가기</button>
        </div>
      </div>
    </div>
  );
}
