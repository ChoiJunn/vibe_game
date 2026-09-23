import type { JudgementEvent, HoldJudgementResult, InputEvent, JudgementResult } from './types';
import { JUDGEMENT_WINDOWS } from './types';

export type BurstJudgementResult = JudgementResult & {
  requiredPresses: number;
  completedPresses: number;
};

type BurstJudgementEvent = JudgementEvent & { type: 'burst'; requiredPresses: number; endMs: number };

export function judgeTap(event: JudgementEvent, input: InputEvent, inputOffsetMs = 0): JudgementResult {
  return judgePoint(event.id, event.startMs, 'keydown', event.type === 'tap', input, inputOffsetMs);
}

export function judgeHoldStart(event: JudgementEvent, input: InputEvent, inputOffsetMs = 0): JudgementResult {
  return judgePoint(event.id, event.startMs, 'keydown', event.type === 'hold', input, inputOffsetMs);
}

export function judgeHoldEnd(event: JudgementEvent, input: InputEvent, inputOffsetMs = 0): JudgementResult {
  return judgePoint(event.id, event.endMs ?? event.startMs, 'keyup', event.type === 'hold', input, inputOffsetMs);
}

export function judgeBurst(
  event: BurstJudgementEvent,
  inputs: readonly InputEvent[],
  inputOffsetMs = 0,
): BurstJudgementResult {
  const minimumMs = event.startMs - JUDGEMENT_WINDOWS.goodMs;
  const maximumMs = event.endMs + JUDGEMENT_WINDOWS.goodMs;
  let pressed = false;
  let invalid = false;
  let completedPresses = 0;
  let firstKeydownMs: number | undefined;
  let lastKeyupMs: number | undefined;

  for (const input of inputs) {
    const effectiveMs = input.songPositionMs + inputOffsetMs;
    if (effectiveMs < minimumMs || effectiveMs > maximumMs) invalid = true;

    if (input.type === 'keydown') {
      if (pressed) invalid = true;
      pressed = true;
      firstKeydownMs ??= effectiveMs;
    } else {
      if (!pressed) invalid = true;
      if (pressed) {
        completedPresses += 1;
        lastKeyupMs = effectiveMs;
      }
      pressed = false;
    }
  }

  if (pressed) invalid = true;
  const firstErrorMs = firstKeydownMs === undefined ? Number.MAX_SAFE_INTEGER : firstKeydownMs - event.startMs;
  const lastErrorMs = lastKeyupMs === undefined ? Number.MAX_SAFE_INTEGER : lastKeyupMs - event.endMs;
  const errorMs = Math.abs(firstErrorMs) >= Math.abs(lastErrorMs) ? firstErrorMs : lastErrorMs;
  const edgeErrorMs = Math.max(Math.abs(firstErrorMs), Math.abs(lastErrorMs));
  const judgement = !invalid && completedPresses >= event.requiredPresses
    ? edgeErrorMs <= JUDGEMENT_WINDOWS.perfectMs
      ? 'perfect'
      : edgeErrorMs <= JUDGEMENT_WINDOWS.goodMs ? 'good' : 'miss'
    : 'miss';

  return { judgement, errorMs, eventId: event.id, requiredPresses: event.requiredPresses, completedPresses };
}

export function combineHoldJudgements(start: JudgementResult, end: JudgementResult): HoldJudgementResult {
  const combinedJudgement = worstJudgement(start.judgement, end.judgement);
  const errorMs = Math.abs(start.errorMs) >= Math.abs(end.errorMs) ? start.errorMs : end.errorMs;

  return {
    start,
    end,
    combined: {
      judgement: combinedJudgement,
      errorMs,
      eventId: start.eventId,
    },
  };
}

function judgePoint(
  eventId: string,
  targetMs: number,
  expectedInputType: InputEvent['type'],
  eventTypeMatches: boolean,
  input: InputEvent,
  inputOffsetMs: number,
): JudgementResult {
  const errorMs = input.songPositionMs + inputOffsetMs - targetMs;
  const absoluteErrorMs = Math.abs(errorMs);

  if (!eventTypeMatches || input.type !== expectedInputType) {
    return { judgement: 'miss', errorMs, eventId };
  }

  if (absoluteErrorMs <= JUDGEMENT_WINDOWS.perfectMs) {
    return { judgement: 'perfect', errorMs, eventId };
  }

  if (absoluteErrorMs <= JUDGEMENT_WINDOWS.goodMs) {
    return { judgement: 'good', errorMs, eventId };
  }

  return { judgement: 'miss', errorMs, eventId };
}

function worstJudgement(left: JudgementResult['judgement'], right: JudgementResult['judgement']): JudgementResult['judgement'] {
  const rank = { perfect: 0, good: 1, miss: 2 } as const;
  return rank[left] >= rank[right] ? left : right;
}
