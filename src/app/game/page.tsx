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
          </div>
          <div className="game-page__actions">
            <span className="game-key-hint"><kbd>SPACE</kbd> 박자 맞추기</span>
            <span className="game-stage-meta">06 SCENES · 180 BEATS</span>
            <div className="game-page__settings-host" id="game-audio-settings-host" />
            <Link className="game-link-pill" href="/leaderboard">순위표 <span aria-hidden="true">↗</span></Link>
          </div>
        </header>

        <TutorialOverlay />

        <section className="game-stage-shell" aria-label="Office Morning 게임 스테이지">
          <GameViewport className="game-frame--stage">
            <PhaserCanvas />
          </GameViewport>
        </section>
      </main>
    </RequireAuth>
  );
}
