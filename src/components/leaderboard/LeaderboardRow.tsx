import type { GameResultDocument } from '@/server/cosmos/models';

const statusLabels: Record<GameResultDocument['status'], string> = {
  completed: '완주',
  failed: '실패',
  abandoned: '중도 포기',
};

export function LeaderboardRow({ result, rank }: Readonly<{ result: GameResultDocument; rank: number }>) {
  const playedAt = new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(result.playedAt));
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <tr>
      <td><span className={`leaderboard-rank ${rank <= 3 ? 'leaderboard-podium' : ''}`}>{rank <= 3 ? medals[rank - 1] : rank}</span></td>
      <td className={'leaderboard-player'}>{result.displayName}</td>
      <td className={'leaderboard-score'}>{result.score.toLocaleString('ko-KR')}</td>
      <td>{result.perfectCount.toLocaleString('ko-KR')}</td>
      <td>{(result.durationMs / 1000).toFixed(1)}초</td>
      <td><span className={`leaderboard-status status-${result.status}`}>{statusLabels[result.status]}</span></td>
      <td>{playedAt}</td>
    </tr>
  );
}
