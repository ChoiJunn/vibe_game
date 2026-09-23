import { describe, expect, it } from 'vitest';
import beatmapJson from '@/content/beatmaps/office-day-01.json';
import { validateBeatmap } from '@/domain/validateBeatmap';
import { createInitialRunState } from '@/game/state/reduceRunState';
import { replayInputEvents, type ReplayInputEvent } from './verifiedReplay';

const beatmap = validateBeatmap(beatmapJson);

describe('verified replay burst events', () => {
  it('groups physical Space pairs and judges a burst once', () => {
    const burstIndex = beatmap.events.findIndex((event) => event.type === 'burst');
    const burst = beatmap.events[burstIndex];
    const state = createInitialRunState({ runId: 'run-replay-burst', userOid: 'user-1', beatmapId: beatmap.id });
    state.nextEventIndex = burstIndex;
    const events: ReplayInputEvent[] = [];
    for (let press = 0; press < burst.requiredPresses!; press += 1) {
      const position = burst.startMs + Math.round((burst.endMs! - burst.startMs) * press / Math.max(1, burst.requiredPresses! - 1));
      events.push({ eventId: `down-${press}`, sequence: events.length, type: 'keydown', songPositionMs: position });
      events.push({ eventId: `up-${press}`, sequence: events.length, type: 'keyup', songPositionMs: position + 20 });
    }
    const result = replayInputEvents(beatmap, state, events, 'completed');

    expect(result.reason).toBeUndefined();
    expect(result.state).toMatchObject({ nextEventIndex: burstIndex + 1, perfectCount: 1, missCount: 0 });
  });

  it('accepts exactly one late automatic miss for an incomplete burst', () => {
    const burstIndex = beatmap.events.findIndex((event) => event.type === 'burst');
    const burst = beatmap.events[burstIndex];
    const state = createInitialRunState({ runId: 'run-replay-burst-miss', userOid: 'user-1', beatmapId: beatmap.id });
    state.nextEventIndex = burstIndex;
    const events: ReplayInputEvent[] = [{
      eventId: 'auto-miss-1',
      sequence: 0,
      type: 'auto-miss',
      chartEventId: burst.id,
      songPositionMs: burst.endMs! + 161,
    }];

    const result = replayInputEvents(beatmap, state, events, 'failed');

    expect(result.reason).toBeUndefined();
    expect(result.state).toMatchObject({ nextEventIndex: burstIndex + 1, missCount: 1, hearts: 4 });
  });

  it('rejects a repeated or premature burst automatic miss', () => {
    const burstIndex = beatmap.events.findIndex((event) => event.type === 'burst');
    const burst = beatmap.events[burstIndex];
    const state = createInitialRunState({ runId: 'run-replay-invalid-burst', userOid: 'user-1', beatmapId: beatmap.id });
    state.nextEventIndex = burstIndex;
    const result = replayInputEvents(beatmap, state, [{
      eventId: 'auto-miss-early', sequence: 0, type: 'auto-miss', chartEventId: burst.id, songPositionMs: burst.endMs! + 160,
    }], 'failed');

    expect(result.reason).toBe('impossible_timing');
    expect(result.state.nextEventIndex).toBe(burstIndex);
  });
});
