import type { GameResultDocument } from '@/server/cosmos/models';
import { LeaderboardRow } from './LeaderboardRow';

export function LeaderboardTable({ items }: Readonly<{ items: GameResultDocument[] }>) {
  return (
    <div className={'leaderboard-table-wrap'}>
      <table className={'leaderboard-table'}>
        <thead><tr>
          <th scope={'col'}>순위</th><th scope={'col'}>플레이어</th><th scope={'col'}>점수</th>
          <th scope={'col'}>PERFECT</th><th scope={'col'}>시간</th><th scope={'col'}>결과</th><th scope={'col'}>플레이 일시</th>
        </tr></thead>
        <tbody>{items.map((item, index) => <LeaderboardRow key={item.id} result={item} rank={index + 1} />)}</tbody>
      </table>
    </div>
  );
}
