import { LoginButton } from '@/components/auth/LoginButton';
import { GameViewport } from '@/components/game/GameViewport';

export default function HomePage() {
  return (
    <main className="page-shell">
      <GameViewport>
        <section className="game-frame-content" aria-labelledby="game-title">
        <div className="office-window" aria-hidden="true">
          <span className="window-dot window-dot--coral" />
          <span className="window-dot window-dot--yellow" />
          <span className="window-dot window-dot--mint" />
        </div>

        <div className="landing-content">
          <p className="eyebrow">OFFICE RHYTHM MANAGER</p>
          <h1 id="game-title">오늘의 업무 리듬을<br />완성해 보세요.</h1>
          <p className="landing-copy">
            키보드, 메일, 회의, 복사기의 소리를 박자에 맞춰 처리하고
            조직 전체의 기록에 도전하는 오리지널 리듬게임입니다.
          </p>
          <LoginButton />
          <p className="setup-note">조직 계정으로 로그인하면 게임과 순위표를 이용할 수 있습니다.</p>
        </div>

        <div className="office-card office-card--keyboard" aria-hidden="true">
          <span className="office-card__icon">⌨</span>
          <span>키보드 리듬</span>
        </div>
        <div className="office-card office-card--mail" aria-hidden="true">
          <span className="office-card__icon">✉</span>
          <span>메일 박자</span>
        </div>
        <div className="office-card office-card--copy" aria-hidden="true">
          <span className="office-card__icon">▤</span>
          <span>복사 완료</span>
        </div>
        </section>
      </GameViewport>
    </main>
  );
}
