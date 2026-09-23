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
          <div>
            <p className="eyebrow">OFFICE RHYTHM MANAGER · STAGE 01</p>
            <h1>오늘의 업무 리듬에 맞춰 연주해요</h1>
            <p>스페이스바로 박자를 맞추고, 잠깐 자리를 비울 땐 언제든 멈춰도 괜찮아요.</p>
          </div>
          <div className="game-page__actions">
            <span className="game-key-hint"><kbd>SPACE</kbd> 리듬 플레이</span>
            <Link className="game-link-pill" href="/leaderboard">순위표 보기 <span aria-hidden="true">↗</span></Link>
          </div>
        </header>
        <p className="eyebrow">OFFICE RHYTHM MANAGER</p>
        <TutorialOverlay />
        <h1>오늘의 업무 리듬에 맞춰 연주해요</h1>
        <p>스페이스바로 박자를 맞추고, 잠깐 자리를 비울 땐 언제든 멈춰도 괜찮아요.</p>
        <Link href="/leaderboard">순위표로 이동</Link>
        <div className="game-stage-shell">
          <div className="game-stage-shell__topline"><span>OFFICE MORNING MIX</span><span>06 SCENES <i /> 96 BEATS</span></div>
        <GameViewport className="game-frame--stage">
          <PhaserCanvas />
        </GameViewport>
          <div className="game-stage-shell__footer">
            <span><b className="legend-dot legend-dot--yellow" /> 타이밍에 맞춰 누르기</span>
            <span><b className="legend-dot legend-dot--mint" /> 길게 누르면 HOLD</span>
            <span><b className="legend-dot legend-dot--coral" /> 하트가 모두 사라지면 종료</span>
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}
