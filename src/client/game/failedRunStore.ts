import type { RunState } from '@/domain/rhythm';
import type { TerminalRunStatus, VerifiedInputEvent } from '@/server/cosmos/models';

export const FAILED_RUN_TTL_MS = 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = 'office-rhythm:failed-run:v1:';

export type FailedRunRecord = {
  schemaVersion: 1;
  userOid: string;
  runId: string;
  savedAtMs: number;
  expiresAtMs: number;
  terminalStatus: TerminalRunStatus;
  claimedSnapshot: RunState;
  inputEvents: VerifiedInputEvent[];
  failure: { httpStatus?: number; code: string };
};

type ReadStorage = Pick<Storage, 'getItem' | 'removeItem'>;
type WriteStorage = Pick<Storage, 'setItem'>;

export function readFailedRun(
  storage: ReadStorage,
  userOid: string,
  nowMs = Date.now(),
): FailedRunRecord | null {
  const key = getStorageKey(userOid);
  const raw = storage.getItem(key);
  if (raw === null) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (!isFailedRunRecord(value, userOid) || value.expiresAtMs <= nowMs) {
      storage.removeItem(key);
      return null;
    }
    return value;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function writeFailedRun(storage: WriteStorage, record: FailedRunRecord): void {
  const safeRecord: FailedRunRecord = {
    schemaVersion: 1,
    userOid: record.userOid,
    runId: record.runId,
    savedAtMs: record.savedAtMs,
    expiresAtMs: record.savedAtMs + FAILED_RUN_TTL_MS,
    terminalStatus: record.terminalStatus,
    claimedSnapshot: { ...record.claimedSnapshot },
    inputEvents: record.inputEvents.map((event) => ({ ...event })),
    failure: {
      ...(record.failure.httpStatus === undefined ? {} : { httpStatus: record.failure.httpStatus }),
      code: record.failure.code,
    },
  };
  storage.setItem(getStorageKey(record.userOid), JSON.stringify(safeRecord));
}

export function clearFailedRun(storage: ReadStorage, userOid: string, runId: string): void {
  const key = getStorageKey(userOid);
  const raw = storage.getItem(key);
  if (raw === null) return;
  try {
    const value: unknown = JSON.parse(raw);
    if (isFailedRunRecord(value, userOid) && value.runId === runId) storage.removeItem(key);
  } catch {
    // A successful server save must not clear an unrelated or unreadable record.
  }
}

function getStorageKey(userOid: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(userOid)}`;
}

function isFailedRunRecord(value: unknown, userOid: string): value is FailedRunRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<FailedRunRecord>;
  return record.schemaVersion === 1
    && record.userOid === userOid
    && typeof record.runId === 'string'
    && Number.isFinite(record.savedAtMs)
    && Number.isFinite(record.expiresAtMs)
    && record.expiresAtMs === record.savedAtMs! + FAILED_RUN_TTL_MS
    && ['completed', 'failed', 'abandoned'].includes(record.terminalStatus ?? '')
    && typeof record.claimedSnapshot === 'object'
    && record.claimedSnapshot !== null
    && Array.isArray(record.inputEvents)
    && typeof record.failure?.code === 'string';
}
