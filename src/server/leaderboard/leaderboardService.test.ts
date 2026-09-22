import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameResultDocument } from '@/server/cosmos/models';
import { LeaderboardService } from './leaderboardService';

function result(overrides: Partial<GameResultDocument> = {}): GameResultDocument {
  return {
    id: 'attempt-1',
    type: 'gameResult',
    userOid: 'user-1',
    displayName: 'Rhythm player',
    beatmapId: 'office-day-01',
    leaderboardKey: 'all-time',
    status: 'completed',
    score: 420,
    perfectCount: 4,
    goodCount: 1,
    missCount: 0,
    maxCombo: 4,
    durationMs: 60000,
    playedAt: '2026-09-22T00:00:00.000Z',
    schemaVersion: 1,
    ...overrides,
  };
}

describe('LeaderboardService', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('queries the UTC daily partition and preserves the opaque continuation token', async () => {
    const page = { items: [result({ leaderboardKey: 'daily:2026-09-22' })], continuationToken: 'opaque/next' };
    const queryLeaderboard = vi.fn().mockResolvedValue(page);
    const service = new LeaderboardService({ queryLeaderboard }, () => new Date('2026-09-22T23:59:59.000Z'));

    await expect(service.getLeaderboard('daily', 25, 'opaque/previous')).resolves.toEqual(page);
    expect(queryLeaderboard).toHaveBeenCalledWith('daily:2026-09-22', 25, 'opaque/previous');
  });

  it('queries all attempts from the all-time partition, including non-completed statuses', async () => {
    const failedAttempt = result({ status: 'failed' });
    const queryLeaderboard = vi.fn().mockResolvedValue({ items: [failedAttempt] });
    const service = new LeaderboardService({ queryLeaderboard });

    await expect(service.getLeaderboard('all-time', 50)).resolves.toEqual({ items: [failedAttempt] });
    expect(queryLeaderboard).toHaveBeenCalledWith('all-time', 50, undefined);
  });
});
