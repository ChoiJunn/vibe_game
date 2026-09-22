import Link from 'next/link';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { LeaderboardTabs } from '@/components/leaderboard/LeaderboardTabs';

export default function LeaderboardPage() {
  return (
    <RequireAuth>
      <main className={'leaderboard-page'}>
        <header className={'leaderboard-heading'}>
          <Link className={'leaderboard-back'} href={'/game'}>← 게임으로 돌아가기</Link>
          <p className={'eyebrow'}>OFFICE RHYTHM CLUB</p>
          <h1>오늘의 리듬 기록</h1>
          <p>완벽한 박자도, 아슬아슬한 도전도 모두 기록으로 남아요.</p>
        </header>
        <LeaderboardTabs />
      </main>
    </RequireAuth>
  );
}
