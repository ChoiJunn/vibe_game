import 'server-only';

import beatmapInput from '@/content/beatmaps/office-day-01.json';
import { validateBeatmap } from '@/domain/validateBeatmap';
import { createInitialRunState } from '@/game/state/reduceRunState';
import type { GameResultDocument, GameSessionDocument, TerminalRunStatus } from '@/server/cosmos/models';
import { getDailyLeaderboardKey } from '@/server/cosmos/models';
import { getGameContainers } from '@/server/cosmos/containers';
import { CosmosOperationError } from '@/server/cosmos/errors';
import { ResultRepository } from '@/server/cosmos/resultRepository';
import { SessionRepository } from '@/server/cosmos/sessionRepository';
import type { GameIdentity } from './authenticateRequest';
import { validateRun, type ValidationReason } from './validateRun';

const beatmap = validateBeatmap(beatmapInput);

export class RunValidationError extends Error {
  constructor(readonly reason: ValidationReason) {
    super('The submitted rhythm run could not be verified.');
    this.name = 'RunValidationError';
  }
}

export class ResultSubmissionError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message);
    this.name = 'ResultSubmissionError';
  }
}

export type SubmitResultInput = {
  runId: string;
  terminalStatus: TerminalRunStatus;
  claimedSnapshot?: unknown;
  confirmed?: boolean;
  expectedVersion?: string;
};

export type SubmitResultResponse = {
  result: GameResultDocument;
  session: GameSessionDocument;
  version: string;
  created: boolean;
};

export class ResultService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly results: ResultRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async submitResult(identity: GameIdentity, input: SubmitResultInput): Promise<SubmitResultResponse> {
    if (input.terminalStatus === 'abandoned' && input.confirmed !== true) {
      throw new ResultSubmissionError(400, 'Explicit confirmation is required to abandon a run.');
    }
    const session = await this.sessions.getByRunId(identity.oid, identity.tenantId, input.runId);
    if (!session) throw new ResultSubmissionError(404, 'The game run was not found.');
    const expectedVersion = input.expectedVersion?.replaceAll(String.fromCharCode(34), '');
    if (expectedVersion && expectedVersion !== session._etag) {
      throw new ResultSubmissionError(412, 'The game session changed. Fetch its latest version and try again.');
    }
    if (session.terminalStatus && session.terminalStatus !== input.terminalStatus) {
      throw new ResultSubmissionError(409, 'The game run already has a different final status.');
    }
    const claimedSnapshot = input.claimedSnapshot ?? (input.terminalStatus === 'abandoned'
      ? { ...session.snapshot, status: 'abandoned' }
      : undefined);
    if (!claimedSnapshot || typeof claimedSnapshot !== 'object') {
      throw new RunValidationError('state_mismatch');
    }

    const initialState = createInitialRunState({
      runId: session.id,
      userOid: identity.oid,
      beatmapId: session.beatmapId,
    });
    const replayEvents = session.inputEvents.map((event) => ({
      eventId: event.eventId,
      sequence: event.clientSequence,
      type: event.type,
      songPositionMs: event.songPositionMs,
      inputOffsetMs: event.inputOffsetMs,
    }));
    const validation = validateRun(
      beatmap, initialState, replayEvents, claimedSnapshot as never, input.terminalStatus,
    );
    if (!validation.valid) throw new RunValidationError(validation.reason ?? 'state_mismatch');

    const playedAt = session.createdAt || this.now();
    const commonResult = {
      id: session.id,
      type: 'gameResult' as const,
      userOid: identity.oid,
      displayName: identity.displayName,
      beatmapId: session.beatmapId,
      status: input.terminalStatus,
      score: validation.state.score,
      perfectCount: validation.state.perfectCount,
      goodCount: validation.state.goodCount,
      missCount: validation.state.missCount,
      maxCombo: validation.state.maxCombo,
      // Audio clock positions are fractional; leaderboard durations are stored in whole milliseconds.
      durationMs: Math.round(validation.state.cursorMs),
      playedAt,
      rawEventArchiveRef: session.id,
      schemaVersion: 1 as const,
    };
    const dailyResult: GameResultDocument = {
      ...commonResult,
      leaderboardKey: getDailyLeaderboardKey(new Date(playedAt)),
    };
    const allTimeResult: GameResultDocument = { ...commonResult, leaderboardKey: 'all-time' };

    const wasAlreadyTerminal = Boolean(session.terminalStatus);
    await Promise.all([
      this.results.insertResult(dailyResult),
      this.results.insertResult(allTimeResult),
    ]);
    let finalized = session;
    if (!session.terminalStatus) {
      try {
        finalized = await this.sessions.markTerminal(identity.oid, session.id, input.terminalStatus, session._etag);
      } catch (error) {
        if (!(error instanceof CosmosOperationError && error.statusCode === 409)) throw error;
        const latest = await this.sessions.getByRunId(identity.oid, identity.tenantId, session.id);
        if (latest?.terminalStatus !== input.terminalStatus) {
          throw new ResultSubmissionError(409, 'The game run was finalized with a different status.');
        }
        if (latest) finalized = latest;
      }
    }
    const { _etag, ...sessionDocument } = finalized;
    return { result: allTimeResult, session: sessionDocument, version: _etag, created: !wasAlreadyTerminal };
  }
}

let resultService: ResultService | undefined;

export function getResultService(): ResultService {
  if (!resultService) {
    const containers = getGameContainers();
    resultService = new ResultService(
      new SessionRepository(containers.sessions),
      new ResultRepository(containers.results),
    );
  }
  return resultService;
}
