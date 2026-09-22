import { describe, expect, it, vi } from 'vitest';
import beatmapInput from '@/content/beatmaps/office-day-01.json';
import { validateBeatmap } from '@/domain/validateBeatmap';
import { createInitialRunState } from '@/game/state/reduceRunState';
import type { GameSessionDocument, VerifiedInputEvent } from '@/server/cosmos/models';
import type { ResultRepository } from '@/server/cosmos/resultRepository';
import type { SessionRepository } from '@/server/cosmos/sessionRepository';
import type { GameIdentity } from './authenticateRequest';
import { ResultService, RunValidationError } from './resultService';
import { replayInputEvents, type ReplayInputEvent } from './verifiedReplay';

const beatmap = validateBeatmap(beatmapInput);
const identity: GameIdentity = { oid: 'oid-1', tenantId: 'tenant-1', displayName: 'Office Player' };

function makeEvents(): VerifiedInputEvent[] {
  const events: ReplayInputEvent[] = [];
  for (const note of beatmap.events) {
    events.push({ eventId: `evt-${events.length}`, sequence: events.length, type: 'keydown', songPositionMs: note.startMs });
    events.push({
      eventId: `evt-${events.length}`,
      sequence: events.length,
      type: 'keyup',
      songPositionMs: note.type === 'hold' ? note.endMs! : note.startMs + 1,
    });
  }
  return events.map((event) => ({
    eventId: event.eventId,
    clientSequence: event.sequence,
    type: event.type,
    songPositionMs: event.songPositionMs,
    receivedAt: '2026-09-22T00:00:00.000Z',
  }));
}

function setup(events = makeEvents()) {
  const initial = createInitialRunState({ runId: 'run-1', userOid: identity.oid, beatmapId: beatmap.id });
  const replayEvents = events.map((event) => ({
    eventId: event.eventId,
    sequence: event.clientSequence,
    type: event.type,
    songPositionMs: event.songPositionMs,
  }));
  const claim = replayInputEvents(beatmap, initial, replayEvents, 'completed').state;
  const session: GameSessionDocument & { _etag: string } = {
    id: 'run-1', type: 'gameSession', userOid: identity.oid, tenantId: identity.tenantId,
    beatmapId: beatmap.id, status: 'active', snapshot: claim, inputEvents: events,
    createdAt: '2026-09-22T00:00:00.000Z', updatedAt: '2026-09-22T00:02:00.000Z', _etag: 'etag-1',
  };
  const sessions = {
    getByRunId: vi.fn().mockResolvedValue(session),
    markTerminal: vi.fn().mockResolvedValue({ ...session, terminalStatus: 'completed' }),
  } as unknown as SessionRepository;
  const insertResult = vi.fn(async (result) => result);
  const results = { insertResult } as unknown as ResultRepository;
  return { initial, claim, events, sessions, insertResult, service: new ResultService(sessions, results) };
}

describe('ResultService', () => {
  it('replays server events and writes stable daily and all-time result partitions', async () => {
    const { service, claim, insertResult, sessions } = setup();
    const response = await service.submitResult(identity, {
      runId: 'run-1', terminalStatus: 'completed', claimedSnapshot: claim,
    });

    expect(response.result.score).toBe(claim.score);
    expect(insertResult).toHaveBeenCalledTimes(2);
    expect(insertResult).toHaveBeenCalledWith(expect.objectContaining({ leaderboardKey: 'daily:2026-09-22' }));
    expect(insertResult).toHaveBeenCalledWith(expect.objectContaining({ leaderboardKey: 'all-time' }));
    expect(sessions.markTerminal).toHaveBeenCalledWith(identity.oid, 'run-1', 'completed', 'etag-1');
  });

  it('never writes a result when the client sends a forged score', async () => {
    const { service, claim, insertResult } = setup();

    await expect(service.submitResult(identity, {
      runId: 'run-1', terminalStatus: 'completed',
      claimedSnapshot: { ...claim, score: claim.score + 5000 },
    })).rejects.toBeInstanceOf(RunValidationError);
    expect(insertResult).not.toHaveBeenCalled();
  });

  it('requires explicit user confirmation for an abandoned run', async () => {
    const { service, claim, insertResult } = setup();
    await expect(service.submitResult(identity, {
      runId: 'run-1', terminalStatus: 'abandoned', claimedSnapshot: claim,
    })).rejects.toThrow(/confirmation/);
    expect(insertResult).not.toHaveBeenCalled();
  });
});
