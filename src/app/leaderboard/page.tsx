import Link from 'next/link';
import { RequireAuth } from '@/components/auth/RequireAuth';

export default function LeaderboardPage() {
  return (
    <RequireAuth>
      <main className="protected-state">
        <p className="eyebrow">LEADERBOARD</p>
        <h1>순위표 준비 중입니다.</h1>
        <p>인증이 완료되었습니다. 조직 전체 순위표는 다음 단계에서 연결됩니다.</p>
        <Link href="/game">게임으로 이동</Link>
      </main>
    </RequireAuth>
  );
}
