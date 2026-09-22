import 'server-only';

import type { Beatmap, RunState } from '@/domain/rhythm';
import { combineHoldJudgements, judgeHoldEnd, judgeHoldStart, judgeTap } from '@/game/judgement/judgeInput';
import type { InputEvent } from '@/game/judgement/types';
import { reduceRunState } from '@/game/state/reduceRunState';

export type ReplayInputEvent = {
  eventId: string;
  sequence: number;
  type: InputEvent['type'];
  songPositionMs: number;
};

export type ReplayResult = {
  state: RunState;
  reason?: 'invalid_sequence' | 'impossible_timing';
};

export function replayInputEvents(
  beatmap: Beatmap,
  initialState: RunState,
  events: ReplayInputEvent[],
  terminalStatus: 'completed' | 'failed' | 'abandoned',
): ReplayResult {
  if (events.length > 2048) return { state: initialState, reason: 'invalid_sequence' };
  const eventIds = new Set<string>();
  const maxSongPosition = beatmap.sections.at(-1)?.endMs ?? 0;
  let previousPosition = -1;
  let isPressed = false;
  let pendingHoldStart: ReturnType<typeof judgeHoldStart> | undefined;
  let pendingHoldEventIndex = -1;
  let state = initialState;

  for (let index = 0; index < events.length; index += 1) {
    const input = events[index];
    if (input.sequence !== index || !input.eventId || eventIds.has(input.eventId)) {
      return { state, reason: 'invalid_sequence' };
    }
    if (!Number.isFinite(input.songPositionMs) || input.songPositionMs < previousPosition || input.songPositionMs > maxSongPosition) {
      return { state, reason: 'impossible_timing' };
    }
    eventIds.add(input.eventId);
    previousPosition = input.songPositionMs;

    if (input.type === 'keydown') {
      if (isPressed || state.status !== 'active') return { state, reason: 'invalid_sequence' };
      const beatmapEvent = beatmap.events[state.nextEventIndex];
      if (!beatmapEvent) return { state, reason: 'invalid_sequence' };
      isPressed = true;
      if (beatmapEvent.type === 'tap') {
        state = reduceRunState(state, {
          result: judgeTap(beatmapEvent, input),
          eventIndex: state.nextEventIndex,
          isFinalEvent: state.nextEventIndex === beatmap.events.length - 1,
          finalEventEndMs: beatmapEvent.startMs,
          songPositionMs: input.songPositionMs,
        });
      } else {
        pendingHoldStart = judgeHoldStart(beatmapEvent, input);
        pendingHoldEventIndex = state.nextEventIndex;
      }
      continue;
    }

    if (!isPressed) return { state, reason: 'invalid_sequence' };
    isPressed = false;
    if (!pendingHoldStart) continue;
    const beatmapEvent = beatmap.events[pendingHoldEventIndex];
    if (!beatmapEvent || beatmapEvent.type !== 'hold') return { state, reason: 'invalid_sequence' };
    const end = judgeHoldEnd(beatmapEvent, input);
    const result = combineHoldJudgements(pendingHoldStart, end).combined;
    state = reduceRunState(state, {
      result,
      eventIndex: pendingHoldEventIndex,
      isFinalEvent: pendingHoldEventIndex === beatmap.events.length - 1,
      finalEventEndMs: beatmapEvent.endMs,
      songPositionMs: input.songPositionMs,
    });
    pendingHoldStart = undefined;
    pendingHoldEventIndex = -1;
  }

  if (isPressed || pendingHoldStart) return { state, reason: 'invalid_sequence' };
  if (terminalStatus === 'completed' && state.status === 'active' && state.nextEventIndex === beatmap.events.length) {
    state = { ...state, status: 'completed' };
  }
  if (terminalStatus === 'abandoned' && state.status === 'active') {
    state = { ...state, status: 'abandoned' };
  }
  return { state };
}
