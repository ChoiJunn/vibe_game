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

function run(events: ReplayInputEvent[], terminalStatus: 'completed' | 'failed' | 'abandoned' = 'completed') {
  const initial = createInitialRunState({ runId: 'run-1', userOid: 'user-1', beatmapId: beatmap.id });
  const replay = replayInputEvents(beatmap, initial, events, terminalStatus);
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
    for (let index = 0; index < 5; index += 1) {
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

  it('replays persisted silent misses and verifies an automatic failure exactly', () => {
    const events: ReplayInputEvent[] = beatmap.events.slice(0, 5).map((note, sequence) => ({
      eventId: `auto-miss-${sequence}`,
      sequence,
      type: 'auto-miss',
      chartEventId: note.id,
      songPositionMs: (note.type === 'hold' ? note.endMs! : note.startMs) + 161,
    }));
    const { initial, replay } = run(events, 'failed');

    expect(replay.reason).toBeUndefined();
    expect(replay.state).toMatchObject({ status: 'failed', hearts: 0, missCount: 5, nextEventIndex: 5 });
    expect(validateRun(beatmap, initial, events, replay.state, 'failed')).toMatchObject({ valid: true });
  });

  it('rejects early, wrong-note, and post-terminal automatic miss records', () => {
    const first = beatmap.events[0];
    const second = beatmap.events[1];
    const initial = createInitialRunState({ runId: 'run-auto-invalid', userOid: 'user-1', beatmapId: beatmap.id });
    const validFirst: ReplayInputEvent = {
      eventId: 'auto-1', sequence: 0, type: 'auto-miss', chartEventId: first.id, songPositionMs: first.startMs + 161,
    };
    const early = replayInputEvents(beatmap, initial, [
      { ...validFirst, songPositionMs: first.startMs + 160 },
    ], 'failed');
    expect(early.reason).toBe('impossible_timing');

    const wrongNote = replayInputEvents(beatmap, initial, [
      { ...validFirst, chartEventId: second.id },
    ], 'failed');
    expect(wrongNote.reason).toBe('invalid_sequence');

    const fiveMisses: ReplayInputEvent[] = beatmap.events.slice(0, 5).map((note, sequence) => ({
      eventId: `auto-terminal-${sequence}`,
      sequence,
      type: 'auto-miss',
      chartEventId: note.id,
      songPositionMs: (note.type === 'hold' ? note.endMs! : note.startMs) + 161,
    }));
    const sixth = beatmap.events[5];
    const afterTerminal = replayInputEvents(beatmap, initial, [
      ...fiveMisses,
      { eventId: 'after-failure', sequence: 5, type: 'auto-miss', chartEventId: sixth.id, songPositionMs: sixth.startMs + 161 },
    ], 'failed');
    expect(afterTerminal.reason).toBe('invalid_sequence');
  });

  it('accepts the final tap keydown when failure closes the run before browser keyup', () => {
    const events: ReplayInputEvent[] = [];
    for (const [index, note] of beatmap.events.slice(0, 5).entries()) {
      events.push({ eventId: `tap-${events.length}`, sequence: events.length, type: 'keydown', songPositionMs: index });
      if (note.type === 'hold' || index < 4) {
        events.push({ eventId: `tap-${events.length}`, sequence: events.length, type: 'keyup', songPositionMs: index + 0.5 });
      }
    }
    const initial = createInitialRunState({ runId: 'run-terminal-keydown', userOid: 'user-1', beatmapId: beatmap.id });
    const replay = replayInputEvents(beatmap, initial, events, 'failed');

    expect(replay.reason).toBeUndefined();
    expect(replay.state.status).toBe('failed');
    expect(validateRun(beatmap, initial, events, replay.state, 'failed').valid).toBe(true);
  });

  it('ignores complete input pairs recorded after the fifth miss without changing the final score', () => {
    const events: ReplayInputEvent[] = [];
    for (let index = 0; index < 5; index += 1) {
      events.push({ eventId: `input-${events.length}`, sequence: events.length, type: 'keydown', songPositionMs: events.length });
      events.push({ eventId: `input-${events.length}`, sequence: events.length, type: 'keyup', songPositionMs: events.length });
    }
    events.push({ eventId: `input-${events.length}`, sequence: events.length, type: 'keydown', songPositionMs: events.length });
    events.push({ eventId: `input-${events.length}`, sequence: events.length, type: 'keyup', songPositionMs: events.length });
    const initial = createInitialRunState({ runId: 'run-late-input', userOid: 'user-1', beatmapId: beatmap.id });
    const replay = replayInputEvents(beatmap, initial, events, 'failed');

    expect(replay.reason).toBeUndefined();
    expect(replay.state.status).toBe('failed');
    expect(replay.state.missCount).toBe(5);
    expect(replay.state.nextEventIndex).toBe(5);
    expect(validateRun(beatmap, initial, events, replay.state, 'failed').valid).toBe(true);
  });
});
