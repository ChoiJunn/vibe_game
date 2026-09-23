import { LoginButton } from '@/components/auth/LoginButton';
import { GameViewport } from '@/components/game/GameViewport';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="page-shell page-shell--home">
      <GameViewport className="game-frame--home">
        <section className="game-frame-content landing-stage" aria-labelledby="game-title">
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
          <div className="landing-stats" aria-label="게임 정보">
            <span><strong>06</strong><small>업무 장면</small></span>
            <span><strong>180</strong><small>리듬 노트</small></span>
            <span><strong>5</strong><small>하트</small></span>
          </div>
          <p className="setup-note">조직 계정으로 로그인하면 게임과 순위표를 이용할 수 있습니다.</p>
        </div>

        <div className="landing-scene" aria-hidden="true">
          <div className="landing-scene__glow" />
          <Image className="landing-scene__background" src="/game/art/background/arrival.png" alt="" width={1280} height={720} priority />
          <div className="landing-scene__label"><span>OFFICE MORNING</span><strong>출근길의 첫 박자</strong></div>
          <Image className="landing-scene__character" src="/game/art/character/protagonist-perfect.png" alt="" width={320} height={320} priority />
          <Image className="landing-scene__moka" src="/game/art/mascot/moka-perfect.png" alt="" width={128} height={128} priority />
          <span className="landing-scene__note landing-scene__note--one">♪</span>
          <span className="landing-scene__note landing-scene__note--two">✦</span>
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
