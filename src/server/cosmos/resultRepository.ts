import 'server-only';

import type { Container, SqlQuerySpec } from '@azure/cosmos';
import { CosmosOperationError, getCosmosStatusCode } from './errors';
import { normalizeLeaderboardKey, type GameResultDocument } from './models';

export class ResultRepository {
  constructor(private readonly container: Container) {}

  async insertResult(document: GameResultDocument): Promise<GameResultDocument> {
    validateResult(document);
    try {
      const { resource } = await this.container.items.create(document);
      if (!resource) throw new Error('Cosmos did not return the created result.');
      return resource as GameResultDocument;
    } catch (error) {
      if (getCosmosStatusCode(error) === 409) {
        try {
          const existing = await this.container.item(document.id, document.leaderboardKey).read<GameResultDocument>();
          if (existing.resource && sameAttempt(existing.resource, document)) return existing.resource;
        } catch {
          // Fall through to a generic conflict without exposing stored data.
        }
        throw new CosmosOperationError(409, 'A different result already exists for this run.');
      }
      throw error;
    }
  }

  async queryLeaderboard(leaderboardKeyInput: string, limit = 10): Promise<GameResultDocument[]> {
    const leaderboardKey = normalizeLeaderboardKey(leaderboardKeyInput);
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number.isFinite(limit) ? limit : 10)));
    const query: SqlQuerySpec = {
      query: `SELECT TOP ${safeLimit} * FROM c WHERE c.leaderboardKey = @leaderboardKey AND c.status = @status ORDER BY c.score DESC`,
      parameters: [
        { name: '@leaderboardKey', value: leaderboardKey },
        { name: '@status', value: 'completed' },
      ],
    };
    const { resources } = await this.container.items
      .query<GameResultDocument>(query, { partitionKey: leaderboardKey, maxItemCount: safeLimit })
      .fetchAll();

    return resources
      .filter((result) => result.type === 'gameResult' && result.leaderboardKey === leaderboardKey)
      .sort(compareLeaderboardRows)
      .slice(0, safeLimit);
  }
}

function sameAttempt(left: GameResultDocument, right: GameResultDocument): boolean {
  return left.id === right.id && left.userOid === right.userOid && left.beatmapId === right.beatmapId &&
    left.leaderboardKey === right.leaderboardKey && left.status === right.status && left.score === right.score &&
    left.perfectCount === right.perfectCount && left.goodCount === right.goodCount &&
    left.missCount === right.missCount && left.maxCombo === right.maxCombo && left.durationMs === right.durationMs;
}

function validateResult(document: GameResultDocument): void {
  normalizeLeaderboardKey(document.leaderboardKey);
  if (!document.id || document.type !== 'gameResult' || !document.userOid || !document.displayName || !document.beatmapId) {
    throw new Error('Result identity and display fields are required.');
  }
  if (!['completed', 'failed', 'abandoned'].includes(document.status)) {
    throw new Error('Only terminal game results can be inserted.');
  }
  const counters = [document.score, document.perfectCount, document.goodCount, document.missCount, document.maxCombo, document.durationMs];
  if (counters.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error('Result scores, counts, and duration must be non-negative integers.');
  }
  if (!Number.isFinite(Date.parse(document.playedAt)) || document.schemaVersion !== 1) {
    throw new Error('Result playedAt and schemaVersion are invalid.');
  }
}

function compareLeaderboardRows(left: GameResultDocument, right: GameResultDocument): number {
  return right.score - left.score || left.playedAt.localeCompare(right.playedAt) || left.id.localeCompare(right.id);
}
