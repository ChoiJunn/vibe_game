import { LoginButton } from '@/components/auth/LoginButton';
import { RhythmStagePreview } from '@/components/game/RhythmStagePreview';
import { GameViewport } from '@/components/game/GameViewport';

export default function HomePage() {
  return (
    <main className="page-shell page-shell--home">
      <GameViewport className="game-frame--home">
        <section className="game-frame-content landing-stage" aria-labelledby="game-title">
          <RhythmStagePreview className="landing-stage__preview" />
          <div className="landing-stage__vignette" aria-hidden="true" />

          <div className="landing-content">
            <p className="eyebrow">OFFICE RHYTHM MANAGER · STAGE 01</p>
            <h1 id="game-title">오늘의 업무 리듬을 완성해요</h1>
            <p className="landing-copy">스페이스바로 박자를 맞추고 오늘의 업무를 연주해 보세요.</p>
            <LoginButton />
            <div className="landing-stats" aria-label="게임 정보">
              <span><strong>06</strong><small>업무 장면</small></span>
              <span><strong>180</strong><small>리듬 노트</small></span>
              <span><strong>5</strong><small>하트</small></span>
            </div>
          </div>
        </section>
      </GameViewport>
    </main>
  );
}
