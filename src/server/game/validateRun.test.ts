import { describe, expect, it } from 'vitest';
import beatmapInput from '@/content/beatmaps/office-day-01.json';
import { validateBeatmap } from '@/domain/validateBeatmap';
import { createInitialRunState } from '@/game/state/reduceRunState';
import { replayInputEvents, type ReplayInputEvent } from './verifiedReplay';
import { validateRun } from './validateRun';

const beatmap = validateBeatmap(beatmapInput);

function makeFullRun(): ReplayInputEvent[] {
  const events: ReplayInputEvent[] = [];
  for (const note of beatmap.events) {
    events.push({ eventId: `input-${events.length}`, sequence: events.length, type: 'keydown', songPositionMs: note.startMs });
    events.push({
      eventId: `input-${events.length}`,
      sequence: events.length,
      type: 'keyup',
      songPositionMs: note.type === 'hold' ? note.endMs! : note.startMs + 1,
    });
  }
  return events;
}

function run(events: ReplayInputEvent[]) {
  const initial = createInitialRunState({ runId: 'run-1', userOid: 'user-1', beatmapId: beatmap.id });
  const replay = replayInputEvents(beatmap, initial, events, 'completed');
  return { initial, replay };
}

describe('server replay validation', () => {
  it('replays tap and hold timing and reproduces the authoritative final state', () => {
    const events = makeFullRun();
    const { initial, replay } = run(events);
    expect(replay.reason).toBeUndefined();
    expect(replay.state.status).toBe('completed');
    expect(replay.state.perfectCount).toBe(beatmap.events.length);
    expect(validateRun(beatmap, initial, events, replay.state, 'completed')).toMatchObject({ valid: true });
  });

  it('rejects tampered score and counts instead of persisting them', () => {
    const events = makeFullRun();
    const { initial, replay } = run(events);
    expect(validateRun(beatmap, initial, events, { ...replay.state, score: replay.state.score + 1 }, 'completed').reason).toBe('score_mismatch');
  });

  it('rejects sequence gaps and duplicate input identifiers', () => {
    const events = makeFullRun();
    const { initial, replay } = run(events);
    const gap = events.map((event) => ({ ...event }));
    gap[2].sequence = 99;
    expect(validateRun(beatmap, initial, gap, replay.state, 'completed').reason).toBe('invalid_sequence');

    const duplicate = events.map((event) => ({ ...event }));
    duplicate[1].eventId = duplicate[0].eventId;
    expect(validateRun(beatmap, initial, duplicate, replay.state, 'completed').reason).toBe('invalid_sequence');
  });

  it('rejects impossible timestamps and an unmatched hold release', () => {
    const events = makeFullRun();
    const { initial, replay } = run(events);
    const backwards = events.map((event) => ({ ...event }));
    backwards[2].songPositionMs = 10;
    expect(validateRun(beatmap, initial, backwards, replay.state, 'completed').reason).toBe('impossible_timing');

    const missingHoldRelease = events.slice(0, 2).concat(events.slice(3)).map((event, sequence) => ({ ...event, sequence }));
    const incomplete = replayInputEvents(beatmap, initial, missingHoldRelease, 'completed');
    expect(incomplete.reason).toBe('invalid_sequence');
  });

  it('replays five misses into a failed terminal run', () => {
    const events: ReplayInputEvent[] = [];
    for (const note of beatmap.events.slice(0, 5)) {
      events.push({ eventId: `miss-${events.length}`, sequence: events.length, type: 'keydown', songPositionMs: events.length });
      events.push({ eventId: `miss-${events.length}`, sequence: events.length, type: 'keyup', songPositionMs: events.length });
    }
    const initial = createInitialRunState({ runId: 'run-failed', userOid: 'user-1', beatmapId: beatmap.id });
    const replay = replayInputEvents(beatmap, initial, events, 'failed');

    expect(replay.reason).toBeUndefined();
    expect(replay.state.status).toBe('failed');
    expect(replay.state.hearts).toBe(0);
    expect(validateRun(beatmap, initial, events, replay.state, 'failed').valid).toBe(true);
  });
});
