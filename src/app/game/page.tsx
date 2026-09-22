import Link from 'next/link';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { GameViewport } from '@/components/game/GameViewport';
import { PhaserCanvas } from '@/components/game/PhaserCanvas';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';

export default function GamePage() {
  return (
    <RequireAuth>
      <main className="protected-state game-page">
        <p className="eyebrow">OFFICE RHYTHM MANAGER</p>
        <TutorialOverlay />
        <h1>오늘의 업무 리듬에 맞춰 연주해요</h1>
        <p>스페이스바로 박자를 맞추고, 잠깐 자리를 비울 땐 언제든 멈춰도 괜찮아요.</p>
        <Link href="/leaderboard">순위표로 이동</Link>
        <GameViewport>
          <PhaserCanvas />
        </GameViewport>
      </main>
    </RequireAuth>
  );
}
