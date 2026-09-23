import 'server-only';

import { isBurstRhythmEvent, type Beatmap, type RunState } from '@/domain/rhythm';
import { combineHoldJudgements, judgeBurst, judgeHoldEnd, judgeHoldStart, judgeTap } from '@/game/judgement/judgeInput';
import { JUDGEMENT_WINDOWS, type InputEvent } from '@/game/judgement/types';
import { reduceRunState } from '@/game/state/reduceRunState';

export type ReplayInputEvent = {
  eventId: string;
  sequence: number;
  type: InputEvent['type'] | 'auto-miss';
  chartEventId?: string;
  songPositionMs: number;
  inputOffsetMs?: number;
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
  let pendingBurstInputs: InputEvent[] = [];
  let pendingBurstEventIndex = -1;
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

    if (input.type === 'auto-miss') {
      if (state.status !== 'active') return { state, reason: 'invalid_sequence' };
      const beatmapEvent = beatmap.events[state.nextEventIndex];
      if (!beatmapEvent || input.chartEventId !== beatmapEvent.id) {
        return { state, reason: 'invalid_sequence' };
      }
      const targetMs = beatmapEvent.type === 'tap' ? beatmapEvent.startMs : beatmapEvent.endMs!;
      if (input.songPositionMs <= targetMs + JUDGEMENT_WINDOWS.goodMs) {
        return { state, reason: 'impossible_timing' };
      }
      if (pendingHoldEventIndex === state.nextEventIndex) {
        pendingHoldStart = undefined;
        pendingHoldEventIndex = -1;
      }
      if (pendingBurstEventIndex === state.nextEventIndex) {
        pendingBurstInputs = [];
        pendingBurstEventIndex = -1;
      }
      state = reduceRunState(state, {
        result: { judgement: 'miss', errorMs: input.songPositionMs - targetMs, eventId: beatmapEvent.id },
        eventIndex: state.nextEventIndex,
        isFinalEvent: state.nextEventIndex === beatmap.events.length - 1,
        finalEventEndMs: beatmapEvent.endMs ?? beatmapEvent.startMs,
        songPositionMs: input.songPositionMs,
      });
      continue;
    }

    // The auto-miss branch above continues before physical key processing.
    const physicalInput = input as InputEvent;

    if (input.type === 'keydown') {
      if (isPressed) return { state, reason: 'invalid_sequence' };
      // Browsers may dispatch one or more inputs after the fifth miss has
      // already ended the run. Keep validating their sequence/pairing, but do
      // not apply any post-terminal input to the score.
      if (state.status !== 'active') {
        isPressed = true;
        continue;
      }
      const beatmapEvent = beatmap.events[state.nextEventIndex];
      if (!beatmapEvent) return { state, reason: 'invalid_sequence' };
      isPressed = true;
      if (beatmapEvent.type === 'tap') {
        state = reduceRunState(state, {
          result: judgeTap(beatmapEvent, physicalInput, input.inputOffsetMs ?? 0),
          eventIndex: state.nextEventIndex,
          isFinalEvent: state.nextEventIndex === beatmap.events.length - 1,
          finalEventEndMs: beatmapEvent.startMs,
          songPositionMs: input.songPositionMs,
        });
      } else if (beatmapEvent.type === 'hold') {
        pendingHoldStart = judgeHoldStart(beatmapEvent, physicalInput, input.inputOffsetMs ?? 0);
        pendingHoldEventIndex = state.nextEventIndex;
      } else {
        pendingBurstInputs.push(physicalInput);
        pendingBurstEventIndex = state.nextEventIndex;
      }
      continue;
    }

    if (!isPressed) return { state, reason: 'invalid_sequence' };
    isPressed = false;
    if (state.status !== 'active') continue;
    if (pendingBurstEventIndex === state.nextEventIndex) {
      const beatmapEvent = beatmap.events[pendingBurstEventIndex];
      if (!beatmapEvent || !isBurstRhythmEvent(beatmapEvent)) return { state, reason: 'invalid_sequence' };
      pendingBurstInputs.push(physicalInput);
      const completedPresses = pendingBurstInputs.filter((candidate) => candidate.type === 'keyup').length;
      if (completedPresses >= beatmapEvent.requiredPresses! && input.songPositionMs + (input.inputOffsetMs ?? 0) >= beatmapEvent.endMs!) {
        state = reduceRunState(state, {
          result: judgeBurst(beatmapEvent, pendingBurstInputs, input.inputOffsetMs ?? 0),
          eventIndex: pendingBurstEventIndex,
          isFinalEvent: pendingBurstEventIndex === beatmap.events.length - 1,
          finalEventEndMs: beatmapEvent.endMs,
          songPositionMs: input.songPositionMs,
        });
        pendingBurstInputs = [];
        pendingBurstEventIndex = -1;
      }
      continue;
    }
    if (!pendingHoldStart) continue;
    const beatmapEvent = beatmap.events[pendingHoldEventIndex];
    if (!beatmapEvent || beatmapEvent.type !== 'hold') return { state, reason: 'invalid_sequence' };
    const end = judgeHoldEnd(beatmapEvent, physicalInput, input.inputOffsetMs ?? 0);
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

  if (pendingBurstEventIndex === state.nextEventIndex && state.status === 'active') {
    const beatmapEvent = beatmap.events[pendingBurstEventIndex];
    const completedPresses = pendingBurstInputs.filter((candidate) => candidate.type === 'keyup').length;
    if (beatmapEvent && isBurstRhythmEvent(beatmapEvent) && completedPresses >= beatmapEvent.requiredPresses && terminalStatus === 'completed') {
      state = reduceRunState(state, {
        result: judgeBurst(beatmapEvent, pendingBurstInputs),
        eventIndex: pendingBurstEventIndex,
        isFinalEvent: pendingBurstEventIndex === beatmap.events.length - 1,
        finalEventEndMs: beatmapEvent.endMs,
        songPositionMs: beatmapEvent.endMs,
      });
      pendingBurstInputs = [];
      pendingBurstEventIndex = -1;
    }
  }

  const lastInput = events.at(-1);
  const lastJudgedEvent = beatmap.events[state.nextEventIndex - 1];
  const terminalTapPress = isPressed && !pendingHoldStart && lastInput?.type === 'keydown' &&
    lastJudgedEvent?.type === 'tap' && (terminalStatus === 'failed' || terminalStatus === 'completed') &&
    state.status === terminalStatus;
  // Taps are judged on keydown. The fifth miss (or final completed tap) can
  // close the run before the browser dispatches keyup, so accept only that
  // harmless trailing release omission. Holds still require a complete pair.
  if ((isPressed && !terminalTapPress) || pendingHoldStart || pendingBurstEventIndex !== -1) return { state, reason: 'invalid_sequence' };
  if (terminalStatus === 'completed' && state.status === 'active' && state.nextEventIndex === beatmap.events.length) {
    state = { ...state, status: 'completed' };
  }
  if (terminalStatus === 'abandoned' && state.status === 'active') {
    state = { ...state, status: 'abandoned' };
  }
  return { state };
}
