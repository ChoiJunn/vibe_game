import 'server-only';

import { getGameContainers } from '@/server/cosmos/containers';
import { getDailyLeaderboardKey, type GameResultDocument, normalizeLeaderboardKey } from '@/server/cosmos/models';
import { ResultRepository } from '@/server/cosmos/resultRepository';

export type LeaderboardScope = 'daily' | 'all-time';
export type LeaderboardPage = {
  items: GameResultDocument[];
  continuationToken?: string;
};

export class LeaderboardService {
  constructor(
    private readonly results: Pick<ResultRepository, 'queryLeaderboard'>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  getLeaderboard(
    scope: LeaderboardScope,
    limit: number,
    continuationToken?: string,
  ): Promise<LeaderboardPage> {
    const key = scope === 'daily'
      ? getDailyLeaderboardKey(this.now())
      : normalizeLeaderboardKey('all-time');
    return this.results.queryLeaderboard(key, limit, continuationToken);
  }
}

let leaderboardService: LeaderboardService | undefined;

export function getLeaderboardService(): LeaderboardService {
  if (!leaderboardService) {
    leaderboardService = new LeaderboardService(new ResultRepository(getGameContainers().results));
  }
  return leaderboardService;
}
