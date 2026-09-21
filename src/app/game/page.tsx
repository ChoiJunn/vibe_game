import Link from 'next/link';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { GameViewport } from '@/components/game/GameViewport';
import { PhaserCanvas } from '@/components/game/PhaserCanvas';

export default function GamePage() {
  return (
    <RequireAuth>
      <main className="protected-state game-page">
        <p className="eyebrow">OFFICE RHYTHM MANAGER</p>
        <h1>게임 화면 준비 중입니다.</h1>
        <p>인증이 완료되었습니다. 실제 리듬 플레이는 다음 단계에서 연결됩니다.</p>
        <Link href="/leaderboard">순위표로 이동</Link>
        <GameViewport>
          <PhaserCanvas />
        </GameViewport>
      </main>
    </RequireAuth>
  );
}
