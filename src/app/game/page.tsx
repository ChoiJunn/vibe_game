import Link from 'next/link';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { GameViewport } from '@/components/game/GameViewport';
import { PhaserCanvas } from '@/components/game/PhaserCanvas';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';

export default function GamePage() {
  return (
    <RequireAuth>
      <main className="protected-state game-page">
        <header className="game-page__heading">
          <div className="game-page__intro">
            <p className="eyebrow">OFFICE RHYTHM MANAGER · STAGE 01</p>
            <h1>오늘의 업무 리듬을 연주해요</h1>
            <p><kbd>SPACE</kbd> 박자에 맞춰 업무를 처리하세요</p>
          </div>
          <div className="game-page__actions">
            <span className="game-key-hint"><kbd>SPACE</kbd> 리듬 플레이</span>
            <Link className="game-link-pill" href="/leaderboard">순위표 <span aria-hidden="true">↗</span></Link>
          </div>
        </header>

        <TutorialOverlay />

        <section className="game-stage-shell" aria-label="Office Morning 게임 스테이지">
          <div className="game-stage-shell__topline">
            <span>OFFICE MORNING MIX</span>
            <span>06 SCENES <i /> 180 BEATS</span>
          </div>
          <GameViewport className="game-frame--stage">
            <PhaserCanvas />
          </GameViewport>
          <div className="game-stage-shell__footer">
            <span><b className="legend-dot legend-dot--yellow" /> 타이밍에 맞춰 누르기</span>
            <span><b className="legend-dot legend-dot--mint" /> 길게 누르면 HOLD</span>
            <span><b className="legend-dot legend-dot--coral" /> 하트가 모두 사라지면 종료</span>
          </div>
        </section>
      </main>
    </RequireAuth>
  );
}
