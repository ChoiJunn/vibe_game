import type { RunState } from '@/domain/rhythm';

export type VerifiedInputEvent = {
  eventId: string;
  clientSequence: number;
  type: 'keydown' | 'keyup' | 'auto-miss';
  /** Required only when type is auto-miss; enforced by validateEvents. */
  chartEventId?: string;
  songPositionMs: number;
  /** Physical key offset; forbidden for auto-miss records. */
  inputOffsetMs?: number;
  receivedAt: string;
};

export type TerminalRunStatus = 'completed' | 'failed' | 'abandoned';
export type StoredCosmosDocument<T> = T & { _etag: string; _ts?: number };

export type GameSessionDocument = {
  id: string;
  type: 'gameSession';
  userOid: string;
  tenantId: string;
  beatmapId: 'office-day-01';
  status: 'active' | 'paused';
  terminalStatus?: TerminalRunStatus;
  snapshot: RunState;
  inputEvents: VerifiedInputEvent[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  ttl?: number;
};

export type ActiveSessionLockDocument = {
  id: '__active__';
  type: 'activeSessionLock';
  userOid: string;
  tenantId: string;
  runId: string;
  createdAt: string;
  updatedAt: string;
};

export type GameResultDocument = {
  id: string;
  type: 'gameResult';
  userOid: string;
  displayName: string;
  beatmapId: string;
  leaderboardKey: string;
  status: TerminalRunStatus;
  score: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  maxCombo: number;
  durationMs: number;
  playedAt: string;
  rawEventArchiveRef?: string;
  schemaVersion: 1;
};

export const RAW_EVENT_RETENTION_SECONDS = 90 * 24 * 60 * 60;
export const LEADERBOARD_TIME_ZONE = 'Asia/Seoul';

export function normalizeLeaderboardKey(value: string): string {
  if (value === 'all-time') return value;
  const match = /^daily:(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('leaderboardKey must be all-time or daily:YYYY-MM-DD.');

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.toISOString().slice(0, 10) !== `${year}-${month}-${day}`) {
    throw new Error('daily leaderboardKey must contain a real calendar date.');
  }
  return value;
}

export function getDailyLeaderboardKey(date: Date, timeZone = LEADERBOARD_TIME_ZONE): string {
  if (!Number.isFinite(date.getTime())) throw new Error('A valid date is required.');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `daily:${values.year}-${values.month}-${values.day}`;
}
